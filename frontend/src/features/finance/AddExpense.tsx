import { useRef, useState } from 'react'
import { AlignLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseAmount } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useCreateExpense } from './queries'

/** Registrar un gasto: nombre, monto y descripción opcional. `date` fijo o elegible */
export function AddExpense({
  date,
  onDateChange,
}: {
  date: string
  /** Si se pasa, muestra un selector de día */
  onDateChange?: (d: string) => void
}) {
  const create = useCreateExpense()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [withDescription, setWithDescription] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    const a = parseAmount(amount)
    if (!t) return setError('Escribe en qué gastaste')
    if (a === null) return setError('Monto inválido (p. ej. 12.50)')
    setError('')
    create.mutate(
      { date, title: t, amount: a, description: description.trim() },
      {
        onSuccess: () => {
          setTitle('')
          setAmount('')
          setDescription('')
          setWithDescription(false)
          titleRef.current?.focus()
        },
      },
    )
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-2 rounded-xl border border-dashed bg-card/50 p-3 focus-within:border-solid focus-within:border-ring"
    >
      <div className="flex items-center gap-3">
        <Plus className="size-[18px] shrink-0 text-muted-foreground" />
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Agregar gasto…"
          maxLength={120}
          autoComplete="off"
          aria-label={`Nuevo gasto del ${date}`}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0.00"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Monto"
          className="w-24 shrink-0 bg-transparent text-right font-mono text-[15px] tabular-nums outline-none placeholder:text-muted-foreground"
        />
      </div>
      {withDescription && (
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
          maxLength={2000}
          placeholder="Descripción (opcional)"
          aria-label="Descripción"
          className="ml-[30px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
      <div className="ml-[30px] flex flex-wrap items-center gap-2">
        {!withDescription && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setWithDescription(true)}
          >
            <AlignLeft />
            Descripción
          </Button>
        )}
        {onDateChange && (
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            aria-label="Día del gasto"
            className="h-8 rounded-md border bg-transparent px-2 text-sm"
          />
        )}
        <span className={cn('text-xs text-destructive', !error && 'hidden')} role="alert">
          {error}
        </span>
        <div className="flex-1" />
        <Button type="submit" size="sm" disabled={create.isPending || !title.trim() || !amount.trim()}>
          Agregar
        </Button>
      </div>
    </form>
  )
}
