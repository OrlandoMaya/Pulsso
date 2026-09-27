import { Clock, Plus, Repeat, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { useTheme } from '../theme/theme-context'
import { THEME_OPTIONS } from '../theme/theme-options'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import { toKey, type View } from '@/lib/dates'
import type { AgendaRange } from '@/lib/types'
import type { EventType } from '@/lib/event-types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from './editor-context'
import { Logo } from './Logo'
import { MiniCalendar } from './MiniCalendar'
import { useCalendars, useToggleCalendar } from './queries'

interface Props {
  view: View
  date: Date
  agenda?: AgendaRange
  onSelectDate: (d: Date) => void
}

/** Barra lateral fija en pantallas grandes */
export function Sidebar(props: Props) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-r bg-sidebar px-4 py-5 lg:flex">
      <SidebarContent {...props} />
    </aside>
  )
}

/** En pantallas chicas la misma barra se abre como panel deslizable */
export function MobileSidebar({
  open,
  onOpenChange,
  ...props
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const close = () => onOpenChange(false)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] gap-6 overflow-y-auto bg-sidebar px-4 py-5 lg:hidden">
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <SheetDescription className="sr-only">Mini calendario, progreso y categorías</SheetDescription>
        <SidebarContent
          {...props}
          onSelectDate={(d) => {
            props.onSelectDate(d)
            close()
          }}
          onAction={close}
        />
        <MobileAccount />
      </SheetContent>
    </Sheet>
  )
}

function SidebarContent({ view, date, agenda, onSelectDate, onAction }: Props & { onAction?: () => void }) {
  const { openEditor } = useCalendarActions()
  const calendars = useCalendars()
  const toggle = useToggleCalendar()

  const totals = agenda?.days.reduce(
    (acc, d) => ({ done: acc.done + d.progress.done, total: acc.total + d.progress.total }),
    { done: 0, total: 0 },
  )
  const pct = totals?.total ? Math.round((totals.done * 100) / totals.total) : 0
  const today = toKey(new Date())

  const create = (type: EventType) => {
    onAction?.()
    openEditor({ mode: 'create', type, date: today })
  }

  return (
    <>
      <Logo className="px-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" className="w-full">
            <Plus />
            Nuevo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[248px]">
          <DropdownMenuItem onSelect={() => create('normal')}>
            <Clock />
            <span className="flex flex-col">
              Evento normal
              <span className="text-xs text-muted-foreground">Con hora de inicio y fin</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => create('recurring')}>
            <Repeat />
            <span className="flex flex-col">
              Evento recurrente
              <span className="text-xs text-muted-foreground">Se repite: diario, lun–vie…</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => create('special')}>
            <Sparkles />
            <span className="flex flex-col">
              Evento especial
              <span className="text-xs text-muted-foreground">Todo el día: cumpleaños, feriado</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MiniCalendar view={view} date={date} onSelect={onSelectDate} />

      <div className="flex flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Recurrentes {view === 'dia' ? 'del día' : view === 'semana' ? 'esta semana' : 'este mes'}
          </span>
          <span className="font-mono text-[13px] text-muted-foreground">
            {totals ? `${totals.done}/${totals.total}` : '–'}
          </span>
        </div>
        <Progress value={pct} indicatorClassName={cn(pct === 100 && 'bg-emerald-600 dark:bg-emerald-500')} />
        <p className="text-xs text-muted-foreground">Marca la casilla para tachar una tarea o evento recurrente.</p>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="px-2 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Categorías</h2>
        {calendars.isPending && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="mx-2 my-1.5 h-5" />)}
        {calendars.data?.map((c) => (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox checked={c.visible} onCheckedChange={(v) => toggle.mutate({ id: c.id, visible: v === true })} />
            <span className="flex-1">{c.name}</span>
            <span className={cn('size-2 rounded-full', COLORS[c.color].dot)} />
          </label>
        ))}
      </div>
    </>
  )
}

/** Cuenta, tema y cerrar sesión: en móvil viven en el menú lateral */
function MobileAccount() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  return (
    <div className="mt-auto flex flex-col gap-3 border-t pt-4 sm:hidden">
      <div className="flex flex-col px-1">
        <span className="text-sm font-medium">{user?.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
      </div>
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground',
              theme === value && 'bg-background text-foreground shadow-sm dark:bg-input/40',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <Button variant="ghost" className="justify-start" onClick={logout}>
        <LogOut />
        Cerrar sesión
      </Button>
    </div>
  )
}
