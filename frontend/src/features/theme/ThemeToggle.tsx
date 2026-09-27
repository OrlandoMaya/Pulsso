import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTheme } from './theme-context'
import { THEME_OPTIONS } from './theme-options'

/** Botón con menú Claro / Oscuro / Sistema */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useTheme()
  const Icon = resolved === 'dark' ? Moon : Sun
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Cambiar tema">
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_OPTIONS.map(({ value, label, icon: I }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className={cn(theme === value && 'font-medium')}
          >
            <I />
            {label}
            {theme === value && <span className="ml-auto size-1.5 rounded-full bg-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
