import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '../calendar/Logo'
import { ThemeToggle } from '../theme/ThemeToggle'

/** Marco común de las pantallas sin sesión: panel de marca a la izquierda y el formulario a la derecha */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh">
      <ThemeToggle className="absolute top-4 right-4" />
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="flex w-full max-w-[380px] flex-col gap-6">
          <Logo className="lg:hidden" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  )
}

function BrandPanel() {
  const items = [
    { title: 'Meditar 10 min', done: true },
    { title: 'Estudiar', done: true },
    { title: 'Planear la semana', done: false },
  ]
  return (
    <div className="hidden w-[min(640px,45vw)] shrink-0 flex-col justify-between bg-zinc-900 p-14 text-zinc-50 lg:flex dark:border-r dark:bg-zinc-900/60">
      <Logo inverted />
      <div className="flex flex-col gap-7">
        <div className="flex w-[380px] max-w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-[18px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Hoy</span>
            <span className="font-mono text-xs opacity-60">2/3</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-2/3 rounded-full bg-zinc-50" />
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {items.map((it) => (
              <li key={it.title} className={cn('flex items-center gap-2.5', it.done && 'line-through opacity-50')}>
                <span
                  className={cn(
                    'grid size-4 place-items-center rounded-[4px]',
                    it.done ? 'bg-zinc-50 text-zinc-900' : 'border border-white/40',
                  )}
                >
                  {it.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                {it.title}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">
            Tu semana, tus rutinas.
            <br />
            Todo en un solo lugar.
          </h2>
          <p className="max-w-[440px] text-base leading-relaxed opacity-60">
            Organiza eventos, tacha tus hábitos diarios y mira tu progreso día a día. Tu calendario es privado: solo tú
            lo ves.
          </p>
        </div>
      </div>
      <span className="text-[13px] opacity-50">© {new Date().getFullYear()} Pulsso</span>
    </div>
  )
}
