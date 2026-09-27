import { useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, CalendarX2, Check, ListChecks, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { COLORS } from '@/lib/colors'
import { STATUS_LABEL } from '@/lib/diagram'
import type { NodeStatus, Project } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useCalendars, useDeleteItem } from '../../calendar/queries'
import { usePatchGeneralTask } from '../queries'
import { scheduleLabel } from './schedule-label'
import type { ElementNode, FlowEdge } from './types'

const STATUSES: NodeStatus[] = ['pending', 'in_progress', 'done']

interface NodeInspectorProps {
  node: ElementNode
  onChange: (patch: Partial<ElementNode['data']>) => void
  onStatus: (s: NodeStatus) => void
  onSchedule: (kind: 'task' | 'event') => void
  onEditScheduled: () => void
  onDelete: () => void
}

/** Panel del elemento seleccionado */
export function NodeInspector({ node, onChange, onStatus, onSchedule, onEditScheduled, onDelete }: NodeInspectorProps) {
  const unlink = useDeleteItem()
  const { data } = node
  const s = data.scheduled

  if (node.type === 'start' || node.type === 'end') {
    return (
      <Section title={node.type === 'start' ? 'Inicio' : 'Fin'}>
        <p className="text-sm text-muted-foreground">
          {node.type === 'start'
            ? 'De aquí sale el flujo. Únelo a la primera actividad.'
            : 'El proyecto termina aquí. Se pinta en verde cuando todo lo que llega está hecho.'}
        </p>
        <DeleteButton onClick={onDelete} />
      </Section>
    )
  }

  if (node.type === 'decision') {
    return (
      <Section title="Decisión">
        <Field label="Pregunta" htmlFor="node-title">
          <Input
            id="node-title"
            value={data.title}
            maxLength={120}
            placeholder="Ej. ¿Lo aprobó el cliente?"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Une una flecha por cada camino y ponle etiqueta (Sí / No) seleccionándola.
        </p>
        <DeleteButton onClick={onDelete} />
      </Section>
    )
  }

  return (
    <Section title="Actividad">
      <Field label="Título" htmlFor="node-title">
        <Input
          id="node-title"
          value={data.title}
          maxLength={120}
          placeholder="Ej. Diseñar la página de inicio"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>
      <Field label="Notas" htmlFor="node-notes">
        <Textarea
          id="node-notes"
          rows={3}
          value={data.notes}
          maxLength={2000}
          placeholder="Detalles, enlaces, pasos…"
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <Label>Estado</Label>
        <div role="radiogroup" aria-label="Estado" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              role="radio"
              aria-checked={data.status === st}
              onClick={() => onStatus(st)}
              className={cn(
                'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground',
                data.status === st && 'bg-background text-foreground shadow-sm dark:bg-input/40',
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  st === 'pending' && 'border border-flow-ready',
                  st === 'in_progress' && 'bg-flow-active',
                  st === 'done' && 'bg-flow-done',
                )}
              />
              {STATUS_LABEL[st]}
            </button>
          ))}
        </div>
        {data.status === 'done' && (
          <p className="text-xs text-muted-foreground">Las actividades siguientes se ponen en progreso solas.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>En el calendario</Label>
        {s ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              {s.kind === 'task' ? <ListChecks className="size-4" /> : <CalendarDays className="size-4" />}
              {scheduleLabel(s)}
              {s.done && <Check className="size-4 text-flow-done" aria-label="Tachada" />}
            </span>
            {s.kind === 'task' && s.oneOff && (
              <span className="text-xs text-muted-foreground">Tacharla en el calendario la marca hecha aquí.</span>
            )}
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={onEditScheduled}>
                <Pencil />
                Editar
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/dia/${s.date}`}>Ver día</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={unlink.isPending}
                onClick={() => unlink.mutate({ kind: s.kind, id: s.id })}
              >
                <CalendarX2 />
                Quitar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onSchedule('task')}>
              <ListChecks />
              Como tarea
            </Button>
            <Button variant="outline" onClick={() => onSchedule('event')}>
              <CalendarDays />
              Como evento
            </Button>
          </div>
        )}
      </div>

      <DeleteButton onClick={onDelete} />
    </Section>
  )
}

export function EdgeInspector({
  edge,
  onLabel,
  onDelete,
}: {
  edge: FlowEdge
  onLabel: (label: string) => void
  onDelete: () => void
}) {
  const label = typeof edge.label === 'string' ? edge.label : ''
  return (
    <Section title="Flecha">
      <Field label="Etiqueta (opcional)" htmlFor="edge-label">
        <Input
          id="edge-label"
          value={label}
          maxLength={40}
          placeholder="Ej. Sí, No, Si falla…"
          onChange={(e) => onLabel(e.target.value)}
        />
      </Field>
      <div className="flex gap-1.5">
        {['Sí', 'No'].map((l) => (
          <Button key={l} size="sm" variant={label === l ? 'default' : 'outline'} onClick={() => onLabel(l)}>
            {l}
          </Button>
        ))}
      </div>
      <DeleteButton onClick={onDelete} label="Eliminar flecha" />
    </Section>
  )
}

/** Sin selección: datos del proyecto y cómo se usa el lienzo */
export function ProjectSummary({ project }: { project: Project }) {
  const calendars = useCalendars()
  const patch = usePatchGeneralTask()
  const [description, setDescription] = useState(project.description)

  return (
    <Section title="Proyecto">
      <Field label="Descripción" htmlFor="project-description">
        <Textarea
          id="project-description"
          rows={3}
          value={description}
          maxLength={5000}
          placeholder="¿De qué se trata?"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description.trim() !== project.description)
              patch.mutate({ id: project.id, patch: { description: description.trim() } })
          }}
        />
      </Field>
      <Field label="Categoría">
        <Select
          key={calendars.data ? 'ready' : 'empty'}
          value={project.calendarId}
          onValueChange={(calendarId) => patch.mutate({ id: project.id, patch: { calendarId } })}
        >
          <SelectTrigger aria-label="Categoría">
            <SelectValue />
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
      </Field>

      <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="text-[11px] font-semibold tracking-wide uppercase">Cómo se lee</span>
        <Legend className="bg-flow-active" label="Pulsos: va de una actividad a otra mientras algo está en progreso" />
        <Legend className="bg-flow-done" label="Verde: hecho" />
        <Legend className="bg-flow-ready" label="Línea sólida: lo que sigue" />
        <Legend dashed label="Punteado: aún no llega" />
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
        <li>Arrastra elementos desde la paleta al lienzo.</li>
        <li>Une elementos arrastrando desde los puntos de sus bordes.</li>
        <li>Clic en el círculo de una actividad para cambiar su estado.</li>
        <li>Selecciona una actividad para programarla como tarea o evento.</li>
        <li>Supr o Retroceso borra lo seleccionado.</li>
      </ul>
    </Section>
  )
}

function Legend({ className, label, dashed }: { className?: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          'h-0.5 w-5 shrink-0 rounded-full',
          className,
          dashed && 'border-t-2 border-dashed border-flow-idle',
        )}
      />
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function DeleteButton({ onClick, label = 'Eliminar del diagrama' }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={onClick}>
      <Trash2 />
      {label}
    </Button>
  )
}
