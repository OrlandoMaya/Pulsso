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
export const refreshAgenda = (qc: QueryClient) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ['agenda'] }),
    qc.invalidateQueries({ queryKey: ['day'] }),
    // Las actividades de los proyectos muestran lo programado y si se tachó
    qc.invalidateQueries({ queryKey: ['general-tasks'] }),
  ])

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

export function useCalendarUsage(id: string | null) {
  return useQuery({
    queryKey: ['calendar-usage', id],
    queryFn: () => api<{ events: number; tasks: number; generalTasks?: number }>(`/calendars/${id}/usage`),
    enabled: !!id,
    staleTime: 0,
  })
}

type CalendarInput = Pick<Calendar, 'name' | 'color'>

export function useSaveCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CalendarInput }) =>
      id
        ? api<Calendar>(`/calendars/${id}`, { method: 'PATCH', body: data })
        : api<Calendar>('/calendars', { method: 'POST', body: data }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.calendars }), refreshAgenda(qc)]),
    onError,
  })
}

/** Borra la categoría y todo lo que tiene */
export function useDeleteCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/calendars/${id}`, { method: 'DELETE' }),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: keys.calendars }), refreshAgenda(qc)]),
    onError,
  })
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

/** Marca un ítem en un día y recalcula el avance (tachar una tarea tacha sus subtareas) */
function applyToggle(day: AgendaDay, t: ToggleInput): AgendaDay {
  if (day.date !== t.date) return day
  const tasks = day.tasks.map((x) =>
    t.sourceType === 'task' && x.sourceId === t.sourceId
      ? { ...x, done: t.done, subtasks: x.subtasks.map((s) => ({ ...s, done: t.done })) }
      : x,
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
export type TaskInput = Omit<Task, 'id' | 'exdates' | 'position'>

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

/* ─────────── Tareas en listas (vista Día y modal): edición en línea, orden, pasar a mañana ─────────── */

/** Aplica un cambio a todas las copias de la agenda en caché (semana, mes y día) */
function patchCachedDays(qc: QueryClient, fn: (day: AgendaDay) => AgendaDay) {
  qc.setQueriesData<AgendaRange>({ queryKey: ['agenda'] }, (r) => r && { ...r, days: r.days.map(fn) })
  qc.setQueriesData<AgendaDay>({ queryKey: ['day'] }, (d) => d && fn(d))
}

async function snapshotAgenda(qc: QueryClient) {
  await Promise.all([qc.cancelQueries({ queryKey: ['agenda'] }), qc.cancelQueries({ queryKey: ['day'] })])
  return [...qc.getQueriesData({ queryKey: ['agenda'] }), ...qc.getQueriesData({ queryKey: ['day'] })]
}

type Snapshot = Awaited<ReturnType<typeof snapshotAgenda>>
const restore = (qc: QueryClient, snap?: Snapshot) => snap?.forEach(([key, data]) => qc.setQueryData(key, data))

/** Editar título, descripción, categoría o día de una tarea (optimista) */
export function usePatchTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<Task, 'title' | 'description' | 'calendarId' | 'startDate' | 'subtasks'>>
    }) => api<Task>(`/tasks/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, patch }) => {
      const snap = await snapshotAgenda(qc)
      if (patch.startDate) {
        // Pasa a otro día: sale de la lista de este
        patchCachedDays(qc, (d) => ({ ...d, tasks: d.tasks.filter((t) => t.sourceId !== id) }))
      } else {
        patchCachedDays(qc, (d) => ({
          ...d,
          tasks: d.tasks.map((t) =>
            t.sourceId === id
              ? {
                  ...t,
                  ...(patch.title !== undefined && { title: patch.title }),
                  ...(patch.description !== undefined && { description: patch.description }),
                  ...(patch.calendarId !== undefined && { calendarId: patch.calendarId }),
                  ...(patch.subtasks !== undefined && {
                    // Las que ya estaban conservan si están tachadas
                    subtasks: patch.subtasks.map((st) => ({
                      ...st,
                      // Nueva en una tarea ya hecha: cuenta como hecha
                      done: t.subtasks.find((x) => x.id === st.id)?.done ?? t.done,
                    })),
                  }),
                }
              : t,
          ),
        }))
      }
      return { snap }
    },
    onError: (e, _v, ctx) => {
      restore(qc, ctx?.snap)
      onError(e)
    },
    onSettled: () => refreshAgenda(qc),
  })
}

/** Nuevo orden de tareas (optimista): `ids` en el orden visible */
export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api('/tasks/order', { method: 'PUT', body: { ids } }),
    onMutate: async (ids) => {
      const snap = await snapshotAgenda(qc)
      const pos = new Map(ids.map((id, i) => [id, i]))
      patchCachedDays(qc, (d) => ({
        ...d,
        tasks: d.tasks
          .map((t) => (pos.has(t.sourceId) ? { ...t, position: pos.get(t.sourceId)! } : t))
          .sort((a, b) => a.position - b.position),
      }))
      return { snap }
    },
    onError: (e, _v, ctx) => {
      restore(qc, ctx?.snap)
      onError(e)
    },
    onSettled: () => refreshAgenda(qc),
  })
}

/** Pasa las tareas normales no hechas de un día a otro */
export function useCarryOverTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { from: string; to: string; calendarIds?: string[] }) =>
      api<{ moved: number }>('/tasks/carry-over', { method: 'POST', body: v }),
    onSuccess: ({ moved }) => {
      toast.success(
        moved
          ? `${moved} ${moved === 1 ? 'tarea pasada' : 'tareas pasadas'} al día siguiente`
          : 'No hay tareas pendientes para pasar',
      )
      return refreshAgenda(qc)
    },
    onError,
  })
}

/** Tachar una subtarea en un día (optimista): la tarea queda hecha si están todas */
export function useToggleSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { taskId: string; subtaskId: string; date: string; done: boolean }) =>
      api<{ subtasksDone: string[]; done: boolean }>('/completions/subtask', { method: 'PUT', body: v }),
    onMutate: async (v) => {
      const snap = await snapshotAgenda(qc)
      patchCachedDays(qc, (d) => {
        if (d.date !== v.date) return d
        const tasks = d.tasks.map((t) => {
          if (t.sourceId !== v.taskId) return t
          const subtasks = t.subtasks.map((s) => (s.id === v.subtaskId ? { ...s, done: v.done } : s))
          return { ...t, subtasks, done: subtasks.every((s) => s.done) }
        })
        return { ...d, tasks, progress: { done: tasks.filter((t) => t.done).length, total: tasks.length } }
      })
      return { snap }
    },
    onError: (e, _v, ctx) => {
      restore(qc, ctx?.snap)
      onError(e)
    },
    onSettled: () => refreshAgenda(qc),
  })
}
