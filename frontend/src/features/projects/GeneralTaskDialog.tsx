import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { ListTodo, Loader2, Workflow } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { COLORS } from '@/lib/colors'
import type { GeneralTask } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendars } from '../calendar/queries'
import { useCreateGeneralTask, usePatchGeneralTask } from './queries'

const schema = z.object({
  isProject: z.boolean(),
  title: z.string().trim().min(1, 'Escribe un nombre').max(120),
  calendarId: z.string().min(1, 'Elige una categoría'),
  description: z.string().max(5000),
})
type Values = z.infer<typeof schema>

export type GeneralTarget = { mode: 'create'; isProject: boolean } | { mode: 'edit'; item: GeneralTask }

/** Crear o editar una tarea general o un proyecto */
export function GeneralTaskDialog({ target, onClose }: { target: GeneralTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        {target && <GeneralForm key={JSON.stringify(target)} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function GeneralForm({ target, onClose }: { target: GeneralTarget; onClose: () => void }) {
  const navigate = useNavigate()
  const calendars = useCalendars()
  const create = useCreateGeneralTask()
  const patch = usePatchGeneralTask()
  const editing = target.mode === 'edit' ? target.item : null

  const { register, control, handleSubmit, setValue, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      isProject: editing ? editing.isProject : target.mode === 'create' && target.isProject,
      title: editing?.title ?? '',
      calendarId: editing?.calendarId ?? '',
      description: editing?.description ?? '',
    },
  })
  const isProject = useWatch({ control, name: 'isProject' })
  const calendarId = useWatch({ control, name: 'calendarId' })

  useEffect(() => {
    if (!calendarId && calendars.data?.length) {
      setValue('calendarId', (calendars.data.find((c) => c.visible) ?? calendars.data[0]).id)
    }
  }, [calendarId, calendars.data, setValue])

  const onSubmit = handleSubmit(async (v) => {
    if (editing) {
      await patch.mutateAsync({
        id: editing.id,
        patch: { title: v.title.trim(), calendarId: v.calendarId, description: v.description.trim() },
      })
      return onClose()
    }
    const created = await create.mutateAsync({
      title: v.title.trim(),
      calendarId: v.calendarId,
      description: v.description.trim(),
      isProject: v.isProject,
    })
    onClose()
    // Un proyecto nuevo abre su lienzo
    if (created.isProject) navigate(`/proyectos/${created.id}`)
  })

  const noun = isProject ? 'proyecto' : 'tarea general'
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>
          {editing ? 'Editar' : 'Nuevo:'} {noun}
        </DialogTitle>
        <DialogDescription>
          {isProject
            ? 'Se abre un lienzo para armar el diagrama de actividades y programarlas en el calendario.'
            : 'Algo por hacer sin día fijo. La tachas cuando la termines.'}
        </DialogDescription>
      </DialogHeader>

      {!editing && (
        <div role="radiogroup" aria-label="Qué es" className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: 'Tarea general', hint: 'Sin día fijo', icon: ListTodo },
            { value: true, label: 'Proyecto', hint: 'Con diagrama', icon: Workflow },
          ].map(({ value, label, hint, icon: Icon }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={isProject === value}
              onClick={() => setValue('isProject', value)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent',
                isProject === value && 'border-primary bg-accent ring-1 ring-primary',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="general-title">Nombre</Label>
        <Input
          id="general-title"
          autoFocus
          placeholder={isProject ? 'Ej. Lanzar la tienda en línea' : 'Ej. Renovar el pasaporte'}
          {...register('title')}
        />
        {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Categoría</Label>
        <Controller
          control={control}
          name="calendarId"
          render={({ field }) => (
            <Select key={field.value ? 'ready' : 'empty'} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-label="Categoría">
                <SelectValue placeholder="Elige una" />
              </SelectTrigger>
              <SelectContent>
                {calendars.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className={cn('size-2 rounded-full', COLORS[c.color].dot)} />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="general-description">Descripción</Label>
        <Textarea id="general-description" rows={3} placeholder="Opcional" {...register('description')} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending || patch.isPending}>
          {(create.isPending || patch.isPending) && <Loader2 className="animate-spin" />}
          {editing ? 'Guardar' : isProject ? 'Crear y abrir' : 'Crear'}
        </Button>
      </DialogFooter>
    </form>
  )
}
