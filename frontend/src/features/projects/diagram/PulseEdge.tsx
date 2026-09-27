import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { edgeState } from '@/lib/diagram'
import { cn } from '@/lib/utils'
import { useDiagram } from './context'
import type { FlowEdge } from './types'

const STROKE = {
  idle: 'var(--flow-idle)',
  ready: 'var(--flow-ready)',
  done: 'var(--flow-done)',
  active: 'var(--flow-active)',
} as const

const PULSES = 3
const DURATION = 1.8

/**
 * Flecha entre elementos. Cuando algo está en progreso, la recorren pulsos de una
 * tarea a la otra; hecha queda en verde; lo que aún no llega, punteado.
 */
export function PulseEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
}: EdgeProps<FlowEdge>) {
  const { flow } = useDiagram()
  const state = edgeState(flow.get(source) ?? 'pending', flow.get(target) ?? 'pending')
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  })
  const color = STROKE[state]

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#flow-arrow-${state})`}
        interactionWidth={18}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.75 : state === 'idle' ? 1.5 : 2,
          strokeDasharray: state === 'idle' ? '5 5' : undefined,
          opacity: state === 'active' ? 0.55 : 1,
        }}
      />
      {state === 'active' &&
        Array.from({ length: PULSES }, (_, i) => (
          <circle key={i} r={4} fill={color} className="flow-pulse" opacity={0}>
            <animateMotion
              dur={`${DURATION}s`}
              begin={`${(i * DURATION) / PULSES}s`}
              repeatCount="indefinite"
              path={path}
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.4 0 0.6 1"
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.1;0.85;1"
              dur={`${DURATION}s`}
              begin={`${(i * DURATION) / PULSES}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      {label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan pointer-events-auto absolute rounded-full border bg-card px-2 py-0.5 text-[11px] font-medium shadow-xs',
              selected && 'border-flow-active',
            )}
            // Por encima de los elementos (p. ej. del texto de una decisión)
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, zIndex: 1001 }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/** Puntas de flecha, una por color */
export function ArrowMarkers() {
  return (
    <svg className="absolute size-0" aria-hidden>
      <defs>
        {(Object.keys(STROKE) as (keyof typeof STROKE)[]).map((s) => (
          <marker
            key={s}
            id={`flow-arrow-${s}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={STROKE[s]} />
          </marker>
        ))}
      </defs>
    </svg>
  )
}
