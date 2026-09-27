import { useState } from 'react'
import { addDays } from 'date-fns'
import { ArrowDown, ArrowRightLeft, ArrowUp, CalendarArrowUp, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fromKey, toKey } from '@/lib/dates'
import type { DayItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDeleteDayItem, useUpdateDayItem } from './queries'

interface Props {
  item: DayItem
  index: number
  count: number
  onMove: (dir: -1 | 1) => void
}

export function DayItemCard({ item, index, count, onMove }: Props) {
  const update = useUpdateDayItem()
  const remove = useDeleteDayItem()
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)

  // Si el servidor trae otro valor (otra pestaña, deshacer), se refleja aquí
  const [synced, setSynced] = useState({ title: item.title, description: item.description })
  if (synced.title !== item.title || synced.description !== item.description) {
    setSynced({ title: item.title, description: item.description })
    setTitle(item.title)
    setDescription(item.description)
  }

  const save = () => {
    const t = title.trim()
    if (!t) {
      setTitle(item.title)
      return
    }
    const d = description.trim()
    if (t !== item.title || d !== item.description) update.mutate({ item, patch: { title: t, description: d } })
  }

  const otherList = item.list === 'work' ? 'personal' : 'work'

  return (
    <li
      className={cn(
        'group flex gap-3 rounded-xl border bg-card p-3 pr-2 shadow-xs transition-colors sm:p-4 sm:pr-3',
        item.done && 'bg-muted/40',
      )}
    >
      <Checkbox
        checked={item.done}
        onCheckedChange={(v) => update.mutate({ item, patch: { done: v === true } })}
        aria-label={`${item.done ? 'Desmarcar' : 'Marcar'} ${item.title}`}
        className="mt-1 size-[18px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTitle(item.title)
              e.currentTarget.blur()
            }
          }}
          maxLength={200}
          aria-label="Título"
          className={cn(
            'w-full rounded-sm bg-transparent text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            item.done && 'text-muted-foreground line-through',
          )}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDescription(item.description)
              e.currentTarget.blur()
            }
          }}
          rows={1}
          maxLength={5000}
          placeholder="Agregar descripción…"
          aria-label="Descripción"
          className={cn(
            'field-sizing-content min-h-6 w-full resize-none rounded-sm bg-transparent text-sm leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/50',
            item.done && 'opacity-70',
          )}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Opciones de ${item.title}`}
            className="opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
            <ArrowUp />
            Subir
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMove(1)}>
            <ArrowDown />
            Bajar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => update.mutate({ item, patch: { date: toKey(addDays(fromKey(item.date), 1)) } })}
          >
            <CalendarArrowUp />
            Pasar a mañana
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => update.mutate({ item, patch: { list: otherList } })}>
            <ArrowRightLeft />
            Mover a {otherList === 'work' ? 'Trabajo' : 'Personal'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate(item)}>
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
