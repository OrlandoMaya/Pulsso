import type { Edge, Node } from '@xyflow/react'
import type { NodeStatus, NodeType, ProjectEdge, ProjectNode, ScheduledLink } from '@/lib/types'

export type ElementData = {
  title: string
  notes: string
  /** Estado guardado (actividades) */
  status: NodeStatus
  /** Lo que tiene en el calendario (lo calcula el servidor) */
  scheduled: ScheduledLink | null
}

export type ElementNode = Node<ElementData, NodeType>
export type FlowEdge = Edge<Record<string, never>, 'pulse'>

export const toFlowNode = (n: ProjectNode): ElementNode => ({
  id: n.id,
  type: n.type,
  position: { x: n.x, y: n.y },
  data: { title: n.title, notes: n.notes, status: n.status, scheduled: n.scheduled ?? null },
})

export const toFlowEdge = (e: ProjectEdge): FlowEdge => ({
  id: e.id,
  source: e.source,
  target: e.target,
  sourceHandle: e.sourceHandle ?? undefined,
  targetHandle: e.targetHandle ?? undefined,
  label: e.label || undefined,
  type: 'pulse',
})

/** Lo que se guarda (sin selección, medidas ni datos del servidor) */
export function toDiagram(nodes: ElementNode[], edges: FlowEdge[]) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as NodeType,
      title: n.data.title,
      notes: n.data.notes,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      status: n.data.status,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      label: typeof e.label === 'string' ? e.label : '',
    })),
  }
}
