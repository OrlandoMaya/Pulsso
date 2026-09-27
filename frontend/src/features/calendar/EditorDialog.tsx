import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Trash2 } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { COLORS } from '@/lib/colors'
import { fromKey } from '@/lib/dates'
import {
  buildRRule,
  ONE_OFF_RRULE,
  parseRRule,
  WEEKDAYS,
  weekdayOf,
  type RepeatKind,
  type WeekdayCode,
} from '@/lib/recurrence'
import type { CalendarEvent, Task } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { EditorTarget } from './editor-context'
import { useCalendars, useDeleteItem, useEvent, useSaveEvent, useSaveTask, useTask } from './queries'

const schema = z
  .object({
    kind: z.enum(['event', 'task']),
    title: z.string().trim().min(1, 'Escribe un título').max(120),
    calendarId: z.string().min(1, 'Elige un calendario'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    startTime: z.string(),
    endTime: z.string(),
    repeat: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']),
    days: z.array(z.string()),
    until: z.string().optional(),
    checkable: z.boolean(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.kind === 'task' || v.endTime > v.startTime, {
    path: ['endTime'],
    message: 'La hora de fin debe ser posterior al inicio',
  })
  .refine((v) => !v.until || v.repeat === 'none' || v.until >= v.date, {
    path: ['until'],
    message: 'Debe ser igual o posterior a la fecha de inicio',
  })

type FormValues = z.infer<typeof schema>

const REPEAT_LABELS: Record<RepeatKind, string> = {
  none: 'No se repite',
  daily: 'Todos los días',
  weekdays: 'Entre semana (lun a vie)',
  weekly: 'Semanal: elegir días',
  monthly: 'Cada mes',
  yearly: 'Cada año',
}

export function EditorDialog({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-[520px]">
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
  const source = target.kind === 'event' ? event : task

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

function defaults(target: EditorTarget, event?: CalendarEvent, task?: Task): Partial<FormValues> {
  if (event) {
    const start = fromKey(event.start)
    const repeat = parseRRule(event.rrule, start)
    return {
      kind: 'event',
      title: event.title,
      calendarId: event.calendarId,
      date: event.start.slice(0, 10),
      startTime: event.start.slice(11, 16),
      endTime: event.end.slice(11, 16),
      repeat: repeat.kind,
      days: repeat.days,
      until: repeat.until,
      checkable: event.checkable,
      notes: event.notes ?? '',
    }
  }
  if (task) {
    const start = fromKey(task.startDate)
    const oneOff = /COUNT=1(;|$)/.test(task.rrule)
    const repeat = parseRRule(oneOff ? null : task.rrule, start)
    return {
      kind: 'task',
      title: task.title,
      calendarId: task.calendarId,
      date: task.startDate,
      startTime: '09:00',
      endTime: '10:00',
      repeat: repeat.kind,
      days: repeat.days,
      until: repeat.until,
      checkable: true,
      notes: '',
    }
  }
  const time = target.mode === 'create' ? (target.time ?? '09:00') : '09:00'
  const [h, m] = time.split(':').map(Number)
  const end = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${h >= 23 ? '59' : String(m).padStart(2, '0')}`
  return {
    kind: target.kind,
    title: '',
    date: target.date,
    startTime: time,
    endTime: end,
    repeat: target.kind === 'task' ? 'daily' : 'none',
    days: [weekdayOf(fromKey(target.date))],
    until: '',
    checkable: target.kind === 'task',
    notes: '',
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
  const repeat = useWatch({ control, name: 'repeat' })
  const date = useWatch({ control, name: 'date' })
  const calendarId = useWatch({ control, name: 'calendarId' })

  // Calendario por defecto: el primero visible
  useEffect(() => {
    if (!calendarId && calendars.data?.length) {
      setValue('calendarId', (calendars.data.find((c) => c.visible) ?? calendars.data[0]).id)
    }
  }, [calendarId, calendars.data, setValue])

  const isTask = kind === 'task'
  const recurring = repeat !== 'none'
  const pending = saveEvent.isPending || saveTask.isPending

  const onSubmit = handleSubmit(async (v) => {
    const start = fromKey(v.date)
    const rrule = buildRRule({ kind: v.repeat, days: v.days as WeekdayCode[], until: v.until || undefined }, start)
    const id = editing ? target.id : undefined
    if (v.kind === 'task') {
      await saveTask.mutateAsync({
        id,
        data: { title: v.title, calendarId: v.calendarId, startDate: v.date, rrule: rrule ?? ONE_OFF_RRULE },
      })
    } else {
      await saveEvent.mutateAsync({
        id,
        data: {
          title: v.title,
          calendarId: v.calendarId,
          start: `${v.date}T${v.startTime}`,
          end: `${v.date}T${v.endTime}`,
          rrule,
          checkable: v.checkable,
          notes: v.notes || undefined,
        },
      })
    }
    onClose()
  })

  const del = async (onlyThisDay: boolean) => {
    if (!editing) return
    await remove.mutateAsync({ kind: target.kind, id: target.id, date: onlyThisDay ? target.date : undefined })
    onClose()
  }

  const occurrenceLabel = editing ? format(fromKey(target.date), "EEEE d 'de' LLLL", { locale: es }) : ''
  const seriesRecurring = editing && (event ? !!event.rrule : task ? !/COUNT=1(;|$)/.test(task.rrule) : false)

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>
          {editing ? (isTask ? 'Editar tarea' : 'Editar evento') : isTask ? 'Nueva tarea' : 'Nuevo evento'}
        </DialogTitle>
        <DialogDescription>
          {seriesRecurring
            ? 'Los cambios se aplican a todas las repeticiones.'
            : isTask
              ? 'Una tarea sin hora que aparece en la franja "Diario" y se puede tachar.'
              : 'Un evento con hora en tu calendario.'}
        </DialogDescription>
      </DialogHeader>

      {!editing && (
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <Tabs
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                setValue('repeat', v === 'task' ? 'daily' : 'none')
                setValue('checkable', v === 'task')
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger value="event">Evento</TabsTrigger>
                <TabsTrigger value="task">Tarea recurrente</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
      )}

      <Field label="Título" htmlFor="title" error={formState.errors.title?.message}>
        <Input
          id="title"
          autoFocus
          placeholder={isTask ? 'Ej. Meditar 10 min' : 'Ej. Daily standup'}
          {...register('title')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Calendario" error={formState.errors.calendarId?.message}>
          <Controller
            control={control}
            name="calendarId"
            render={({ field }) => (
              <Select key={field.value ? 'ready' : 'empty'} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Calendario">
                  <SelectValue placeholder="Elige uno" />
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
          label={isTask || recurring ? 'Empieza el' : 'Fecha'}
          htmlFor="date"
          error={formState.errors.date?.message}
        >
          <Input id="date" type="date" {...register('date')} />
        </Field>
      </div>

      {!isTask && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Inicio" htmlFor="startTime">
            <Input id="startTime" type="time" step={300} {...register('startTime')} />
          </Field>
          <Field label="Fin" htmlFor="endTime" error={formState.errors.endTime?.message}>
            <Input id="endTime" type="time" step={300} {...register('endTime')} />
          </Field>
        </div>
      )}

      <Field label="Repetir">
        <Controller
          control={control}
          name="repeat"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                if (!isTask) setValue('checkable', v !== 'none')
              }}
            >
              <SelectTrigger aria-label="Repetir">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REPEAT_LABELS) as RepeatKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k === 'none' && isTask ? 'Solo este día' : REPEAT_LABELS[k]}
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

      {repeat !== 'none' && (
        <Field label="Termina (opcional)" htmlFor="until" error={formState.errors.until?.message}>
          <Input id="until" type="date" min={date} {...register('until')} />
        </Field>
      )}

      {!isTask && (
        <>
          <Controller
            control={control}
            name="checkable"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Se puede tachar</span>
                  <span className="text-xs text-muted-foreground">
                    Muestra una casilla para marcarlo como hecho cada día.
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" rows={2} placeholder="Opcional" {...register('notes')} />
          </Field>
        </>
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
