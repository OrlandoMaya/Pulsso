import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { ApiError } from '@/lib/api'
import { toKey } from '@/lib/dates'
import { AuthProvider } from './features/auth/AuthProvider'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { LoginPage } from './features/auth/LoginPage'
import { RequireAuth } from './features/auth/RequireAuth'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { ThemeProvider } from './features/theme/ThemeProvider'
import { useTheme } from './features/theme/theme-context'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

function Root() {
  const { resolved } = useTheme()
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="bottom-right" theme={resolved} />
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/recuperar', element: <ForgotPasswordPage /> },
      { path: '/restablecer', element: <ResetPasswordPage /> },
      {
        element: (
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          { path: '/dia/:date?', element: <CalendarPage view="dia" /> },
          { path: '/semana/:date?', element: <CalendarPage view="semana" /> },
          { path: '/mes/:date?', element: <CalendarPage view="mes" /> },
          { path: '/pendientes', element: <CalendarPage view="mes" section="pendientes" /> },
          { path: '/finanzas', element: <CalendarPage view="mes" section="finanzas" /> },
          {
            path: '/proyectos/:id',
            // El lienzo (React Flow) se carga solo al abrir un proyecto
            lazy: async () => ({ Component: (await import('./features/projects/ProjectPage')).ProjectPage }),
          },
          { path: '*', element: <Navigate to={`/semana/${toKey(new Date())}`} replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
