import type { CapacitorConfig } from '@capacitor/cli'

// App de Android: empaqueta el build de Vite en modo "mobile" (pnpm build:mobile)
const config: CapacitorConfig = {
  appId: 'online.pulsso.app',
  appName: 'Pulsso',
  webDir: 'dist',
  android: {
    // La app corre en https://localhost: la API debe aceptar ese origen en CORS_ORIGIN
    allowMixedContent: false,
  },
  plugins: {
    // Edge-to-edge: la app dibuja bajo las barras y respeta --safe-area-inset-* (ver index.css)
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#18181b',
    },
  },
}

export default config
