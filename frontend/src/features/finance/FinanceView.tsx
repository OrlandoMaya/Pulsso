import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, GripVertical, Plus, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { capitalize, fromKey, toKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { COLORS } from '@/lib/colors'
import type { CalendarColor, Expense } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendarActions } from '../calendar/editor-context'
import { AddExpense, AddExpenseDialog } from './AddExpense'
import { CategoriesPanel } from './CategoriesPanel'
import { CategoryStats, OverBudgetAlert } from './CategoryStats'
import { ExpenseRow } from './ExpenseRow'
import { useExpenses, useExpenseSummary, useUpdateExpense } from './queries'
import { SpendingChart } from './SpendingChart'

const MONTH_RE = /^\d{4}-\d{2}$/

/** Finanzas: lo gastado por día en un mes, totales y la lista de gastos */
export function FinanceView() {
  const [search, setSearch] = useSearchParams()
  const param = search.get('mes')
  const month = startOfMonth(param && MONTH_RE.test(param) ? fromKey(`${param}-01`) : new Date())
  const tab: Tab = search.get('vista') === 'categorias' ? 'categorias' : 'resumen'
  const go = (m: Date, t: Tab = tab) =>
    setSearch({ mes: format(m, 'yyyy-MM'), ...(t === 'categorias' && { vista: 'categorias' }) })
  return <FinanceMonth key={toKey(month)} month={month} tab={tab} onMonth={go} onTab={(t) => go(month, t)} />
}

type Tab = 'resumen' | 'categorias'

function FinanceMonth({
  month,
  tab,
  onMonth,
  onTab,
}: {
  month: Date
  tab: Tab
  onMonth: (m: Date) => void
  onTab: (t: Tab) => void
}) {
  const { openDay } = useCalendarActions()
  const from = toKey(month)
  const to = toKey(endOfMonth(month))
  const today = toKey(new Date())
  const summary = useExpenseSummary(from, to)
  const expenses = useExpenses(from, to)
  const [newDate, setNewDate] = useState(today >= from && today <= to ? today : from)
  const [showTable, setShowTable] = useState(false)
  // Diálogo de "Agregar gasto": null = cerrado, con la categoría que ya trae elegida
  const [adding, setAdding] = useState<{ categoryId: string | null } | null>(null)

  const monthName = format(month, 'LLLL', { locale: es })
  const s = summary.data
  // La categoría (o "Sin categoría") donde más se gastó
  const top = s?.byCategory.find((c) => c.total > 0)
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
          <div className="flex-1" />
          <div role="tablist" aria-label="Sección" className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
            {(
              [
                ['resumen', 'Resumen'],
                ['categorias', 'Categorías'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => onTab(t)}
                className={cn(
                  'flex h-full cursor-pointer items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  tab === t && 'bg-background text-foreground shadow-sm dark:bg-input/40',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={() => setAdding({ categoryId: null })}>
            <Plus />
            Agregar gasto
          </Button>
        </div>

        {s && <OverBudgetAlert stats={s.byCategory} monthName={monthName} />}

        <AddExpenseDialog
          open={adding !== null}
          onOpenChange={(o) => !o && setAdding(null)}
          defaultDate={newDate}
          defaultCategoryId={adding?.categoryId}
        />

        {tab === 'categorias' ? (
          <CategoriesPanel
            stats={s?.byCategory}
            monthName={capitalize(monthName)}
            onAddExpense={(categoryId) => setAdding({ categoryId })}
          />
        ) : (
          <>
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
                hint={
                  s?.max ? capitalize(format(fromKey(s.max.date), "EEEE d 'de' LLLL", { locale: es })) : 'Sin gastos'
                }
              />
              <Stat
                label="Categoría con más gasto"
                value={s && (top ? formatMoney(top.total) : '—')}
                hint={s && (top ? top.name : 'Sin gastos')}
                dot={top?.color}
              />
              <Stat
                label="Balance total"
                value={s && formatMoney(s.allTime.total)}
                hint={s && `Todo lo registrado · ${s.allTime.count} ${s.allTime.count === 1 ? 'gasto' : 'gastos'}`}
              />
            </div>

            <section
              className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
              aria-label="Gasto por categoría"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <h3 className="font-semibold">Por categoría</h3>
                  <span className="text-xs text-muted-foreground">
                    De más a menos gastado, contra su presupuesto del mes
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onTab('categorias')}>
                  Administrar
                </Button>
              </div>
              {s ? <CategoryStats stats={s.byCategory} total={s.total} /> : <Skeleton className="h-24" />}
            </section>

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
          </>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  dot,
}: {
  label: string
  value?: string | null
  hint?: string | null
  /** Color de la categoría a la que se refiere */
  dot?: CalendarColor
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      {value ? (
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      ) : (
        <Skeleton className="h-8 w-28" />
      )}
      {hint && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {dot && <span className={cn('size-2 rounded-full', COLORS[dot].dot)} aria-hidden />}
          {hint}
        </span>
      )}
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

const dayLabel = (date: string) => capitalize(format(fromKey(date), "EEEE d 'de' LLLL", { locale: es }))

/** Lista agrupada por día, del más reciente al más antiguo, con el total de cada día.
 *  Un gasto se arrastra de un día a otro */
function ExpensesByDay({ expenses }: { expenses: Expense[] }) {
  const update = useUpdateExpense()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )
  const groups = new Map<string, Expense[]>()
  for (const e of expenses) groups.set(e.date, [...(groups.get(e.date) ?? []), e])

  const title = (id: string | number) => expenses.find((e) => e.id === id)?.title ?? 'el gasto'
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const expense = expenses.find((e) => e.id === active.id)
    const date = over?.id as string | undefined
    if (!expense || !date || date === expense.date) return
    update.mutate({ id: expense.id, patch: { date } })
  }

  return (
    <DndContext
      sensors={sensors}
      // Con el teclado no hay puntero: el día que más se cruce
      collisionDetection={(args) => {
        const hits = pointerWithin(args)
        return hits.length ? hits : rectIntersection(args)
      }}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Para moverlo a otro día, presiona Espacio o Enter, usa las flechas para elegir el día y Espacio o Enter para soltarlo, o Escape para cancelar.',
        },
        announcements: {
          onDragStart: ({ active }) => `Tomaste ${title(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over ? `${title(active.id)} sobre el ${dayLabel(String(over.id))}.` : `${title(active.id)} fuera de los días.`,
          onDragEnd: ({ active, over }) =>
            over ? `Moviste ${title(active.id)} al ${dayLabel(String(over.id))}.` : `Soltaste ${title(active.id)}.`,
          onDragCancel: ({ active }) => `Cancelado. ${title(active.id)} se quedó en su día.`,
        },
      }}
    >
      <div className="flex flex-col gap-4">
        {[...groups].map(([date, list]) => (
          <DayGroup key={date} date={date} list={list} />
        ))}
      </div>
    </DndContext>
  )
}

function DayGroup({ date, list }: { date: string; list: Expense[] }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: date })
  const from = active && list.some((e) => e.id === active.id)
  return (
    <div
      ref={setNodeRef}
      className={cn(
        '-m-1.5 flex flex-col gap-1.5 rounded-2xl p-1.5 transition-colors',
        isOver && !from && 'bg-primary/5 ring-2 ring-ring/40',
      )}
    >
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="font-medium">{dayLabel(date)}</span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {formatMoney(list.reduce((n, e) => n + e.amount, 0))}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {list.map((e) => (
          <DraggableExpense key={e.id} expense={e} />
        ))}
      </ul>
    </div>
  )
}

function DraggableExpense({ expense }: { expense: Expense }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: expense.id,
  })
  return (
    <ExpenseRow
      expense={expense}
      rowRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('relative', isDragging && 'z-10 cursor-grabbing border-ring shadow-lg ring-2 ring-ring/30')}
      handle={
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastrar ${expense.title} a otro día`}
          title="Arrastra a otro día"
          className="mt-0.5 flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/50 outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <GripVertical className="size-4" />
        </button>
      }
    />
  )
}
