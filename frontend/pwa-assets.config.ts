import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Genera los iconos PNG de la PWA a partir del logo: pnpm generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#18181b' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#18181b' } },
  },
  images: ['public/favicon.svg'],
})
