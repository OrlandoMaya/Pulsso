import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Expense, ExpenseCategory, ExpenseSummary } from '@/lib/types'

export const financeKeys = {
  list: (from: string, to: string) => ['expenses', from, to] as const,
  summary: (from: string, to: string) => ['expense-summary', from, to] as const,
}

const onError = (e: Error) => toast.error(e.message)

/** Tras cualquier cambio: listas, resúmenes y lo gastado que muestra el calendario */
const refresh = (qc: QueryClient) =>
  Promise.all(
    ['expenses', 'expense-summary', 'expense-categories', 'agenda', 'day'].map((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    ),
  )

export function useExpenses(from: string, to: string) {
  return useQuery({
    queryKey: financeKeys.list(from, to),
    queryFn: () => api<Expense[]>('/expenses', { query: { from, to } }),
    placeholderData: (prev) => prev,
  })
}

export function useExpenseSummary(from: string, to: string) {
  return useQuery({
    queryKey: financeKeys.summary(from, to),
    queryFn: () => api<ExpenseSummary>('/expenses/summary', { query: { from, to } }),
    placeholderData: (prev) => prev,
  })
}

export type ExpenseInput = Omit<Expense, 'id' | 'categoryId'> & { categoryId?: string | null }

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ExpenseInput) => api<Expense>('/expenses', { method: 'POST', body: data }),
    onSuccess: () => refresh(qc),
    onError,
  })
}

/** Editar (optimista en las listas abiertas) */
export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseInput> }) =>
      api<Expense>(`/expenses/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['expenses'] })
      const moved = patch.date
        ? qc
            .getQueriesData<Expense[]>({ queryKey: ['expenses'] })
            .flatMap(([, list]) => list ?? [])
            .find((e) => e.id === id)
        : undefined
      for (const [key, list] of qc.getQueriesData<Expense[]>({ queryKey: ['expenses'] })) {
        if (!list) continue
        const [, from, to] = key as ReturnType<typeof financeKeys.list>
        if (moved && patch.date) {
          // Al cambiar de día: sale de las listas que ya no lo incluyen y entra en las que sí
          const next = { ...moved, ...patch }
          const rest = list.filter((e) => e.id !== id)
          const inRange = next.date >= from && next.date <= to
          qc.setQueryData<Expense[]>(
            key,
            inRange ? [...rest, next].sort((a, b) => b.date.localeCompare(a.date)) : rest,
          )
        } else {
          qc.setQueryData<Expense[]>(
            key,
            list.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          )
        }
      }
    },
    onError,
    onSettled: () => refresh(qc),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/expenses/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['expenses'] })
      qc.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (list) => list?.filter((e) => e.id !== id))
    },
    onError,
    onSettled: () => refresh(qc),
  })
}

/* ─────────── Categorías de finanzas ─────────── */

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api<ExpenseCategory[]>('/expense-categories'),
  })
}

export function useExpenseCategoryUsage(id: string | null) {
  return useQuery({
    // Fuera de 'expense-categories' para no volver a pedirlo al borrar la categoría
    queryKey: ['expense-category-usage', id],
    queryFn: () => api<{ expenses: number }>(`/expense-categories/${id}/usage`),
    enabled: !!id,
    staleTime: 0,
  })
}

export type ExpenseCategoryInput = Omit<ExpenseCategory, 'id'>

export function useSaveExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: ExpenseCategoryInput }) =>
      id
        ? api<ExpenseCategory>(`/expense-categories/${id}`, { method: 'PATCH', body: data })
        : api<ExpenseCategory>('/expense-categories', { method: 'POST', body: data }),
    onSuccess: () => refresh(qc),
    onError,
  })
}

/** Borra la categoría; sus gastos quedan sin categoría */
export function useDeleteExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/expense-categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => refresh(qc),
    onError,
  })
}
