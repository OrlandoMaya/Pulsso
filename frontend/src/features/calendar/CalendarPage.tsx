import { useMemo, useState } from 'react'
import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shiftDate, toKey, visibleRange, type View } from '@/lib/dates'
import type { AgendaDay } from '@/lib/types'
import { DayDialog } from './DayDialog'
import { CalendarActionsContext, type CalendarActions, type EditorTarget } from './editor-context'
import { EditorDialog } from './EditorDialog'
import { MonthView } from './month/MonthView'
import { useCalendarNav } from './navigation'
import { useAgenda } from './queries'
import { MobileSidebar, Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { WeekView } from './week/WeekView'
import { DayView } from '../day/DayView'

export function CalendarPage({ view }: { view: View }) {
  const nav = useCalendarNav(view)
  const { start, end } = visibleRange(view, nav.date)
  const agenda = useAgenda(toKey(start), toKey(end))
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const days = useMemo(() => new Map<string, AgendaDay>(agenda.data?.days.map((d) => [d.date, d])), [agenda.data])
  const actions = useMemo<CalendarActions>(() => ({ openEditor: setEditor, openDay: nav.openDay }), [nav.openDay])

  const eventCount = agenda.data?.days.reduce((n, d) => n + d.events.length, 0)
  const subtitle = eventCount === undefined ? undefined : `${eventCount} ${eventCount === 1 ? 'evento' : 'eventos'}`

  return (
    <CalendarActionsContext.Provider value={actions}>
      <div className="flex h-svh overflow-hidden">
        <Sidebar view={view} date={nav.date} agenda={agenda.data} onSelectDate={(d) => nav.go(view, d)} />
        <main className="flex min-w-0 flex-1 flex-col">
          <Toolbar
            view={view}
            date={nav.date}
            subtitle={subtitle}
            onToday={() => nav.go(view, new Date())}
            onShift={(dir) => nav.go(view, shiftDate(view, nav.date, dir))}
            onMenu={() => setMenuOpen(true)}
          />
          {agenda.isError ? (
            <div className="grid flex-1 place-items-center p-6">
              <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <AlertCircle className="size-6 text-destructive" />
                <p className="text-sm text-muted-foreground">No se pudo cargar el calendario: {agenda.error.message}</p>
                <Button variant="outline" onClick={() => agenda.refetch()}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : view === 'dia' ? (
            <DayView date={nav.date} agenda={days.get(toKey(nav.date))} />
          ) : view === 'semana' ? (
            <WeekView start={start} end={end} days={days} focus={nav.date} />
          ) : (
            <MonthView month={nav.date} start={start} end={end} days={days} />
          )}
        </main>
      </div>

      <MobileSidebar
        open={menuOpen}
        onOpenChange={setMenuOpen}
        view={view}
        date={nav.date}
        agenda={agenda.data}
        onSelectDate={(d) => nav.go(view, d)}
      />

      {/* En pantallas chicas no hay barra lateral: botón flotante para crear */}
      <Button
        size="icon"
        aria-label="Nuevo evento"
        className="fixed right-5 bottom-5 z-40 size-12 rounded-full shadow-lg lg:hidden"
        onClick={() => setEditor({ mode: 'create', kind: 'event', type: 'normal', date: toKey(new Date()) })}
      >
        <Plus className="size-5" />
      </Button>

      <DayDialog
        date={nav.openDate}
        onClose={nav.closeDay}
        onShowWeek={(d) => nav.go('semana', new Date(`${d}T12:00`))}
        onShowDay={(d) => nav.go('dia', new Date(`${d}T12:00`))}
      />
      <EditorDialog target={editor} onClose={() => setEditor(null)} />
    </CalendarActionsContext.Provider>
  )
}
