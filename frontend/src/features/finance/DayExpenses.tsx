import { Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/money'
import { AddExpense } from './AddExpense'
import { ExpenseRow } from './ExpenseRow'
import { useExpenses } from './queries'

/** Gastos de un día: total, lista editable y formulario. Igual en la vista Día y en el modal */
export function DayExpenses({ date, compact = false }: { date: string; compact?: boolean }) {
  const expenses = useExpenses(date, date)
  const list = expenses.data ?? []
  const total = list.reduce((n, e) => n + e.amount, 0)

  return (
    <section className="flex flex-col gap-2" aria-label="Gastos del día">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Wallet className="size-3.5" />
          Gastos
        </h3>
        {list.length > 0 && (
          <span className="font-mono text-sm font-semibold tabular-nums" aria-label="Total del día">
            {formatMoney(total)}
          </span>
        )}
      </div>
      <AddExpense date={date} />
      {expenses.isPending ? (
        <Skeleton className="h-14 rounded-xl" />
      ) : (
        list.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {list.map((e) => (
              <ExpenseRow key={e.id} expense={e} compact={compact} />
            ))}
          </ul>
        )
      )}
    </section>
  )
}
