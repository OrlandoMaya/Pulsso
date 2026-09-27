import { useRef, useState } from 'react'
import { AlignLeft, Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COLORS } from '@/lib/colors'
import { ONE_OFF_RRULE } from '@/lib/recurrence'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../calendar/editor-context'
import { useCalendars, useSaveTask } from '../calendar/queries'

/**
 * Agregar una tarea normal a un día: título, descripción opcional y categoría.
 * Es el mismo formulario en la vista Día y en el modal del día.
 */
export function QuickAddTask({ date, defaultCalendarId }: { date: string; defaultCalendarId?: string }) {
  const { openEditor } = useCalendarActions()
  const calendars = useCalendars()
  const save = useSaveTask()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [withDescription, setWithDescription] = useState(false)
  const [picked, setPicked] = useState<string>()
  const titleRef = useRef<HTMLInputElement>(null)
  const calendarId =
    picked ?? defaultCalendarId ?? calendars.data?.find((c) => c.visible)?.id ?? calendars.data?.[0]?.id

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = title.trim()
    if (!t || !calendarId || save.isPending) return
    save.mutate(
      { data: { title: t, description: description.trim(), calendarId, startDate: date, rrule: ONE_OFF_RRULE } },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
          setWithDescription(false)
          titleRef.current?.focus()
        },
      },
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border border-dashed bg-card/50 p-3 focus-within:border-solid focus-within:border-ring"
    >
      <div className="flex items-center gap-3">
        <Plus className="size-[18px] shrink-0 text-muted-foreground" />
        <label htmlFor={`new-task-${date}`} className="sr-only">
          Nueva tarea
        </label>
        <input
          id={`new-task-${date}`}
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Agregar tarea…"
          maxLength={120}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      {withDescription && (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          autoFocus
          rows={2}
          maxLength={5000}
          placeholder="Descripción, pasos, notas… (Ctrl + Enter para agregar)"
          aria-label="Descripción"
          className="field-sizing-content ml-[30px] min-h-12 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
      )}
      <div className="ml-[30px] flex flex-wrap items-center gap-2">
        {!withDescription && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setWithDescription(true)}
          >
            <AlignLeft />
            Descripción
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => openEditor({ mode: 'create', kind: 'task', recurrence: 'recurring', date })}
        >
          <Repeat />
          Recurrente…
        </Button>
        <div className="flex-1" />
        <Select key={calendars.data ? 'ready' : 'loading'} value={calendarId} onValueChange={setPicked}>
          <SelectTrigger className="h-8! w-[140px]" aria-label="Categoría">
            <SelectValue />
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
        <Button type="submit" size="sm" disabled={!title.trim() || save.isPending}>
          Agregar
        </Button>
      </div>
    </form>
  )
}
