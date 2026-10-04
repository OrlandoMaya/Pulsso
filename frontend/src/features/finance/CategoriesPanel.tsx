import { useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import { formatMoney } from '@/lib/money'
import type { CategoryStat, ExpenseCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DeleteExpenseCategoryDialog, ExpenseCategoryDialog } from './ExpenseCategoryDialogs'
import { useExpenseCategories } from './queries'

/** Panel para crear, editar y borrar categorías de gastos, con lo gastado en el mes */
export function CategoriesPanel({ stats, monthName }: { stats?: CategoryStat[]; monthName: string }) {
  const categories = useExpenseCategories()
  const [editing, setEditing] = useState<ExpenseCategory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ExpenseCategory | null>(null)
  const spent = new Map(stats?.map((s) => [s.categoryId, s]))

  return (
    <section className="flex flex-col gap-4" aria-label="Categorías de gastos">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="font-semibold">Categorías de gastos</h3>
          <span className="text-sm text-muted-foreground">Nombre, color y presupuesto mensual de cada una.</span>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus />
          Nueva categoría
        </Button>
      </div>

      {categories.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : categories.data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.data.map((c) => {
            const s = spent.get(c.id)
            const total = s?.total ?? 0
            const over = (s?.overBy ?? 0) > 0
            const pct = c.budget ? Math.min(100, (total / c.budget) * 100) : 0
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className={cn('mt-1.5 size-3 shrink-0 rounded-full', COLORS[c.color].dot)} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
                      {c.description || 'Sin descripción'}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Opciones de ${c.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(c)}>
                        <Pencil />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                        <Trash2 />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-auto flex flex-col gap-1.5 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">{monthName}</span>
                    <span className="font-mono tabular-nums">
                      <span className="font-semibold">{formatMoney(total)}</span>
                      {c.budget != null && <span className="text-muted-foreground"> / {formatMoney(c.budget)}</span>}
                    </span>
                  </div>
                  {c.budget != null ? (
                    <div className={cn('h-1.5 overflow-hidden rounded-full', COLORS[c.color].soft)}>
                      <div
                        className={cn('h-full rounded-full', over ? 'bg-red-600 dark:bg-red-500' : COLORS[c.color].dot)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin presupuesto</span>
                  )}
                  {over && (
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Superado por {formatMoney(s!.overBy)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center hover:bg-accent/50"
        >
          <Tags className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">Crea tu primera categoría</span>
          <span className="max-w-sm text-xs text-muted-foreground">
            Por ejemplo Comida, Transporte u Ocio, con el presupuesto que quieres gastar al mes.
          </span>
        </button>
      )}

      <ExpenseCategoryDialog
        open={editing !== null}
        category={editing && editing !== 'new' ? editing : undefined}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <DeleteExpenseCategoryDialog category={deleting} onOpenChange={(o) => !o && setDeleting(null)} />
    </section>
  )
}
