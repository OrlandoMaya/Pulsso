import { describe, expect, it } from 'vitest'
import { canConnect, edgeState, flowStatuses, nextToStart, type FlowNode } from './diagram'

const nodes: FlowNode[] = [
  { id: 'inicio', type: 'start', status: 'pending' },
  { id: 'dis', type: 'activity', status: 'done' },
  { id: 'dev', type: 'activity', status: 'in_progress' },
  { id: 'ok', type: 'decision', status: 'pending' },
  { id: 'fin', type: 'end', status: 'pending' },
]
const edges = [
  { source: 'inicio', target: 'dis' },
  { source: 'dis', target: 'dev' },
  { source: 'dev', target: 'ok' },
  { source: 'ok', target: 'fin' },
  { source: 'ok', target: 'dev' },
]

describe('flowStatuses', () => {
  it('inicio siempre hecho; decisión y fin según lo que les llega', () => {
    const s = flowStatuses(nodes, edges)
    expect(s.get('inicio')).toBe('done')
    expect(s.get('dev')).toBe('in_progress')
    expect(s.get('ok')).toBe('pending')
    expect(s.get('fin')).toBe('pending')
  })

  it('con todo hecho, el flujo llega al fin aunque haya un ciclo', () => {
    const all = nodes.map((n) => (n.type === 'activity' ? { ...n, status: 'done' as const } : n))
    const s = flowStatuses(all, edges)
    expect(s.get('ok')).toBe('done')
    expect(s.get('fin')).toBe('done')
  })
})

describe('edgeState', () => {
  it('pulsa cuando sale o llega a algo en progreso', () => {
    expect(edgeState('done', 'in_progress')).toBe('active')
    expect(edgeState('in_progress', 'pending')).toBe('active')
    expect(edgeState('done', 'done')).toBe('done')
    expect(edgeState('done', 'pending')).toBe('ready')
    expect(edgeState('pending', 'pending')).toBe('idle')
  })
})

describe('nextToStart', () => {
  it('arranca las actividades pendientes que siguen, no tras una decisión', () => {
    const list: FlowNode[] = [
      { id: 'a', type: 'activity', status: 'done' },
      { id: 'b', type: 'activity', status: 'pending' },
      { id: 'c', type: 'activity', status: 'done' },
      { id: 'd', type: 'decision', status: 'pending' },
    ]
    const links = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'a', target: 'd' },
    ]
    expect(nextToStart(list, links, 'a')).toEqual(['b'])
  })
})

describe('canConnect', () => {
  it('no se une consigo, no entra al inicio, no sale del fin ni se repite', () => {
    expect(canConnect(nodes, edges, 'dis', 'dis')).toBe(false)
    expect(canConnect(nodes, edges, 'dis', 'inicio')).toBe(false)
    expect(canConnect(nodes, edges, 'fin', 'dis')).toBe(false)
    expect(canConnect(nodes, edges, 'dis', 'dev')).toBe(false)
    expect(canConnect(nodes, edges, 'dis', 'fin')).toBe(true)
  })
})
