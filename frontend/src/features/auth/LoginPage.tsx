import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Check, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Logo } from '../calendar/Logo'
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
    <div className="flex min-h-svh">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[380px] flex-col gap-6">
          <Logo className="lg:hidden" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-semibold tracking-tight">
              {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'Entra para ver tu calendario.' : 'Empieza a organizar tu semana en un minuto.'}
            </p>
          </div>

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
              <Label htmlFor="password">Contraseña</Label>
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

          {serverError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </Button>

          <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
            <Lock className="size-4" />
            Cada cuenta ve solo su propio calendario.
          </p>
        </form>
      </div>
    </div>
  )
}

function BrandPanel() {
  const items = [
    { title: 'Meditar 10 min', done: true },
    { title: 'Estudiar', done: true },
    { title: 'Planear la semana', done: false },
  ]
  return (
    <div className="hidden w-[min(640px,45vw)] shrink-0 flex-col justify-between bg-primary p-14 text-primary-foreground lg:flex dark:bg-card">
      <Logo inverted />
      <div className="flex flex-col gap-7">
        <div className="flex w-[380px] max-w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-[18px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Hoy</span>
            <span className="font-mono text-xs opacity-60">2/3</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-2/3 rounded-full bg-primary-foreground" />
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {items.map((it) => (
              <li key={it.title} className={cn('flex items-center gap-2.5', it.done && 'line-through opacity-50')}>
                <span
                  className={cn(
                    'grid size-4 place-items-center rounded-[4px]',
                    it.done ? 'bg-primary-foreground text-primary' : 'border border-white/40',
                  )}
                >
                  {it.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                {it.title}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2.5">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight">
            Tu semana, tus rutinas.
            <br />
            Todo en un solo lugar.
          </h2>
          <p className="max-w-[440px] text-base leading-relaxed opacity-60">
            Organiza eventos, tacha tus hábitos diarios y mira tu progreso día a día. Tu calendario es privado: solo tú
            lo ves.
          </p>
        </div>
      </div>
      <span className="text-[13px] opacity-50">© {new Date().getFullYear()} Pulsso</span>
    </div>
  )
}
