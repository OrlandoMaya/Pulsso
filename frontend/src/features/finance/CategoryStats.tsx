import { AlertTriangle, CircleCheck } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import { formatMoney } from '@/lib/money'
import type { CategoryStat } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Aviso con las categorías que pasaron su presupuesto (icono + texto, no solo color) */
export function OverBudgetAlert({ stats, monthName }: { stats: CategoryStat[]; monthName: string }) {
  const over = stats.filter((s) => s.overBy > 0)
  if (!over.length) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1">
        <span className="font-semibold">
          {over.length === 1 ? 'Superaste un presupuesto' : `Superaste ${over.length} presupuestos`} en {monthName}
        </span>
        <span>
          {over.map((s, i) => (
            <span key={s.categoryId ?? 'none'}>
              {i > 0 && ' · '}
              {s.name}: <span className="font-mono tabular-nums">+{formatMoney(s.overBy)}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

/**
 * Gastado por categoría, de más a menos. Con presupuesto: barra de avance contra el presupuesto
 * (roja e indicada con texto si se pasó). Sin presupuesto: su parte del total del mes.
 */
export function CategoryStats({ stats, total }: { stats: CategoryStat[]; total: number }) {
  if (!stats.length) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
        Aún no hay gastos este mes.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-4">
      {stats.map((s) => {
        const over = s.overBy > 0
        const pct = s.budget ? (s.total / s.budget) * 100 : total ? (s.total / total) * 100 : 0
        return (
          <li key={s.categoryId ?? 'none'} className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2 text-sm">
              <span className={cn('size-2.5 shrink-0 self-center rounded-full', COLORS[s.color].dot)} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <span className="font-mono font-semibold tabular-nums">{formatMoney(s.total)}</span>
              {s.budget != null && (
                <span className="font-mono text-xs text-muted-foreground tabular-nums">de {formatMoney(s.budget)}</span>
              )}
            </div>
            <div
              className={cn('h-2 overflow-hidden rounded-full', s.budget != null ? COLORS[s.color].soft : 'bg-muted')}
              role="meter"
              aria-label={`${s.name}: ${s.budget != null ? `${Math.round(pct)}% del presupuesto` : `${Math.round(pct)}% del mes`}`}
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn('h-full rounded-full', over ? 'bg-red-600 dark:bg-red-500' : COLORS[s.color].dot)}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                over ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground',
              )}
            >
              {over ? (
                <>
                  <AlertTriangle className="size-3.5" />
                  Superó el presupuesto por <span className="font-mono tabular-nums">{formatMoney(s.overBy)}</span>
                </>
              ) : s.budget != null ? (
                <>
                  <CircleCheck className="size-3.5" />
                  Quedan <span className="font-mono tabular-nums">{formatMoney(s.budget - s.total)}</span> (
                  {Math.round(pct)}% usado)
                </>
              ) : (
                <>
                  {s.count} {s.count === 1 ? 'gasto' : 'gastos'} · {Math.round(pct)}% del mes · sin presupuesto
                </>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
