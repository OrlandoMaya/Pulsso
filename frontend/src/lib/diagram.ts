import type { NodeStatus, NodeType, ProjectEdge } from './types'

/** Lo mínimo de un elemento que necesita la lógica del flujo */
export interface FlowNode {
  id: string
  type: NodeType
  status: NodeStatus
}

type Link = Pick<ProjectEdge, 'source' | 'target'>

/**
 * Cómo va el flujo en cada elemento:
 * - Actividad: su propio estado.
 * - Inicio: siempre "hecho" (de ahí sale todo).
 * - Decisión y Fin: "hecho" cuando todo lo que llega a ellos está hecho.
 */
export function flowStatuses(nodes: FlowNode[], edges: Link[]): Map<string, NodeStatus> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const incoming = new Map<string, string[]>()
  for (const e of edges) incoming.set(e.target, [...(incoming.get(e.target) ?? []), e.source])
  const memo = new Map<string, NodeStatus>()

  const resolve = (id: string, seen: Set<string>): NodeStatus => {
    const cached = memo.get(id)
    if (cached) return cached
    const n = byId.get(id)
    if (!n) return 'pending'
    if (n.type === 'start') return 'done'
    if (n.type === 'activity') return n.status
    // En un ciclo (p. ej. "No" vuelve a una actividad anterior) no se sigue dando vueltas
    if (seen.has(id)) return 'pending'
    const preds = (incoming.get(id) ?? []).filter((p) => !seen.has(p))
    const next = new Set(seen).add(id)
    const states = preds.map((p) => resolve(p, next))
    const status: NodeStatus =
      states.length > 0 && states.some((s) => s === 'done') && states.every((s) => s === 'done') ? 'done' : 'pending'
    return status
  }

  for (const n of nodes) memo.set(n.id, resolve(n.id, new Set()))
  return memo
}

/**
 * Estado de una flecha:
 * - active: sale o llega a algo en progreso → envía pulsos.
 * - done: une dos cosas hechas.
 * - ready: lo anterior está hecho y lo siguiente espera (es lo que toca).
 * - idle: todavía no llega el flujo.
 */
export type EdgeState = 'active' | 'done' | 'ready' | 'idle'

export function edgeState(source: NodeStatus, target: NodeStatus): EdgeState {
  if (source === 'in_progress' || target === 'in_progress') return 'active'
  if (source === 'done' && target === 'done') return 'done'
  if (source === 'done') return 'ready'
  return 'idle'
}

/**
 * Al terminar una actividad, las actividades pendientes que siguen (directo o tras un Inicio)
 * pasan a "en progreso". Tras una decisión no: ahí eliges tú el camino.
 */
export function nextToStart(nodes: FlowNode[], edges: Link[], doneId: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return [
    ...new Set(
      edges
        .filter((e) => e.source === doneId)
        .map((e) => byId.get(e.target))
        .filter((n): n is FlowNode => !!n && n.type === 'activity' && n.status === 'pending')
        .map((n) => n.id),
    ),
  ]
}

/** Si se puede unir `source` → `target` */
export function canConnect(nodes: FlowNode[], edges: Link[], source: string, target: string): boolean {
  if (source === target) return false
  const s = nodes.find((n) => n.id === source)
  const t = nodes.find((n) => n.id === target)
  if (!s || !t) return false
  if (s.type === 'end' || t.type === 'start') return false
  return !edges.some((e) => e.source === source && e.target === target)
}

export const nextStatus: Record<NodeStatus, NodeStatus> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
}

export const STATUS_LABEL: Record<NodeStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Hecha',
}

/** Id corto para elementos y flechas nuevos */
export function shortId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`
}
