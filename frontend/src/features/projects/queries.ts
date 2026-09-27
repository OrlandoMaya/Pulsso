import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { GeneralTask, Project, ProjectEdge, ProjectNode } from '@/lib/types'

export const projectKeys = {
  all: ['general-tasks'] as const,
  one: (id: string) => ['general-tasks', id] as const,
}

const onError = (e: Error) => toast.error(e.message)

export function useGeneralTasks() {
  return useQuery({ queryKey: projectKeys.all, queryFn: () => api<GeneralTask[]>('/general-tasks') })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.one(id ?? ''),
    queryFn: () => api<Project>(`/general-tasks/${id}`),
    enabled: !!id,
  })
}

export interface GeneralTaskInput {
  calendarId: string
  title: string
  description?: string
  isProject?: boolean
}

export function useCreateGeneralTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GeneralTaskInput) => api<GeneralTask>('/general-tasks', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
    onError,
  })
}

type Patch = Partial<Pick<GeneralTask, 'title' | 'description' | 'calendarId' | 'done'>>

/** Editar o tachar (optimista en la lista) */
export function usePatchGeneralTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Patch }) =>
      api<GeneralTask>(`/general-tasks/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: projectKeys.all, exact: true })
      const prev = qc.getQueryData<GeneralTask[]>(projectKeys.all)
      qc.setQueryData<GeneralTask[]>(projectKeys.all, (list) =>
        list?.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      )
      qc.setQueryData<Project>(projectKeys.one(id), (p) => p && { ...p, ...patch })
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(projectKeys.all, ctx.prev)
      onError(e)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.all, exact: true }),
  })
}

export function useDeleteGeneralTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/general-tasks/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: projectKeys.all, exact: true })
      qc.setQueryData<GeneralTask[]>(projectKeys.all, (list) => list?.filter((g) => g.id !== id))
    },
    onError,
    // Lo programado sigue en el calendario, pero sin el nombre del proyecto
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: projectKeys.all }),
        qc.invalidateQueries({ queryKey: ['agenda'] }),
        qc.invalidateQueries({ queryKey: ['day'] }),
      ]),
  })
}

/** Nuevo orden (optimista): `ids` en el orden visible */
export function useReorderGeneralTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api('/general-tasks/order', { method: 'PUT', body: { ids } }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: projectKeys.all, exact: true })
      const prev = qc.getQueryData<GeneralTask[]>(projectKeys.all)
      const pos = new Map(ids.map((id, i) => [id, i]))
      qc.setQueryData<GeneralTask[]>(projectKeys.all, (list) =>
        list
          ?.map((g) => (pos.has(g.id) ? { ...g, position: pos.get(g.id)! } : g))
          .sort((a, b) => a.position - b.position),
      )
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(projectKeys.all, ctx.prev)
      onError(e)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.all, exact: true }),
  })
}

export type DiagramInput = {
  nodes: Omit<ProjectNode, 'scheduled'>[]
  edges: ProjectEdge[]
}

/** Guarda el diagrama. No reescribe el lienzo abierto: solo lo que viene del servidor (lo programado) */
export function useSaveDiagram(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: DiagramInput) => api<Project>(`/general-tasks/${id}/diagram`, { method: 'PUT', body: d }),
    onSuccess: (p, d) => {
      const before = qc.getQueryData<Project>(projectKeys.one(id))
      const kept = new Set(d.nodes.map((n) => n.id))
      // Borrar una actividad programada suelta su vínculo en el calendario
      const unlinked = before?.nodes.some((n) => n.scheduled && !kept.has(n.id))
      qc.setQueryData(projectKeys.one(id), p)
      return Promise.all([
        qc.invalidateQueries({ queryKey: projectKeys.all, exact: true }),
        unlinked && qc.invalidateQueries({ queryKey: ['agenda'] }),
        unlinked && qc.invalidateQueries({ queryKey: ['day'] }),
      ])
    },
    onError,
  })
}
