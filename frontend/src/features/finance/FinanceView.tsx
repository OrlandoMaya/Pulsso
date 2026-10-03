import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { capitalize, fromKey, toKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Expense } from '@/lib/types'
import { useCalendarActions } from '../calendar/editor-context'
import { AddExpense } from './AddExpense'
import { ExpenseRow } from './ExpenseRow'
import { useExpenses, useExpenseSummary } from './queries'
import { SpendingChart } from './SpendingChart'

const MONTH_RE = /^\d{4}-\d{2}$/

/** Finanzas: lo gastado por día en un mes, totales y la lista de gastos */
export function FinanceView() {
  const [search, setSearch] = useSearchParams()
  const param = search.get('mes')
  const month = startOfMonth(param && MONTH_RE.test(param) ? fromKey(`${param}-01`) : new Date())
  const go = (m: Date) => setSearch({ mes: format(m, 'yyyy-MM') })
  return <FinanceMonth key={toKey(month)} month={month} onMonth={go} />
}

function FinanceMonth({ month, onMonth }: { month: Date; onMonth: (m: Date) => void }) {
  const { openDay } = useCalendarActions()
  const from = toKey(month)
  const to = toKey(endOfMonth(month))
  const today = toKey(new Date())
  const summary = useExpenseSummary(from, to)
  const expenses = useExpenses(from, to)
  const [newDate, setNewDate] = useState(today >= from && today <= to ? today : from)
  const [showTable, setShowTable] = useState(false)

  const monthName = format(month, 'LLLL', { locale: es })
  const s = summary.data
  const isCurrent = today >= from && today <= to

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => onMonth(addMonths(month, -1))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => onMonth(addMonths(month, 1))}>
            <ChevronRight />
          </Button>
          <h2 className="ml-1 text-lg font-semibold tracking-tight">
            {capitalize(format(month, 'LLLL yyyy', { locale: es }))}
          </h2>
          {!isCurrent && (
            <Button variant="ghost" size="sm" onClick={() => onMonth(startOfMonth(new Date()))}>
              Este mes
            </Button>
          )}
        </div>

        {/* Cifras: una principal y el resto en tarjetas */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-xl border bg-card p-5 sm:col-span-2 lg:row-span-2">
            <span className="text-sm text-muted-foreground">Gastado en {monthName}</span>
            {s ? (
              <span className="text-5xl font-semibold tracking-tight tabular-nums">{formatMoney(s.total)}</span>
            ) : (
              <Skeleton className="h-12 w-48" />
            )}
            <span className="mt-auto pt-2 text-sm text-muted-foreground">
              {s ? `${s.count} ${s.count === 1 ? 'gasto registrado' : 'gastos registrados'}` : ' '}
            </span>
          </div>
          <Stat
            label="Promedio por día"
            value={s && formatMoney(s.dailyAverage)}
            hint={s && `en ${s.days.length} días`}
          />
          <Stat
            label="Día con más gasto"
            value={s && (s.max ? formatMoney(s.max.total) : '—')}
            hint={s?.max ? capitalize(format(fromKey(s.max.date), "EEEE d 'de' LLLL", { locale: es })) : 'Sin gastos'}
          />
          <Stat
            label="Balance total"
            value={s && formatMoney(s.allTime.total)}
            hint={s && `Todo lo registrado · ${s.allTime.count} ${s.allTime.count === 1 ? 'gasto' : 'gastos'}`}
            className="sm:col-span-2"
          />
        </div>

        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:p-5" aria-label="Gasto por día">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="font-semibold">Gasto por día</h3>
              <span className="text-xs text-muted-foreground">Toca un día para ver y agregar sus gastos</span>
            </div>
            <Button variant="ghost" size="sm" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
              <Table2 />
              {showTable ? 'Ver gráfica' : 'Ver tabla'}
            </Button>
          </div>
          {!s ? (
            <Skeleton className="h-[240px]" />
          ) : showTable ? (
            <DaysTable days={s.days} />
          ) : (
            <SpendingChart days={s.days} average={s.dailyAverage} today={today} onOpenDay={openDay} />
          )}
        </section>

        <section className="flex flex-col gap-3" aria-label="Gastos del mes">
          <h3 className="font-semibold">Gastos de {monthName}</h3>
          <AddExpense date={newDate} onDateChange={setNewDate} />
          {expenses.isPending ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : expenses.data?.length ? (
            <ExpensesByDay expenses={expenses.data} />
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              No hay gastos en {monthName}.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value?: string | null
  hint?: string | null
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border bg-card p-4 ${className ?? ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      {value ? (
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      ) : (
        <Skeleton className="h-8 w-28" />
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** La misma información de la gráfica, como tabla */
function DaysTable({ days }: { days: { date: string; total: number; count: number }[] }) {
  return (
    <div className="max-h-[320px] overflow-y-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Día</th>
            <th className="px-3 py-2 text-right font-medium">Gastos</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date} className="border-t">
              <td className="px-3 py-1.5">
                {capitalize(format(fromKey(d.date), "EEE d 'de' LLL", { locale: es }).replace('.', ''))}
              </td>
              <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">{d.count}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">{formatMoney(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Lista agrupada por día, del más reciente al más antiguo, con el total de cada día */
function ExpensesByDay({ expenses }: { expenses: Expense[] }) {
  const groups = new Map<string, Expense[]>()
  for (const e of expenses) groups.set(e.date, [...(groups.get(e.date) ?? []), e])
  return (
    <div className="flex flex-col gap-4">
      {[...groups].map(([date, list]) => (
        <div key={date} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="font-medium">{capitalize(format(fromKey(date), "EEEE d 'de' LLLL", { locale: es }))}</span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {formatMoney(list.reduce((n, e) => n + e.amount, 0))}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {list.map((e) => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
