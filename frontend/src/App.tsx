import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { ApiError } from '@/lib/api'
import { toKey } from '@/lib/dates'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { CalendarPage } from './features/calendar/CalendarPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

function Root() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="bottom-right" />
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          { path: '/semana/:date?', element: <CalendarPage view="semana" /> },
          { path: '/mes/:date?', element: <CalendarPage view="mes" /> },
          { path: '*', element: <Navigate to={`/semana/${toKey(new Date())}`} replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
