import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { AgendaDay, AgendaRange, Calendar, CalendarEvent, Task } from '@/lib/types'

export const keys = {
  calendars: ['calendars'] as const,
  agenda: (from: string, to: string) => ['agenda', from, to] as const,
  day: (date: string) => ['day', date] as const,
  event: (id: string) => ['event', id] as const,
  task: (id: string) => ['task', id] as const,
}

const onError = (e: Error) => toast.error(e.message)

/** Tras cualquier cambio, se recargan la agenda visible y el día abierto */
const refreshAgenda = (qc: QueryClient) =>
  Promise.all([qc.invalidateQueries({ queryKey: ['agenda'] }), qc.invalidateQueries({ queryKey: ['day'] })])

export function useCalendars() {
  return useQuery({ queryKey: keys.calendars, queryFn: () => api<Calendar[]>('/calendars') })
}

export function useAgenda(from: string, to: string) {
  return useQuery({
    queryKey: keys.agenda(from, to),
    queryFn: () => api<AgendaRange>('/agenda', { query: { from, to } }),
    placeholderData: (prev) => prev,
  })
}

export function useDay(date: string | null) {
  return useQuery({
    queryKey: keys.day(date ?? ''),
    queryFn: () => api<AgendaDay>(`/agenda/day/${date}`),
    enabled: !!date,
  })
}

export function useEvent(id: string | undefined) {
  return useQuery({ queryKey: keys.event(id ?? ''), queryFn: () => api<CalendarEvent>(`/events/${id}`), enabled: !!id })
}

export function useTask(id: string | undefined) {
  return useQuery({ queryKey: keys.task(id ?? ''), queryFn: () => api<Task>(`/tasks/${id}`), enabled: !!id })
}

export function useToggleCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: { id: string; visible: boolean }) =>
      api<Calendar>(`/calendars/${c.id}`, { method: 'PATCH', body: { visible: c.visible } }),
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: keys.calendars })
      qc.setQueryData<Calendar[]>(keys.calendars, (list) =>
        list?.map((x) => (x.id === c.id ? { ...x, visible: c.visible } : x)),
      )
    },
    onError,
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: keys.calendars }), refreshAgenda(qc)]),
  })
}

interface ToggleInput {
  sourceType: 'event' | 'task'
  sourceId: string
  date: string
  done: boolean
}

/** Marca un ítem en un día y recalcula el avance */
function applyToggle(day: AgendaDay, t: ToggleInput): AgendaDay {
  if (day.date !== t.date) return day
  const tasks = day.tasks.map((x) =>
    t.sourceType === 'task' && x.sourceId === t.sourceId ? { ...x, done: t.done } : x,
  )
  const events = day.events.map((x) =>
    t.sourceType === 'event' && x.sourceId === t.sourceId ? { ...x, done: t.done } : x,
  )
  const checkables = [...tasks, ...events.filter((e) => e.checkable)]
  return {
    ...day,
    tasks,
    events,
    progress: { done: checkables.filter((c) => c.done).length, total: checkables.length },
  }
}

/** Tachar / destachar con actualización optimista */
export function useToggleCompletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (t: ToggleInput) => api('/completions', { method: 'PUT', body: t }),
    onMutate: async (t) => {
      await Promise.all([qc.cancelQueries({ queryKey: ['agenda'] }), qc.cancelQueries({ queryKey: ['day'] })])
      const snapshot = [...qc.getQueriesData({ queryKey: ['agenda'] }), ...qc.getQueriesData({ queryKey: ['day'] })]
      qc.setQueriesData<AgendaRange>(
        { queryKey: ['agenda'] },
        (r) => r && { ...r, days: r.days.map((d) => applyToggle(d, t)) },
      )
      qc.setQueryData<AgendaDay>(keys.day(t.date), (d) => d && applyToggle(d, t))
      return { snapshot }
    },
    onError: (e, _t, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data))
      onError(e)
    },
    onSettled: () => refreshAgenda(qc),
  })
}

export type EventInput = Omit<CalendarEvent, 'id' | 'exdates'>
export type TaskInput = Omit<Task, 'id' | 'exdates'>

export function useSaveEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: EventInput }) =>
      id
        ? api<CalendarEvent>(`/events/${id}`, { method: 'PATCH', body: data })
        : api<CalendarEvent>('/events', { method: 'POST', body: data }),
    onSuccess: (ev) => {
      qc.setQueryData(keys.event(ev.id), ev)
      return refreshAgenda(qc)
    },
    onError,
  })
}

export function useSaveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: TaskInput }) =>
      id
        ? api<Task>(`/tasks/${id}`, { method: 'PATCH', body: data })
        : api<Task>('/tasks', { method: 'POST', body: data }),
    onSuccess: (task) => {
      qc.setQueryData(keys.task(task.id), task)
      return refreshAgenda(qc)
    },
    onError,
  })
}

/** Borra todo o solo la ocurrencia de un día */
export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, id, date }: { kind: 'event' | 'task'; id: string; date?: string }) => {
      const base = kind === 'event' ? '/events' : '/tasks'
      return date
        ? api(`${base}/${id}/exdates`, { method: 'POST', body: { date } })
        : api(`${base}/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => refreshAgenda(qc),
    onError,
  })
}
