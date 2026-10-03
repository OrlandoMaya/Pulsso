import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Expense, ExpenseSummary } from '@/lib/types'

export const financeKeys = {
  list: (from: string, to: string) => ['expenses', from, to] as const,
  summary: (from: string, to: string) => ['expense-summary', from, to] as const,
}

const onError = (e: Error) => toast.error(e.message)

/** Tras cualquier cambio: listas, resúmenes y lo gastado que muestra el calendario */
const refresh = (qc: QueryClient) =>
  Promise.all(['expenses', 'expense-summary', 'agenda', 'day'].map((k) => qc.invalidateQueries({ queryKey: [k] })))

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

export type ExpenseInput = Omit<Expense, 'id'>

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
      qc.setQueriesData<Expense[]>({ queryKey: ['expenses'] }, (list) =>
        list?.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      )
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
