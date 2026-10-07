import { Capacitor } from '@capacitor/core'
import { Download, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lo sirve nginx (frontend/downloads, generado con pnpm android:apk); no pasa por la API
const APK_URL = '/downloads/pulsso.apk'

/** Dentro de la propia app de Android no tiene sentido ofrecer la descarga */
const inNativeApp = Capacitor.isNativePlatform()

/** Enlace discreto para las pantallas sin sesión */
export function DownloadAppLink({ className }: { className?: string }) {
  if (inNativeApp) return null
  return (
    <a
      href={APK_URL}
      download
      className={cn(
        'flex items-center gap-2.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline',
        className,
      )}
    >
      <Smartphone className="size-4" />
      Descargar la app para Android
    </a>
  )
}

/** Tarjeta para la barra lateral */
export function DownloadAppCard() {
  if (inNativeApp) return null
  return (
    <a
      href={APK_URL}
      download
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Smartphone className="size-4" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium">App para Android</span>
        <span className="text-xs text-muted-foreground">Descarga e instala el APK</span>
      </span>
      <Download className="size-4 text-muted-foreground" />
    </a>
  )
}
