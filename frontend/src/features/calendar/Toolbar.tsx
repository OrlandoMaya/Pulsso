import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
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
import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context'

interface Props {
  view: View
  date: Date
  subtitle?: string
  onToday: () => void
  onShift: (dir: 1 | -1) => void
}

export function Toolbar({ view, date, subtitle, onToday, onShift }: Props) {
  const { user, logout } = useAuth()
  const unit = view === 'semana' ? 'Semana' : 'Mes'
  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex min-h-[68px] shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
      <Button variant="outline" onClick={onToday}>
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
      <div className="order-last flex w-full min-w-0 flex-col sm:order-none sm:ml-1 sm:w-auto">
        <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{rangeTitle(view, date)}</h1>
        {subtitle && <span className="hidden text-xs text-muted-foreground sm:block">{subtitle}</span>}
      </div>
      <div className="flex-1" />
      <nav aria-label="Vista" className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
        {(['semana', 'mes'] as const).map((v) => (
          <Link
            key={v}
            to={`/${v}/${toKey(date)}`}
            aria-current={v === view ? 'page' : undefined}
            className={cn(
              'flex h-full items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
              v === view && 'bg-background text-foreground shadow-sm',
            )}
          >
            {v === 'semana' ? 'Semana' : 'Mes'}
          </Link>
        ))}
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cuenta">
            <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold">
              {initials}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span>{user?.name}</span>
            <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout}>
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
