import { useLayoutEffect, useRef } from 'react'
import { formatTyping } from '@/lib/money'

type Props = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: string
  onValueChange: (v: string) => void
}

/** Campo de monto: pone el separador de miles mientras se escribe (1,234,567.89) sin mover el cursor */
export function MoneyInput({ value, onValueChange, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (caret.current !== null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  })

  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const next = formatTyping(e.target.value, e.target.selectionStart ?? e.target.value.length)
        caret.current = next.caret
        onValueChange(next.value)
      }}
    />
  )
}
