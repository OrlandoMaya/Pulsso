import { cn } from '@/lib/utils'

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'grid size-8 place-items-center rounded-lg',
          inverted ? 'bg-zinc-50 text-zinc-900' : 'bg-primary text-primary-foreground',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      </div>
      <span className="text-[17px] font-semibold tracking-tight">Pulsso</span>
    </div>
  )
}
