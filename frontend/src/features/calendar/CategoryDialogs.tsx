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
import type { Calendar, CalendarColor } from '@/lib/types'
import { ColorPicker } from './ColorPicker'
import { useCalendarUsage, useDeleteCalendar, useSaveCalendar } from './queries'

/** Crear (sin `calendar`) o editar una categoría */
export function CategoryDialog({
  open,
  calendar,
  onOpenChange,
}: {
  open: boolean
  calendar?: Calendar
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {open && <CategoryForm key={calendar?.id ?? 'new'} calendar={calendar} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({ calendar, onDone }: { calendar?: Calendar; onDone: () => void }) {
  const save = useSaveCalendar()
  const [name, setName] = useState(calendar?.name ?? '')
  const [color, setColor] = useState<CalendarColor>(calendar?.color ?? 'blue')
  const [touched, setTouched] = useState(false)
  const error = touched && !name.trim() ? 'Escribe un nombre' : undefined

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!name.trim()) return
    save.mutate({ id: calendar?.id, data: { name: name.trim(), color } }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{calendar ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        <DialogDescription>El color se aplica a todos sus eventos y tareas.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Nombre</Label>
        <Input
          id="category-name"
          autoFocus
          value={name}
          maxLength={60}
          placeholder="Ej. Universidad"
          aria-invalid={!!error}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id="category-color">
          Color
        </span>
        <ColorPicker value={color} onChange={setColor} labelledBy="category-color" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {calendar ? 'Guardar' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Confirmación antes de borrar: muestra lo que se va a perder */
export function DeleteCategoryDialog({
  calendar,
  isLast,
  onOpenChange,
}: {
  calendar: Calendar | null
  isLast: boolean
  onOpenChange: (open: boolean) => void
}) {
  const usage = useCalendarUsage(calendar?.id ?? null)
  const remove = useDeleteCalendar()
  const events = usage.data?.events ?? 0
  const tasks = usage.data?.tasks ?? 0
  const generalTasks = usage.data?.generalTasks ?? 0
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  return (
    <Dialog open={!!calendar} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>¿Eliminar "{calendar?.name}"?</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2">
              {isLast ? (
                <p>Debe quedar al menos una categoría. Crea otra antes de eliminar esta.</p>
              ) : usage.isPending ? (
                <p className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Revisando qué contiene…
                </p>
              ) : events + tasks + generalTasks > 0 ? (
                <p>
                  Se eliminarán también{' '}
                  <strong className="text-foreground">
                    {[
                      events ? plural(events, 'evento', 'eventos') : '',
                      tasks ? plural(tasks, 'tarea', 'tareas') : '',
                      generalTasks
                        ? plural(generalTasks, 'tarea general o proyecto', 'tareas generales o proyectos')
                        : '',
                    ]
                      .filter(Boolean)
                      .join(', ')
                      .replace(/, ([^,]*)$/, ' y $1')}
                  </strong>
                  , con sus repeticiones y lo que hayas tachado. No se puede deshacer.
                </p>
              ) : (
                <p>Esta categoría está vacía.</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={isLast || usage.isPending || remove.isPending}
            onClick={() => calendar && remove.mutate(calendar.id, { onSuccess: () => onOpenChange(false) })}
          >
            {remove.isPending && <Loader2 className="animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
