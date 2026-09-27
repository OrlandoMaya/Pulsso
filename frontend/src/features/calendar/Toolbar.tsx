import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, LogOut, Menu, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { rangeTitle, toKey, type View } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth/auth-context'
import { useTheme } from '../theme/theme-context'
import { THEME_OPTIONS } from '../theme/theme-options'
import { ThemeToggle } from '../theme/ThemeToggle'

const VIEW_LABEL: Record<View, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }

interface Props {
  /** Pendientes: sin navegación de fechas */
  section?: 'pendientes'
  view: View
  date: Date
  subtitle?: string
  onToday: () => void
  onShift: (dir: 1 | -1) => void
  onMenu: () => void
}

export function Toolbar({ section, view, date, subtitle, onToday, onShift, onMenu }: Props) {
  const unit = VIEW_LABEL[view]

  return (
    <header className="flex min-h-[68px] shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-3 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" onClick={onMenu}>
        <Menu />
      </Button>
      {section ? (
        <div className="order-last flex w-full min-w-0 flex-col px-1 sm:order-none sm:w-auto sm:px-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">Pendientes y proyectos</h1>
          <span className="hidden text-xs text-muted-foreground sm:block">Lo que no tiene un día fijo</span>
        </div>
      ) : (
        <>
          <Button variant="outline" className="px-3 sm:px-4" onClick={onToday}>
            Hoy
          </Button>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" aria-label={`${unit} anterior`} onClick={() => onShift(-1)}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon" aria-label={`${unit} siguiente`} onClick={() => onShift(1)}>
              <ChevronRight />
            </Button>
          </div>
          <div className="order-last flex w-full min-w-0 flex-col px-1 sm:order-none sm:ml-1 sm:w-auto sm:px-0">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{rangeTitle(view, date)}</h1>
            {subtitle && <span className="hidden text-xs text-muted-foreground sm:block">{subtitle}</span>}
          </div>
        </>
      )}
      <div className="flex-1" />
      <nav aria-label="Vista" className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
        {(['dia', 'semana', 'mes'] as const).map((v) => (
          <Link
            key={v}
            to={`/${v}/${toKey(section ? new Date() : date)}`}
            aria-current={!section && v === view ? 'page' : undefined}
            className={cn(
              'flex h-full items-center rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3',
              !section && v === view && 'bg-background text-foreground shadow-sm dark:bg-input/40',
            )}
          >
            {VIEW_LABEL[v]}
          </Link>
        ))}
        <Link
          to="/pendientes"
          aria-current={section ? 'page' : undefined}
          title="Pendientes y proyectos"
          className={cn(
            'flex h-full items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3',
            section && 'bg-background text-foreground shadow-sm dark:bg-input/40',
          )}
        >
          <Workflow className="size-4" />
          <span className="max-md:sr-only">Proyectos</span>
        </Link>
      </nav>
      <ThemeToggle className="hidden sm:inline-flex" />
      <div className="hidden sm:block">
        <AccountMenu />
      </div>
    </header>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cuenta">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">{initials}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span>{user?.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Tema</DropdownMenuLabel>
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon />
            {label}
            {theme === value && <span className="ml-auto size-1.5 rounded-full bg-foreground" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
