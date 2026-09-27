import { useRef, useState } from 'react'
import { AlignLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DayList } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCreateDayItem } from './queries'

/** Formulario para agregar una tarea con descripción opcional */
export function AddDayItem({ date, list }: { date: string; list: DayList }) {
  const create = useCreateDayItem(date, list)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [withDescription, setWithDescription] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = title.trim()
    if (!t || create.isPending) return
    create.mutate(
      { title: t, description: description.trim() || undefined },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
          setWithDescription(false)
          titleRef.current?.focus()
        },
      },
    )
  }

  const placeholder = list === 'work' ? 'Nuevo objetivo de trabajo…' : 'Nueva tarea personal…'

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border border-dashed bg-card/50 p-3 focus-within:border-solid focus-within:border-ring sm:p-4"
    >
      <div className="flex items-center gap-3">
        <Plus className="size-[18px] shrink-0 text-muted-foreground" />
        <label htmlFor="new-day-item" className="sr-only">
          {placeholder}
        </label>
        <input
          id="new-day-item"
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      {withDescription && (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
          autoFocus
          rows={2}
          maxLength={5000}
          placeholder="Descripción, pasos, notas… (Ctrl + Enter para agregar)"
          aria-label="Descripción"
          className="field-sizing-content ml-[30px] min-h-12 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
        />
      )}
      <div className={cn('ml-[30px] flex items-center gap-2', !title && !withDescription && 'hidden sm:flex')}>
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
        <div className="flex-1" />
        <Button type="submit" size="sm" disabled={!title.trim() || create.isPending}>
          Agregar
        </Button>
      </div>
    </form>
  )
}
