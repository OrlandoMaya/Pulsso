import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout, FormError } from './AuthLayout'
import { useAuth } from './auth-context'

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Las contraseñas no coinciden' })
type Values = z.infer<typeof schema>

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirm: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setServerError(null)
    try {
      await resetPassword(token, password)
      navigate('/', { replace: true })
    } catch (e) {
      setServerError((e as Error).message)
    }
  })

  const requestAgain = (
    <Link
      to="/recuperar"
      className="flex items-center gap-1.5 self-start text-[13px] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Pedir un enlace nuevo
    </Link>
  )

  if (!/^[0-9a-f]{64}$/.test(token)) {
    return (
      <AuthLayout title="Enlace no válido" subtitle="Este enlace está incompleto. Abre el del correo o pide uno nuevo.">
        {requestAgain}
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Elige una contraseña nueva" subtitle="Al guardarla entrarás directamente a tu calendario.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña nueva</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-10"
              autoFocus
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Repite la contraseña</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-10"
              aria-invalid={!!errors.confirm}
              {...form.register('confirm')}
            />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
        </div>

        {serverError && <FormError>{serverError}</FormError>}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Guardar y entrar
        </Button>
        {requestAgain}
      </form>
    </AuthLayout>
  )
}
