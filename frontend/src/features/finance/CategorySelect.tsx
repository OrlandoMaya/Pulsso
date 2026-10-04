import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COLORS } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { useExpenseCategories } from './queries'

const NONE = 'none'

/** Categoría de un gasto ("Sin categoría" = null) */
export function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: string | null
  onChange: (id: string | null) => void
  className?: string
}) {
  const categories = useExpenseCategories()
  return (
    <Select
      key={categories.data ? 'ready' : 'empty'}
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger aria-label="Categoría del gasto" className={cn('h-8 w-auto gap-1.5 text-xs', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={NONE}>
          <span className="size-2 rounded-full border border-muted-foreground" />
          Sin categoría
        </SelectItem>
        {categories.data?.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className={cn('size-2 rounded-full', COLORS[c.color].dot)} />
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
