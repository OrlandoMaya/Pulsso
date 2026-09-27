import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type IsValidConnection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { toKey } from '@/lib/dates'
import { canConnect, flowStatuses, nextToStart, shortId } from '@/lib/diagram'
import type { NodeStatus, NodeType, Project } from '@/lib/types'
import { useMediaQuery } from '@/lib/use-media-query'
import { useTheme } from '../../theme/theme-context'
import { useCalendarActions } from '../../calendar/editor-context'
import { useCalendars, useToggleCompletion } from '../../calendar/queries'
import { useSaveDiagram } from '../queries'
import { DiagramContext, type DiagramState } from './context'
import { EdgeInspector, NodeInspector, ProjectSummary } from './Inspector'
import { NODE_MIME, Palette } from './Palette'
import { ArrowMarkers } from './PulseEdge'
import { edgeTypes, nodeTypes } from './registry'
import { toDiagram, toFlowEdge, toFlowNode, type ElementNode, type FlowEdge } from './types'

export type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const DEFAULT_TITLE: Partial<Record<NodeType, string>> = { activity: 'Nueva actividad' }
/** Medidas aproximadas para centrar lo que se suelta */
const SIZE: Record<NodeType, { w: number; h: number }> = {
  activity: { w: 220, h: 48 },
  decision: { w: 88, h: 88 },
  start: { w: 28, h: 28 },
  end: { w: 32, h: 32 },
}

interface Props {
  project: Project
  onSaveState: (s: SaveState) => void
  onProgress: (p: { done: number; inProgress: number; total: number }) => void
}

export function ProjectCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}

function Canvas({ project, onSaveState, onProgress }: Props) {
  const { resolved } = useTheme()
  const { openEditor } = useCalendarActions()
  const calendars = useCalendars()
  const toggle = useToggleCompletion()
  const save = useSaveDiagram(project.id)
  const { screenToFlowPosition, deleteElements } = useReactFlow<ElementNode, FlowEdge>()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const wrapper = useRef<HTMLDivElement>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<ElementNode>(project.nodes.map(toFlowNode))
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(project.edges.map(toFlowEdge))

  /* ─────────── Lo que viene del servidor: qué está en el calendario y si se tachó ─────────── */
  useEffect(() => {
    const server = new Map(project.nodes.map((n) => [n.id, n]))
    setNodes((ns) =>
      ns.map((n) => {
        const s = server.get(n.id)
        if (!s) return n
        const scheduled = s.scheduled ?? null
        // Una tarea de un día: "hecha" es haberla tachado (aquí o en el calendario)
        const status = scheduled?.kind === 'task' && scheduled.oneOff ? s.status : n.data.status
        if (JSON.stringify(scheduled) === JSON.stringify(n.data.scheduled) && status === n.data.status) return n
        return { ...n, data: { ...n.data, scheduled, status } }
      }),
    )
  }, [project.nodes, setNodes])

  /* ─────────── Guardado automático ─────────── */
  const doc = useMemo(() => JSON.stringify(toDiagram(nodes, edges)), [nodes, edges])
  const docRef = useRef(doc)
  const lastSaved = useRef(doc)
  const chain = useRef<Promise<boolean>>(Promise.resolve(true))
  const { mutateAsync } = save

  useEffect(() => {
    docRef.current = doc
  }, [doc])

  /** Guarda lo último (en orden). Devuelve si quedó guardado */
  const flush = useCallback(() => {
    chain.current = chain.current.then(async () => {
      const current = docRef.current
      if (current === lastSaved.current) return true
      onSaveState('saving')
      try {
        await mutateAsync(JSON.parse(current))
        lastSaved.current = current
        onSaveState(docRef.current === current ? 'saved' : 'pending')
        return true
      } catch {
        onSaveState('error')
        return false
      }
    })
    return chain.current
  }, [mutateAsync, onSaveState])

  useEffect(() => {
    if (doc === lastSaved.current) return
    onSaveState('pending')
    const t = setTimeout(flush, 700)
    return () => clearTimeout(t)
  }, [doc, flush, onSaveState])

  // Al salir con cambios sin guardar: se mandan igual, y el navegador avisa si se cierra la pestaña
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (docRef.current !== lastSaved.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      if (docRef.current !== lastSaved.current) {
        api(`/general-tasks/${project.id}/diagram`, { method: 'PUT', body: JSON.parse(docRef.current) }).catch(() => {
          toast.error('No se guardaron los últimos cambios del diagrama')
        })
      }
    }
  }, [project.id])

  /* ─────────── Flujo: estados, pulsos y avance ─────────── */
  const flowNodes = useMemo(
    () => nodes.map((n) => ({ id: n.id, type: n.type as NodeType, status: n.data.status })),
    [nodes],
  )
  const flow = useMemo(() => flowStatuses(flowNodes, edges), [flowNodes, edges])

  useEffect(() => {
    const acts = flowNodes.filter((n) => n.type === 'activity')
    onProgress({
      done: acts.filter((n) => n.status === 'done').length,
      inProgress: acts.filter((n) => n.status === 'in_progress').length,
      total: acts.length,
    })
  }, [flowNodes, onProgress])

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  const setStatus = useCallback(
    (id: string, status: NodeStatus) => {
      const node = nodesRef.current.find((n) => n.id === id)
      if (!node || node.type !== 'activity') return
      let started: string[] = []
      setNodes((ns) => {
        let next = ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n))
        if (status === 'done') {
          started = nextToStart(
            next.map((n) => ({ id: n.id, type: n.type as NodeType, status: n.data.status })),
            edgesRef.current,
            id,
          )
          next = next.map((n) => (started.includes(n.id) ? { ...n, data: { ...n.data, status: 'in_progress' } } : n))
        }
        return next
      })
      if (status === 'done') {
        const names = nodesRef.current.filter((n) => started.includes(n.id)).map((n) => n.data.title || 'Sin título')
        if (names.length) toast(`En progreso: ${names.join(', ')}`)
      }
      // Programada como tarea de un día: se tacha también en el calendario
      const s = node.data.scheduled
      if (s?.kind === 'task' && s.oneOff && s.done !== (status === 'done')) {
        toggle.mutate({ sourceType: 'task', sourceId: s.id, date: s.date, done: status === 'done' })
      }
    },
    [setNodes, toggle],
  )

  const ctx = useMemo<DiagramState>(
    () => ({ flow, setStatus, color: calendars.data?.find((c) => c.id === project.calendarId)?.color }),
    [flow, setStatus, calendars.data, project.calendarId],
  )

  /* ─────────── Edición ─────────── */
  const onConnect = useCallback(
    (c: Connection) => {
      if (!canConnect(flowNodes, edgesRef.current, c.source, c.target)) return
      setEdges((es) => addEdge({ ...c, id: shortId('e'), type: 'pulse' as const }, es))
    },
    [flowNodes, setEdges],
  )

  const isValidConnection = useCallback<IsValidConnection<FlowEdge>>(
    (c) => canConnect(flowNodes, edgesRef.current, c.source, c.target),
    [flowNodes],
  )

  const addNode = useCallback(
    (type: NodeType, at?: { x: number; y: number }) => {
      let center = at
      if (!center) {
        const r = wrapper.current?.getBoundingClientRect()
        center = screenToFlowPosition({
          x: (r?.left ?? 0) + (r?.width ?? 0) / 2,
          y: (r?.top ?? 0) + (r?.height ?? 0) / 2,
        })
      }
      const { w, h } = SIZE[type]
      const node: ElementNode = {
        id: shortId('n'),
        type,
        position: { x: center.x - w / 2, y: center.y - h / 2 },
        data: { title: DEFAULT_TITLE[type] ?? '', notes: '', status: 'pending', scheduled: null },
        selected: true,
      }
      setNodes((ns) => [...ns.map((n) => (n.selected ? { ...n, selected: false } : n)), node])
      setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)))
      // En escritorio se puede escribir el título de una vez
      if (isDesktop && (type === 'activity' || type === 'decision')) {
        setTimeout(() => {
          const input = document.getElementById('node-title') as HTMLInputElement | null
          input?.focus()
          input?.select()
        }, 50)
      }
    },
    [isDesktop, screenToFlowPosition, setEdges, setNodes],
  )

  const onDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData(NODE_MIME) as NodeType
    if (!type) return
    e.preventDefault()
    addNode(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
  }

  const selectedNode = nodes.find((n) => n.selected)
  const selectedEdge = selectedNode ? undefined : edges.find((e) => e.selected)
  const selectedCount = nodes.filter((n) => n.selected).length + edges.filter((e) => e.selected).length

  const patchNode = (id: string, patch: Partial<ElementNode['data']>) =>
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)))

  const clearSelection = () => {
    setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)))
    setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)))
  }

  /** Programar una actividad: primero se guarda (tiene que existir en el servidor) */
  const schedule = async (node: ElementNode, kind: 'task' | 'event') => {
    if (!(await flush())) return
    openEditor({
      mode: 'create',
      kind,
      recurrence: 'normal',
      date: toKey(new Date()),
      title: node.data.title.trim() || project.title,
      notes: node.data.notes,
      link: { projectId: project.id, nodeId: node.id },
    })
  }

  const inspector =
    selectedCount === 1 && selectedNode ? (
      <NodeInspector
        key={selectedNode.id}
        node={selectedNode}
        onChange={(p) => patchNode(selectedNode.id, p)}
        onStatus={(s) => setStatus(selectedNode.id, s)}
        onSchedule={(kind) => schedule(selectedNode, kind)}
        onEditScheduled={() => {
          const s = selectedNode.data.scheduled
          if (s) openEditor({ mode: 'edit', kind: s.kind, id: s.id, date: s.date })
        }}
        onDelete={() => deleteElements({ nodes: [{ id: selectedNode.id }] })}
      />
    ) : selectedCount === 1 && selectedEdge ? (
      <EdgeInspector
        key={selectedEdge.id}
        edge={selectedEdge}
        onLabel={(label) =>
          setEdges((es) => es.map((e) => (e.id === selectedEdge.id ? { ...e, label: label || undefined } : e)))
        }
        onDelete={() => deleteElements({ edges: [{ id: selectedEdge.id }] })}
      />
    ) : null

  return (
    <DiagramContext.Provider value={ctx}>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-sidebar p-4 lg:flex">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Elementos</h2>
          <Palette layout="column" onAdd={(t) => addNode(t)} />
          <p className="text-xs text-muted-foreground">
            Arrástralos al lienzo y únelos desde los puntos de sus bordes.
          </p>
        </aside>

        <div ref={wrapper} className="relative min-w-0 flex-1" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <ArrowMarkers />
          <ReactFlow<ElementNode, FlowEdge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: 'pulse' }}
            colorMode={resolved}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
            minZoom={0.2}
            maxZoom={2}
            snapToGrid
            snapGrid={[8, 8]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="var(--flow-grid)" />
            <Controls showInteractive={false} position="bottom-left" className="max-lg:!mb-20" />
            <MiniMap
              pannable
              zoomable
              className="max-lg:!hidden"
              nodeStrokeWidth={2}
              nodeColor={(n) =>
                flow.get(n.id) === 'done'
                  ? 'var(--flow-done)'
                  : flow.get(n.id) === 'in_progress'
                    ? 'var(--flow-active)'
                    : 'var(--flow-idle)'
              }
            />
          </ReactFlow>

          {/* En pantallas chicas la paleta flota abajo */}
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-3 lg:hidden">
            <div className="rounded-xl border bg-background/95 p-1.5 shadow-lg backdrop-blur">
              <Palette layout="bar" onAdd={(t) => addNode(t)} />
            </div>
          </div>
        </div>

        {isDesktop && (
          <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l p-5">
            {inspector ?? <ProjectSummary key={project.id} project={project} />}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet open={!!inspector} onOpenChange={(o) => !o && clearSelection()}>
          <SheetContent
            side="bottom"
            className="max-h-[80svh] gap-0 overflow-y-auto rounded-t-2xl p-5"
            // Sin abrir el teclado al tocar un elemento
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetTitle className="sr-only">Elemento seleccionado</SheetTitle>
            <SheetDescription className="sr-only">Editar el elemento del diagrama</SheetDescription>
            {inspector}
          </SheetContent>
        </Sheet>
      )}
    </DiagramContext.Provider>
  )
}
