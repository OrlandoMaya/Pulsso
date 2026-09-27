import { useEffect, useMemo } from 'react'
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Loader2, Repeat, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { COLORS } from '@/lib/colors'
import { fromKey } from '@/lib/dates'
import { taskRepeatOf, toEventPayload, toTaskPayload, typeOf, type EventType, type TaskRepeat } from '@/lib/event-types'
import { parseRRule, WEEKDAYS, weekdayOf } from '@/lib/recurrence'
import type { CalendarEvent, Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { EditorTarget } from './editor-context'
import { useCalendars, useDeleteItem, useEvent, useSaveEvent, useSaveTask, useTask } from './queries'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function EditorDialog({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[540px]">
        {target && <EditorLoader key={JSON.stringify(target)} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

/** En modo edición espera a tener el evento o la tarea antes de pintar el formulario */
function EditorLoader({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const editing = target.mode === 'edit'
  const event = useEvent(editing && target.kind === 'event' ? target.id : undefined)
  const task = useTask(editing && target.kind === 'task' ? target.id : undefined)
  const source = target.kind === 'task' ? task : event

  if (editing && source.isPending) {
    return (
      <div className="grid h-40 place-items-center">
        <DialogTitle className="sr-only">Cargando</DialogTitle>
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (editing && source.isError) {
    return (
      <DialogHeader>
        <DialogTitle>No se pudo cargar</DialogTitle>
        <DialogDescription>{source.error.message}</DialogDescription>
      </DialogHeader>
    )
  }
  return target.kind === 'task' ? (
    <TaskForm target={target} task={task.data} onClose={onClose} />
  ) : (
    <EventForm target={target} event={event.data} onClose={onClose} />
  )
}

/* ─────────────────────────── Eventos ─────────────────────────── */

const eventSchema = z
  .object({
    type: z.enum(['normal', 'recurring', 'special']),
    title: z.string().trim().min(1, 'Escribe un título').max(120),
    calendarId: z.string().min(1, 'Elige una categoría'),
    date: z.string().regex(DATE_RE, 'Fecha inválida'),
    startTime: z.string(),
    endTime: z.string(),
    repeat: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']),
    days: z.array(z.string()),
    until: z.string().optional(),
    yearly: z.boolean(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.type === 'special' || v.endTime > v.startTime, {
    path: ['endTime'],
    message: 'La hora de fin debe ser posterior al inicio',
  })
  .refine((v) => v.type !== 'recurring' || !v.until || v.until >= v.date, {
    path: ['until'],
    message: 'Debe ser igual o posterior a la fecha de inicio',
  })

type EventValues = z.infer<typeof eventSchema>

const EVENT_TYPES: { value: EventType; label: string; hint: string; icon: typeof Clock }[] = [
  { value: 'normal', label: 'Normal', hint: 'Un día, con hora de inicio y fin', icon: Clock },
  { value: 'recurring', label: 'Recurrente', hint: 'Con hora y se repite: diario, lun–vie…', icon: Repeat },
  { value: 'special', label: 'Especial', hint: 'Todo el día: cumpleaños, feriado', icon: Sparkles },
]

function endAfter(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h >= 23 ? '23:59' : `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function eventDefaults(target: EditorTarget, event?: CalendarEvent): EventValues {
  if (event) {
    const type = typeOf(event)
    const repeat = parseRRule(event.rrule, fromKey(event.start))
    return {
      type,
      title: event.title,
      calendarId: event.calendarId,
      date: event.start.slice(0, 10),
      startTime: event.allDay ? '09:00' : event.start.slice(11, 16),
      endTime: event.allDay ? '10:00' : event.end.slice(11, 16),
      repeat: type === 'recurring' && repeat.kind !== 'none' ? repeat.kind : 'daily',
      days: repeat.days,
      until: repeat.until ?? '',
      yearly: event.allDay && !!event.rrule,
      notes: event.notes ?? '',
    }
  }
  const t = target.mode === 'create' && target.kind === 'event' ? target : null
  const time = t?.time ?? '09:00'
  return {
    type: t?.type ?? 'normal',
    title: '',
    calendarId: '',
    date: target.date,
    startTime: time,
    endTime: endAfter(time),
    repeat: 'daily',
    days: [weekdayOf(fromKey(target.date))],
    until: '',
    yearly: false,
    notes: '',
  }
}

function EventForm({ target, event, onClose }: { target: EditorTarget; event?: CalendarEvent; onClose: () => void }) {
  const save = useSaveEvent()
  const editing = target.mode === 'edit'
  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: useMemo(() => eventDefaults(target, event), [target, event]),
  })
  const { register, control, handleSubmit, setValue, formState } = form
  const type = useWatch({ control, name: 'type' })
  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({ id: editing ? target.id : undefined, data: toEventPayload(v) })
    onClose()
  })

  const noun = type === 'special' ? 'día especial' : type === 'recurring' ? 'evento recurrente' : 'evento'

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${noun}` : `Nuevo ${noun}`}</DialogTitle>
          <DialogDescription>
            {editing && event?.rrule
              ? 'Los cambios se aplican a todas las repeticiones.'
              : EVENT_TYPES.find((t) => t.value === type)?.hint}
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Tipo de evento" className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setValue('type', value)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-medium transition-colors hover:bg-accent',
                type === value && 'border-primary bg-accent ring-1 ring-primary',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <Field label="Título" htmlFor="title" error={formState.errors.title?.message}>
          <Input
            id="title"
            autoFocus
            placeholder={
              type === 'special'
                ? 'Ej. Cumpleaños de mamá'
                : type === 'recurring'
                  ? 'Ej. Daily standup'
                  : 'Ej. Reunión con cliente'
            }
            {...register('title')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <CategoryField error={formState.errors.calendarId?.message} />
          <Field
            label={type === 'recurring' ? 'Empieza el' : 'Fecha'}
            htmlFor="date"
            error={formState.errors.date?.message}
          >
            <Input id="date" type="date" {...register('date')} />
          </Field>
        </div>

        {type !== 'special' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Inicio" htmlFor="startTime">
              <Input id="startTime" type="time" step={300} {...register('startTime')} />
            </Field>
            <Field label="Fin" htmlFor="endTime" error={formState.errors.endTime?.message}>
              <Input id="endTime" type="time" step={300} {...register('endTime')} />
            </Field>
          </div>
        )}

        {type === 'recurring' && (
          <RepeatFields
            options={['daily', 'weekdays', 'weekly', 'monthly', 'yearly']}
            untilError={formState.errors.until?.message}
          />
        )}

        {type === 'special' && (
          <Controller
            control={control}
            name="yearly"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Se repite cada año</span>
                  <span className="text-xs text-muted-foreground">Ideal para cumpleaños y aniversarios.</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        )}

        <Field label="Notas" htmlFor="notes">
          <Textarea id="notes" rows={2} placeholder="Opcional" {...register('notes')} />
        </Field>

        <Footer target={target} recurring={!!event?.rrule} pending={save.isPending} onClose={onClose} />
      </form>
    </FormProvider>
  )
}

/* ─────────────────────────── Tareas ─────────────────────────── */

const taskSchema = z
  .object({
    title: z.string().trim().min(1, 'Escribe qué hay que hacer').max(120),
    calendarId: z.string().min(1, 'Elige una categoría'),
    date: z.string().regex(DATE_RE, 'Fecha inválida'),
    repeat: z.enum(['once', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']),
    days: z.array(z.string()),
    until: z.string().optional(),
  })
  .refine((v) => v.repeat === 'once' || !v.until || v.until >= v.date, {
    path: ['until'],
    message: 'Debe ser igual o posterior a la fecha de inicio',
  })

type TaskValues = z.infer<typeof taskSchema>

function taskDefaults(target: EditorTarget, task?: Task): TaskValues {
  if (task) {
    const r = taskRepeatOf(task)
    return {
      title: task.title,
      calendarId: task.calendarId,
      date: task.startDate,
      repeat: r.repeat,
      days: r.days.length ? r.days : [weekdayOf(fromKey(task.startDate))],
      until: r.until ?? '',
    }
  }
  return {
    title: '',
    calendarId: '',
    date: target.date,
    repeat: 'once',
    days: [weekdayOf(fromKey(target.date))],
    until: '',
  }
}

function TaskForm({ target, task, onClose }: { target: EditorTarget; task?: Task; onClose: () => void }) {
  const save = useSaveTask()
  const editing = target.mode === 'edit'
  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: useMemo(() => taskDefaults(target, task), [target, task]),
  })
  const { register, control, handleSubmit, formState } = form
  const repeat = useWatch({ control, name: 'repeat' })

  const onSubmit = handleSubmit(async (v) => {
    await save.mutateAsync({ id: editing ? target.id : undefined, data: toTaskPayload(v) })
    onClose()
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
          <DialogDescription>
            Algo por hacer que tachas al terminar. Aparece en la franja de tareas y en "Por hacer".
          </DialogDescription>
        </DialogHeader>

        <Field label="¿Qué hay que hacer?" htmlFor="task-title" error={formState.errors.title?.message}>
          <Input id="task-title" autoFocus placeholder="Ej. Pagar la luz, Meditar 10 min" {...register('title')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <CategoryField error={formState.errors.calendarId?.message} />
          <Field
            label={repeat === 'once' ? 'Día' : 'Empieza el'}
            htmlFor="task-date"
            error={formState.errors.date?.message}
          >
            <Input id="task-date" type="date" {...register('date')} />
          </Field>
        </div>

        <RepeatFields
          options={['once', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']}
          untilError={formState.errors.until?.message}
        />

        <Footer
          target={target}
          recurring={!!task && taskRepeatOf(task).repeat !== 'once'}
          pending={save.isPending}
          onClose={onClose}
        />
      </form>
    </FormProvider>
  )
}

/* ─────────────────────────── Piezas comunes ─────────────────────────── */

const REPEAT_LABELS: Record<TaskRepeat, string> = {
  once: 'No se repite (solo ese día)',
  daily: 'Todos los días',
  weekdays: 'De lunes a viernes',
  weekly: 'Ciertos días de la semana',
  monthly: 'Cada mes (mismo día)',
  yearly: 'Cada año (misma fecha)',
}

/* Piezas compartidas por ambos formularios (leen el formulario con useFormContext) */
type SharedValues = { calendarId: string; date: string; repeat: string; days: string[]; until?: string }

/** Selector de categoría; si no hay una elegida, usa la primera visible */
function CategoryField({ error }: { error?: string }) {
  const { control, setValue } = useFormContext<SharedValues>()
  const calendars = useCalendars()
  const calendarId = useWatch({ control, name: 'calendarId' })
  useEffect(() => {
    if (!calendarId && calendars.data?.length) {
      setValue('calendarId', (calendars.data.find((c) => c.visible) ?? calendars.data[0]).id)
    }
  }, [calendarId, calendars.data, setValue])

  return (
    <Field label="Categoría" error={error}>
      <Controller
        control={control}
        name="calendarId"
        render={({ field }) => (
          <Select key={field.value ? 'ready' : 'empty'} value={field.value} onValueChange={field.onChange}>
            <SelectTrigger aria-label="Categoría">
              <SelectValue placeholder="Elige una" />
            </SelectTrigger>
            <SelectContent>
              {calendars.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className={cn('size-2 rounded-full', COLORS[c.color].dot)} />
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  )
}

function RepeatFields({ options, untilError }: { options: TaskRepeat[]; untilError?: string }) {
  const { control, register } = useFormContext<SharedValues>()
  const repeat = useWatch({ control, name: 'repeat' })
  const date = useWatch({ control, name: 'date' })
  return (
    <>
      <Field label="Se repite">
        <Controller
          control={control}
          name="repeat"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Se repite">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((k) => (
                  <SelectItem key={k} value={k}>
                    {REPEAT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {repeat === 'weekly' && (
        <Controller
          control={control}
          name="days"
          render={({ field }) => (
            <ToggleGroup
              type="multiple"
              value={field.value}
              onValueChange={(v) => field.onChange(v.length ? v : [weekdayOf(fromKey(date))])}
              aria-label="Días de la semana"
            >
              {WEEKDAYS.map((w) => (
                <ToggleGroupItem key={w.code} value={w.code} aria-label={w.long}>
                  {w.short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        />
      )}

      {repeat !== 'once' && (
        <Field label="Termina (opcional)" htmlFor="until" error={untilError}>
          <Input id="until" type="date" min={date} {...register('until')} />
        </Field>
      )}
    </>
  )
}

function Footer({
  target,
  recurring,
  pending,
  onClose,
}: {
  target: EditorTarget
  recurring: boolean
  pending: boolean
  onClose: () => void
}) {
  const remove = useDeleteItem()
  const editing = target.mode === 'edit'

  const del = async (onlyThisDay: boolean) => {
    if (target.mode !== 'edit') return
    await remove.mutateAsync({ kind: target.kind, id: target.id, date: onlyThisDay ? target.date : undefined })
    onClose()
  }
  const occurrenceLabel = editing ? format(fromKey(target.date), "EEEE d 'de' LLLL", { locale: es }) : ''

  return (
    <DialogFooter className="items-center gap-2 sm:justify-between">
      {editing ? (
        recurring ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
                <Trash2 />
                Eliminar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => del(true)}>Solo el {occurrenceLabel}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => del(false)}>
                Todas las repeticiones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => del(false)}
          >
            <Trash2 />
            Eliminar
          </Button>
        )
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Guardar
        </Button>
      </div>
    </DialogFooter>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
