import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ListChecks, Loader2, Repeat, Trash2, CircleDot } from 'lucide-react'
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
import {
  repeatValuesOf,
  toEventPayload,
  toTaskPayload,
  type Kind,
  type Recurrence,
  type RepeatRule,
} from '@/lib/event-types'
import { WEEKDAYS, weekdayOf } from '@/lib/recurrence'
import type { CalendarEvent, Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { EditorTarget } from './editor-context'
import { useCalendars, useDeleteItem, useEvent, useSaveEvent, useSaveTask, useTask } from './queries'

const schema = z
  .object({
    kind: z.enum(['event', 'task']),
    recurrence: z.enum(['normal', 'recurring']),
    title: z.string().trim().min(1, 'Escribe un título').max(120),
    calendarId: z.string().min(1, 'Elige una categoría'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    allDay: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    repeat: z.enum(['daily', 'weekdays', 'weekly', 'monthly', 'yearly']),
    days: z.array(z.string()),
    until: z.string().optional(),
    notes: z.string().max(2000).optional(),
    description: z.string().max(5000).optional(),
  })
  .refine((v) => v.kind === 'task' || v.allDay || v.endTime > v.startTime, {
    path: ['endTime'],
    message: 'La hora de fin debe ser posterior al inicio',
  })
  .refine((v) => v.recurrence === 'normal' || !v.until || v.until >= v.date, {
    path: ['until'],
    message: 'Debe ser igual o posterior a la fecha de inicio',
  })

type FormValues = z.infer<typeof schema>

const KINDS: { value: Kind; label: string; hint: string; icon: typeof CalendarDays }[] = [
  { value: 'event', label: 'Evento', hint: 'Ocurre en el calendario', icon: CalendarDays },
  { value: 'task', label: 'Tarea', hint: 'Algo por hacer que se tacha', icon: ListChecks },
]

const RECURRENCES: { value: Recurrence; label: string; icon: typeof Repeat }[] = [
  { value: 'normal', label: 'Normal', icon: CircleDot },
  { value: 'recurring', label: 'Recurrente', icon: Repeat },
]

const REPEAT_LABELS: Record<RepeatRule, string> = {
  daily: 'Todos los días',
  weekdays: 'De lunes a viernes',
  weekly: 'Ciertos días de la semana',
  monthly: 'Cada mes (mismo día)',
  yearly: 'Cada año (misma fecha)',
}

const titleFor = (kind: Kind, recurrence: Recurrence) =>
  `${kind === 'event' ? 'Evento' : 'Tarea'} ${recurrence === 'recurring' ? 'recurrente' : 'normal'}`

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
  return <EditorForm target={target} event={event.data} task={task.data} onClose={onClose} />
}

function endAfter(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h >= 23 ? '23:59' : `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function defaults(target: EditorTarget, event?: CalendarEvent, task?: Task): FormValues {
  if (event) {
    const date = event.start.slice(0, 10)
    return {
      kind: 'event',
      ...repeatValuesOf(event.rrule, date),
      title: event.title,
      calendarId: event.calendarId,
      date,
      allDay: event.allDay,
      startTime: event.allDay ? '09:00' : event.start.slice(11, 16),
      endTime: event.allDay ? '10:00' : event.end.slice(11, 16),
      notes: event.notes ?? '',
      description: '',
    }
  }
  if (task) {
    return {
      kind: 'task',
      ...repeatValuesOf(task.rrule, task.startDate),
      title: task.title,
      calendarId: task.calendarId,
      date: task.startDate,
      allDay: false,
      startTime: '09:00',
      endTime: '10:00',
      notes: '',
      description: task.description ?? '',
    }
  }
  const t = target.mode === 'create' ? target : null
  const time = t?.time ?? '09:00'
  return {
    kind: t?.kind ?? 'event',
    recurrence: t?.recurrence ?? 'normal',
    repeat: 'daily',
    days: [weekdayOf(fromKey(target.date))],
    until: '',
    title: '',
    calendarId: '',
    date: target.date,
    allDay: t?.allDay ?? false,
    startTime: time,
    endTime: endAfter(time),
    notes: '',
    description: '',
  }
}

function EditorForm({
  target,
  event,
  task,
  onClose,
}: {
  target: EditorTarget
  event?: CalendarEvent
  task?: Task
  onClose: () => void
}) {
  const calendars = useCalendars()
  const saveEvent = useSaveEvent()
  const saveTask = useSaveTask()
  const remove = useDeleteItem()
  const editing = target.mode === 'edit'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: useMemo(() => defaults(target, event, task), [target, event, task]),
  })
  const { register, control, handleSubmit, setValue, formState } = form
  const kind = useWatch({ control, name: 'kind' })
  const recurrence = useWatch({ control, name: 'recurrence' })
  const allDay = useWatch({ control, name: 'allDay' })
  const repeat = useWatch({ control, name: 'repeat' })
  const date = useWatch({ control, name: 'date' })
  const calendarId = useWatch({ control, name: 'calendarId' })

  // Categoría por defecto: la primera visible
  useEffect(() => {
    if (!calendarId && calendars.data?.length) {
      setValue('calendarId', (calendars.data.find((c) => c.visible) ?? calendars.data[0]).id)
    }
  }, [calendarId, calendars.data, setValue])

  const isEvent = kind === 'event'
  const isRecurring = recurrence === 'recurring'
  const pending = saveEvent.isPending || saveTask.isPending

  const onSubmit = handleSubmit(async (v) => {
    const id = editing ? target.id : undefined
    if (v.kind === 'task') await saveTask.mutateAsync({ id, data: toTaskPayload(v) })
    else await saveEvent.mutateAsync({ id, data: toEventPayload(v) })
    onClose()
  })

  const del = async (onlyThisDay: boolean) => {
    if (target.mode !== 'edit') return
    await remove.mutateAsync({ kind: target.kind, id: target.id, date: onlyThisDay ? target.date : undefined })
    onClose()
  }

  const occurrenceLabel = editing ? format(fromKey(target.date), "EEEE d 'de' LLLL", { locale: es }) : ''
  const savedRecurring = editing && repeatValuesOf(event?.rrule ?? task?.rrule ?? null, date).recurrence === 'recurring'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>
          {editing ? 'Editar' : 'Nuevo:'} {titleFor(kind, recurrence).toLowerCase()}
        </DialogTitle>
        <DialogDescription>
          {savedRecurring
            ? 'Los cambios se aplican a todas las repeticiones.'
            : isEvent
              ? 'Ocurre en el calendario; no se tacha.'
              : 'Algo por hacer que tachas al terminar.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        {/* Evento o tarea (fijo al editar) */}
        {!editing && (
          <Segmented
            label="Qué es"
            value={kind}
            onChange={(v) => setValue('kind', v as Kind)}
            options={KINDS.map((k) => ({ value: k.value, label: k.label, hint: k.hint, icon: k.icon }))}
          />
        )}
        {/* Normal o recurrente */}
        <Segmented
          label="Se repite"
          value={recurrence}
          onChange={(v) => setValue('recurrence', v as Recurrence)}
          options={RECURRENCES.map((r) => ({
            value: r.value,
            label: r.label,
            hint: r.value === 'normal' ? 'Solo un día' : 'Se repite',
            icon: r.icon,
          }))}
        />
      </div>

      <Field label={isEvent ? 'Título' : '¿Qué hay que hacer?'} htmlFor="title" error={formState.errors.title?.message}>
        <Input
          id="title"
          autoFocus
          placeholder={
            isEvent
              ? isRecurring
                ? 'Ej. Daily standup, Cumpleaños de mamá'
                : 'Ej. Reunión con cliente, Feriado'
              : isRecurring
                ? 'Ej. Meditar 10 min'
                : 'Ej. Pagar la luz'
          }
          {...register('title')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" error={formState.errors.calendarId?.message}>
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
        <Field label={isRecurring ? 'Empieza el' : 'Día'} htmlFor="date" error={formState.errors.date?.message}>
          <Input id="date" type="date" {...register('date')} />
        </Field>
      </div>

      {isEvent && (
        <>
          <Controller
            control={control}
            name="allDay"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Todo el día</span>
                  <span className="text-xs text-muted-foreground">Sin horas: cumpleaños, feriados, aniversarios.</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Inicio" htmlFor="startTime">
                <Input id="startTime" type="time" step={300} {...register('startTime')} />
              </Field>
              <Field label="Fin" htmlFor="endTime" error={formState.errors.endTime?.message}>
                <Input id="endTime" type="time" step={300} {...register('endTime')} />
              </Field>
            </div>
          )}
        </>
      )}

      {isRecurring && (
        <>
          <Field label="Cada cuánto">
            <Controller
              control={control}
              name="repeat"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Cada cuánto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REPEAT_LABELS) as RepeatRule[]).map((k) => (
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

          <Field label="Termina (opcional)" htmlFor="until" error={formState.errors.until?.message}>
            <Input id="until" type="date" min={date} {...register('until')} />
          </Field>
        </>
      )}

      {isEvent ? (
        <Field label="Notas" htmlFor="notes">
          <Textarea id="notes" rows={2} placeholder="Opcional" {...register('notes')} />
        </Field>
      ) : (
        <Field label="Descripción" htmlFor="description">
          <Textarea id="description" rows={2} placeholder="Pasos, notas… (opcional)" {...register('description')} />
        </Field>
      )}

      <DialogFooter className="items-center gap-2 sm:justify-between">
        {editing ? (
          savedRecurring ? (
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
    </form>
  )
}

/** Selector de dos opciones grandes (radio) */
function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint: string; icon: typeof Repeat }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
      {options.map(({ value: v, label: l, hint, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent',
            value === v && 'border-primary bg-accent ring-1 ring-primary',
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{l}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </span>
        </button>
      ))}
    </div>
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
