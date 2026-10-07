import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DownloadAppLink } from '../app-download/DownloadApp'
import { AuthLayout, FormError } from './AuthLayout'
import { useAuth } from './auth-context'

const loginSchema = z.object({
  name: z.string().optional(),
  email: z.email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})
const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'Escribe tu nombre').max(80),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
})
type Values = z.infer<typeof loginSchema>
type Mode = 'login' | 'register'

export function LoginPage() {
  const { status, login, register: signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState
  const email = useWatch({ control: form.control, name: 'email' })

  if (status === 'authenticated') return <Navigate to="/" replace />

  const onSubmit = form.handleSubmit(async (v) => {
    setServerError(null)
    try {
      if (mode === 'login') await login(v.email, v.password)
      else await signUp(v.name ?? '', v.email, v.password)
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (e) {
      setServerError((e as Error).message)
    }
  })

  const switchMode = (m: Mode) => {
    setMode(m)
    setServerError(null)
    form.clearErrors()
  }

  return (
    <AuthLayout
      title={mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
      subtitle={mode === 'login' ? 'Entra para ver tu calendario.' : 'Empieza a organizar tu semana en un minuto.'}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
          <TabsList className="h-10 w-full">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Tu nombre"
                className="h-10"
                aria-invalid={!!errors.name}
                {...form.register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              className="h-10"
              aria-invalid={!!errors.email}
              {...form.register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              {mode === 'login' && (
                <Link
                  to="/recuperar"
                  // Lleva el correo ya escrito a la pantalla de recuperación
                  state={{ email }}
                  className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="h-10"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              mode === 'register' && <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            )}
          </div>
        </div>

        {serverError && <FormError>{serverError}</FormError>}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </Button>

        <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <Lock className="size-4" />
          Cada cuenta ve solo su propio calendario.
        </p>
        <DownloadAppLink />

      </form>
    </AuthLayout>
  )
}
