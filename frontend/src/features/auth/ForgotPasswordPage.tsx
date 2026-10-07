import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation } from 'react-router'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { AuthLayout, FormError } from './AuthLayout'
import { useAuth } from './auth-context'

const schema = z.object({ email: z.email('Escribe un correo válido') })
type Values = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { status } = useAuth()
  const location = useLocation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: (location.state as { email?: string } | null)?.email ?? '' },
  })
  const { errors, isSubmitting } = form.formState

  if (status === 'authenticated') return <Navigate to="/" replace />

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setServerError(null)
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } })
      setSentTo(email)
    } catch (e) {
      setServerError((e as Error).message)
    }
  })

  const back = (
    <Link
      to="/login"
      className="flex items-center gap-1.5 self-start text-[13px] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Volver a iniciar sesión
    </Link>
  )

  if (sentTo) {
    return (
      <AuthLayout title="Revisa tu correo" subtitle="Te enviamos un enlace para elegir una contraseña nueva.">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p>
            Si <span className="font-medium">{sentTo}</span> tiene una cuenta en Pulsso, en unos minutos te llegará el
            enlace. Vale 1 hora; mira también en spam.
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={() => setSentTo(null)}>
          Usar otro correo
        </Button>
        {back}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Recupera tu contraseña" subtitle="Escribe tu correo y te enviaremos un enlace para cambiarla.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            className="h-10"
            autoFocus
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {serverError && <FormError>{serverError}</FormError>}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Enviar enlace
        </Button>
        {back}
      </form>
    </AuthLayout>
  )
}
