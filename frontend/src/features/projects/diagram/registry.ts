import { ActivityNode, DecisionNode, EndNode, StartNode } from './nodes'
import { PulseEdge } from './PulseEdge'

/** Tipos de elemento y de flecha del lienzo (fuera de los componentes para que no cambien) */
export const nodeTypes = {
  start: StartNode,
  activity: ActivityNode,
  decision: DecisionNode,
  end: EndNode,
}

export const edgeTypes = { pulse: PulseEdge }
