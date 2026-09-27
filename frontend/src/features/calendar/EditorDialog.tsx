import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import { toPayload, typeOf, type EventFormValues, type EventType } from '@/lib/event-types'
import { parseRRule, WEEKDAYS, weekdayOf, type RepeatKind } from '@/lib/recurrence'
import type { CalendarEvent, Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { EditorTarget } from './editor-context'
import { useCalendars, useDeleteItem, useEvent, useSaveEvent, useSaveTask, useTask } from './queries'

const schema = z
  .object({
    type: z.enum(['normal', 'recurring', 'special']),
    timed: z.boolean(),
    title: z.string().trim().min(1, 'Escribe un título').max(120),
    calendarId: z.string().min(1, 'Elige una categoría'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    startTime: z.string(),
    endTime: z.string(),
    repeat: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']),
    days: z.array(z.string()),
    until: z.string().optional(),
    checkable: z.boolean(),
    yearly: z.boolean(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => !hasHours(v) || v.endTime > v.startTime, {
    path: ['endTime'],
    message: 'La hora de fin debe ser posterior al inicio',
  })
  .refine((v) => v.type !== 'recurring' || v.repeat !== 'none', {
    path: ['repeat'],
    message: 'Elige cada cuánto se repite',
  })
  .refine((v) => v.type !== 'recurring' || !v.until || v.until >= v.date, {
    path: ['until'],
    message: 'Debe ser igual o posterior a la fecha de inicio',
  })

type FormValues = z.infer<typeof schema> & EventFormValues

const hasHours = (v: { type: EventType; timed: boolean }) => v.type === 'normal' || (v.type === 'recurring' && v.timed)

const TYPES: { value: EventType; label: string; hint: string; icon: typeof Clock }[] = [
  { value: 'normal', label: 'Normal', hint: 'Con hora de inicio y fin', icon: Clock },
  { value: 'recurring', label: 'Recurrente', hint: 'Se repite: diario, lun–vie…', icon: Repeat },
  { value: 'special', label: 'Especial', hint: 'Todo el día: cumpleaños, feriado', icon: Sparkles },
]

const REPEAT_LABELS: Partial<Record<RepeatKind, string>> = {
  daily: 'Todos los días',
  weekdays: 'De lunes a viernes',
  weekly: 'Ciertos días de la semana',
  monthly: 'Cada mes (mismo día)',
  yearly: 'Cada año (misma fecha)',
}

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
  const source = editing && target.kind === 'task' ? task : event

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
  const common = { until: '', notes: '', yearly: false }
  if (event) {
    const start = fromKey(event.start)
    const { type } = typeOf(event)
    const repeat = parseRRule(event.rrule, start)
    return {
      ...common,
      type,
      timed: true,
      title: event.title,
      calendarId: event.calendarId,
      date: event.start.slice(0, 10),
      startTime: event.allDay ? '09:00' : event.start.slice(11, 16),
      endTime: event.allDay ? '10:00' : event.end.slice(11, 16),
      repeat: type === 'recurring' ? repeat.kind : 'daily',
      days: repeat.days,
      until: repeat.until ?? '',
      checkable: event.checkable,
      yearly: event.allDay && !!event.rrule,
      notes: event.notes ?? '',
    }
  }
  if (task) {
    const start = fromKey(task.startDate)
    const repeat = parseRRule(task.rrule, start)
    return {
      ...common,
      type: 'recurring',
      timed: false,
      title: task.title,
      calendarId: task.calendarId,
      date: task.startDate,
      startTime: '09:00',
      endTime: '10:00',
      // Una tarea "solo hoy" (COUNT=1) se muestra como diaria para poder cambiarla
      repeat: repeat.kind === 'none' ? 'daily' : repeat.kind,
      days: repeat.days,
      until: repeat.until ?? '',
      checkable: true,
    }
  }
  const t = target.mode === 'create' ? target : null
  const time = t?.time ?? '09:00'
  return {
    ...common,
    type: t?.type ?? 'normal',
    timed: t?.timed ?? true,
    title: '',
    calendarId: '',
    date: target.date,
    startTime: time,
    endTime: endAfter(time),
    repeat: 'daily',
    days: [weekdayOf(fromKey(target.date))],
    checkable: t?.type === 'recurring',
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
  const editingTask = editing && target.kind === 'task'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: useMemo(() => defaults(target, event, task), [target, event, task]),
  })
  const { register, control, handleSubmit, setValue, formState } = form
  const type = useWatch({ control, name: 'type' })
  const timed = useWatch({ control, name: 'timed' })
  const repeat = useWatch({ control, name: 'repeat' })
  const date = useWatch({ control, name: 'date' })
  const calendarId = useWatch({ control, name: 'calendarId' })

  // Categoría por defecto: la primera visible
  useEffect(() => {
    if (!calendarId && calendars.data?.length) {
      setValue('calendarId', (calendars.data.find((c) => c.visible) ?? calendars.data[0]).id)
    }
  }, [calendarId, calendars.data, setValue])

  const pending = saveEvent.isPending || saveTask.isPending
  const withHours = hasHours({ type, timed })

  const pickType = (next: EventType) => {
    setValue('type', next)
    // Recurrente: casilla para tachar activada por defecto
    setValue('checkable', next === 'recurring')
  }

  const onSubmit = handleSubmit(async (v) => {
    const payload = toPayload(v)
    const id = editing ? target.id : undefined
    if (payload.kind === 'task') await saveTask.mutateAsync({ id, data: payload.data })
    else await saveEvent.mutateAsync({ id, data: payload.data })
    onClose()
  })

  const del = async (onlyThisDay: boolean) => {
    if (!editing) return
    await remove.mutateAsync({ kind: target.kind, id: target.id, date: onlyThisDay ? target.date : undefined })
    onClose()
  }

  const occurrenceLabel = editing ? format(fromKey(target.date), "EEEE d 'de' LLLL", { locale: es }) : ''
  const seriesRecurring = editing && (event ? !!event.rrule : task ? !/COUNT=1(;|$)/.test(task.rrule) : false)
  const noun = type === 'special' ? 'día especial' : type === 'recurring' ? 'evento recurrente' : 'evento'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? `Editar ${noun}` : `Nuevo ${noun}`}</DialogTitle>
        <DialogDescription>
          {seriesRecurring
            ? 'Los cambios se aplican a todas las repeticiones.'
            : TYPES.find((t) => t.value === type)?.hint}
        </DialogDescription>
      </DialogHeader>

      {/* Tipo de evento */}
      <div role="radiogroup" aria-label="Tipo de evento" className="grid grid-cols-3 gap-2">
        {TYPES.map(({ value, label, icon: Icon }) => {
          const active = type === value
          const disabled = editingTask && value !== 'recurring'
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => pickType(value)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40',
                active && 'border-primary bg-accent ring-1 ring-primary',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          )
        })}
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
        <Field
          label={type === 'recurring' ? 'Empieza el' : 'Fecha'}
          htmlFor="date"
          error={formState.errors.date?.message}
        >
          <Input id="date" type="date" {...register('date')} />
        </Field>
      </div>

      {type === 'recurring' && (
        <Controller
          control={control}
          name="timed"
          render={({ field }) => (
            <label
              className={cn(
                'flex items-center justify-between gap-4 rounded-lg border px-4 py-3',
                editing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
              )}
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Con horario</span>
                <span className="text-xs text-muted-foreground">
                  {field.value
                    ? 'Aparece como bloque en su hora.'
                    : 'Sin hora: aparece en la franja "Diario" como tarea para tachar.'}
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={editing} />
            </label>
          )}
        />
      )}

      {withHours && (
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
        <>
          <Field label="Se repite" error={formState.errors.repeat?.message}>
            <Controller
              control={control}
              name="repeat"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Se repite">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REPEAT_LABELS) as RepeatKind[]).map((k) => (
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

      {withHours && (
        <Controller
          control={control}
          name="checkable"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Se puede tachar</span>
                <span className="text-xs text-muted-foreground">Muestra una casilla para marcarlo como hecho.</span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      )}

      {!(type === 'recurring' && !timed) && (
        <Field label="Notas" htmlFor="notes">
          <Textarea id="notes" rows={2} placeholder="Opcional" {...register('notes')} />
        </Field>
      )}

      <DialogFooter className="items-center gap-2 sm:justify-between">
        {editing ? (
          seriesRecurring ? (
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
