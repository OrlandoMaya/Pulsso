import { App } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

/** Ajustes que solo aplican dentro de la app de Android (Capacitor); en la web no hace nada */
export function setupNative() {
  if (!Capacitor.isNativePlatform()) return

  // Botón "atrás" de Android: navega hacia atrás y, en la primera pantalla, cierra la app
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else App.exitApp()
  })

  // Las barras del sistema son transparentes (edge-to-edge) y muestran el fondo de la app:
  // solo hay que poner sus iconos claros u oscuros según el tema
  const syncSystemBars = () => {
    const dark = document.documentElement.classList.contains('dark')
    SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
  }
  syncSystemBars()
  new MutationObserver(syncSystemBars).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
}
