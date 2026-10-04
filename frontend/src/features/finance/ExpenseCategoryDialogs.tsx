import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseAmount, toTyping } from '@/lib/money'
import type { CalendarColor, ExpenseCategory } from '@/lib/types'
import { ColorPicker } from '../calendar/ColorPicker'
import { MoneyInput } from './MoneyInput'
import { useDeleteExpenseCategory, useExpenseCategoryUsage, useSaveExpenseCategory } from './queries'

/** Crear (sin `category`) o editar una categoría de finanzas */
export function ExpenseCategoryDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean
  category?: ExpenseCategory
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        {open && <CategoryForm key={category?.id ?? 'new'} category={category} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({ category, onDone }: { category?: ExpenseCategory; onDone: () => void }) {
  const save = useSaveExpenseCategory()
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [color, setColor] = useState<CalendarColor>(category?.color ?? 'blue')
  const [budget, setBudget] = useState(category?.budget != null ? toTyping(category.budget) : '')
  const [touched, setTouched] = useState(false)

  const budgetValue = budget.trim() ? (budget.replace(/,/g, '') === '0' ? 0 : parseAmount(budget)) : null
  const nameError = touched && !name.trim() ? 'Escribe un nombre' : undefined
  const budgetError = touched && budget.trim() && budgetValue === null ? 'Monto inválido' : undefined

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!name.trim() || (budget.trim() && budgetValue === null)) return
    save.mutate(
      { id: category?.id, data: { name: name.trim(), description: description.trim(), color, budget: budgetValue } },
      { onSuccess: onDone },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría de gastos'}</DialogTitle>
        <DialogDescription>Agrupa tus gastos y ponles un presupuesto al mes.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expense-category-name">Nombre</Label>
        <Input
          id="expense-category-name"
          autoFocus
          value={name}
          maxLength={60}
          placeholder="Ej. Comida, Transporte, Ocio"
          aria-invalid={!!nameError}
          onChange={(e) => setName(e.target.value)}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expense-category-description">Descripción</Label>
        <Textarea
          id="expense-category-description"
          rows={2}
          value={description}
          maxLength={500}
          placeholder="Opcional"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expense-category-budget">Presupuesto mensual</Label>
        <div className="flex h-9 items-center gap-1 rounded-md border px-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
          <span className="text-muted-foreground">$</span>
          <MoneyInput
            id="expense-category-budget"
            value={budget}
            onValueChange={setBudget}
            placeholder="Sin presupuesto"
            aria-invalid={!!budgetError}
            className="min-w-0 flex-1 bg-transparent font-mono tabular-nums outline-none placeholder:font-sans placeholder:text-muted-foreground"
          />
        </div>
        {budgetError ? (
          <p className="text-xs text-destructive">{budgetError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Vacío = sin presupuesto. Te avisamos si lo superas en el mes.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id="expense-category-color">
          Color
        </span>
        <ColorPicker value={color} onChange={setColor} labelledBy="expense-category-color" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {category ? 'Guardar' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Confirmar borrado: los gastos de la categoría se quedan, sin categoría */
export function DeleteExpenseCategoryDialog({
  category,
  onOpenChange,
}: {
  category: ExpenseCategory | null
  onOpenChange: (open: boolean) => void
}) {
  const usage = useExpenseCategoryUsage(category?.id ?? null)
  const remove = useDeleteExpenseCategory()
  const n = usage.data?.expenses ?? 0
  return (
    <Dialog open={!!category} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>¿Eliminar "{category?.name}"?</DialogTitle>
          <DialogDescription>
            {usage.isPending
              ? 'Revisando sus gastos…'
              : n === 1
                ? 'Su gasto queda sin categoría; no se borra.'
                : n
                  ? `Sus ${n} gastos quedan sin categoría; no se borran.`
                  : 'No tiene gastos.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending || usage.isPending}
            onClick={() => category && remove.mutate(category.id, { onSuccess: () => onOpenChange(false) })}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
