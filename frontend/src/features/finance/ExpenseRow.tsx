import { useState } from 'react'
import { X } from 'lucide-react'
import { COLORS } from '@/lib/colors'
import { formatMoney, parseAmount, toTyping } from '@/lib/money'
import type { Expense } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CategorySelect } from './CategorySelect'
import { MoneyInput } from './MoneyInput'
import { useDeleteExpense, useExpenseCategories, useUpdateExpense } from './queries'

/** Un gasto: nombre, descripción y monto se editan ahí mismo */
export function ExpenseRow({ expense, compact = false }: { expense: Expense; compact?: boolean }) {
  const update = useUpdateExpense()
  const categories = useExpenseCategories()
  const category = categories.data?.find((c) => c.id === expense.categoryId)
  const remove = useDeleteExpense()
  const [title, setTitle] = useState(expense.title)
  const [description, setDescription] = useState(expense.description)
  const [amount, setAmount] = useState(formatMoney(expense.amount))
  const [synced, setSynced] = useState(expense)
  if (synced !== expense) {
    setSynced(expense)
    setTitle(expense.title)
    setDescription(expense.description)
    setAmount(formatMoney(expense.amount))
  }

  const save = () => {
    const t = title.trim()
    const a = parseAmount(amount)
    if (!t) setTitle(expense.title)
    if (a === null) setAmount(formatMoney(expense.amount))
    const patch = {
      ...(t && t !== expense.title && { title: t }),
      ...(description.trim() !== expense.description && { description: description.trim() }),
      ...(a !== null && a !== expense.amount && { amount: a }),
    }
    if (Object.keys(patch).length) update.mutate({ id: expense.id, patch })
    else if (a !== null) setAmount(formatMoney(a))
  }

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  return (
    <li className={cn('group flex items-start gap-3 rounded-xl border bg-card shadow-xs', compact ? 'p-2.5' : 'p-3')}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={blurOnEnter}
          maxLength={120}
          aria-label="Nombre del gasto"
          className="w-full rounded-sm bg-transparent text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          onKeyDown={blurOnEnter}
          maxLength={2000}
          placeholder="Agregar descripción…"
          aria-label="Descripción del gasto"
          className="w-full rounded-sm bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <MoneyInput
          value={amount}
          onValueChange={setAmount}
          onFocus={(e) => {
            // Al editar, sin el símbolo: solo el número con sus miles
            setAmount(toTyping(expense.amount))
            requestAnimationFrame(() => e.target.select())
          }}
          onBlur={save}
          onKeyDown={blurOnEnter}
          aria-label="Monto"
          className="w-28 rounded-sm bg-transparent text-right font-mono text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <CategorySelect
          value={expense.categoryId}
          onChange={(categoryId) => update.mutate({ id: expense.id, patch: { categoryId } })}
          className={cn(
            'h-6 border-none px-1.5 shadow-none',
            category ? [COLORS[category.color].soft, COLORS[category.color].text] : 'text-muted-foreground',
          )}
        />
      </div>
      <button
        type="button"
        onClick={() => remove.mutate(expense.id)}
        aria-label={`Eliminar ${expense.title}`}
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </li>
  )
}
