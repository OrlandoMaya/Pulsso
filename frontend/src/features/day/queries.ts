import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { DayItem, DayList } from '@/lib/types'

export const dayItemsKey = (date: string, list: DayList) => ['day-items', date, list] as const

export function useDayItems(date: string, list: DayList) {
  return useQuery({
    queryKey: dayItemsKey(date, list),
    queryFn: () => api<DayItem[]>('/day-items', { query: { date, list } }),
  })
}

const onError = (e: Error) => toast.error(e.message)

export function useCreateDayItem(date: string, list: DayList) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      api<DayItem>('/day-items', { method: 'POST', body: { date, list, ...data } }),
    onSuccess: (item) => qc.setQueryData<DayItem[]>(dayItemsKey(date, list), (l) => [...(l ?? []), item]),
    onError,
  })
}

type Patch = Partial<Pick<DayItem, 'title' | 'description' | 'done' | 'date' | 'list'>>

/** Editar, tachar o mover a otro día/lista (optimista) */
export function useUpdateDayItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ item, patch }: { item: DayItem; patch: Patch }) =>
      api<DayItem>(`/day-items/${item.id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ item, patch }) => {
      const key = dayItemsKey(item.date, item.list)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<DayItem[]>(key)
      const leaves = (patch.date && patch.date !== item.date) || (patch.list && patch.list !== item.list)
      qc.setQueryData<DayItem[]>(key, (l) =>
        leaves ? l?.filter((x) => x.id !== item.id) : l?.map((x) => (x.id === item.id ? { ...x, ...patch } : x)),
      )
      return { key, previous }
    },
    onError: (e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.previous)
      onError(e)
    },
    onSettled: (updated, _e, { item }) => {
      qc.invalidateQueries({ queryKey: dayItemsKey(item.date, item.list) })
      if (updated) qc.invalidateQueries({ queryKey: dayItemsKey(updated.date, updated.list) })
    },
  })
}

export function useDeleteDayItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: DayItem) => api(`/day-items/${item.id}`, { method: 'DELETE' }),
    onMutate: async (item) => {
      const key = dayItemsKey(item.date, item.list)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<DayItem[]>(key)
      qc.setQueryData<DayItem[]>(key, (l) => l?.filter((x) => x.id !== item.id))
      return { key, previous }
    },
    onError: (e, _v, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.previous)
      onError(e)
    },
  })
}

export function useReorderDayItems(date: string, list: DayList) {
  const qc = useQueryClient()
  const key = dayItemsKey(date, list)
  return useMutation({
    mutationFn: (items: DayItem[]) =>
      api<DayItem[]>('/day-items/order', { method: 'PUT', body: { date, list, ids: items.map((i) => i.id) } }),
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<DayItem[]>(key)
      qc.setQueryData(key, items)
      return { previous }
    },
    onSuccess: (items) => qc.setQueryData(key, items),
    onError: (e, _v, ctx) => {
      qc.setQueryData(key, ctx?.previous)
      qc.invalidateQueries({ queryKey: key })
      onError(e)
    },
  })
}

/** Pasa las pendientes de un día a otro */
export function useCarryOver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { from: string; to: string; list: DayList }) =>
      api<{ moved: number }>('/day-items/carry-over', { method: 'POST', body: v }),
    onSuccess: ({ moved }, v) => {
      qc.invalidateQueries({ queryKey: dayItemsKey(v.from, v.list) })
      qc.invalidateQueries({ queryKey: dayItemsKey(v.to, v.list) })
      toast.success(
        moved ? `${moved} ${moved === 1 ? 'tarea pasada' : 'tareas pasadas'} al siguiente día` : 'No hay pendientes',
      )
    },
    onError,
  })
}
