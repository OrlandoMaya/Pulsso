// Compila el APK firmado de Android y lo deja en downloads/pulsso.apk, que nginx sirve en /downloads/pulsso.apk.
// Uso: pnpm android:apk   (antes, sube versionCode/versionName en android/app/build.gradle)
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const android = join(root, 'android')
const isWindows = process.platform === 'win32'

if (!existsSync(join(android, 'keystore.properties'))) {
  console.error('Falta android/keystore.properties (y pulsso-release.jks): sin la firma no se puede compilar el APK.')
  process.exit(1)
}

const env = { ...process.env }
// Gradle necesita Java: por defecto, el que trae Android Studio
if (!env.JAVA_HOME) {
  const jbr = isWindows
    ? 'C:\\Program Files\\Android\\Android Studio\\jbr'
    : '/Applications/Android Studio.app/Contents/jbr/Contents/Home'
  if (existsSync(jbr)) env.JAVA_HOME = jbr
}
// ...y el SDK de Android donde lo instala Android Studio (si no hay android/local.properties)
if (!env.ANDROID_HOME && !existsSync(join(android, 'local.properties'))) {
  const sdk = isWindows
    ? join(env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
    : join(env.HOME ?? '', 'Library', 'Android', 'sdk')
  if (existsSync(sdk)) env.ANDROID_HOME = sdk
}

const run = (cmd, cwd = root) => execSync(cmd, { cwd, env, stdio: 'inherit' })

// El mismo pnpm que lanzó este script (aunque no esté en el PATH)
const pnpm = env.npm_execpath ? `"${process.execPath}" "${env.npm_execpath}"` : 'pnpm'
run(`${pnpm} android:sync`)
// Ruta completa: lanzado desde pnpm, cmd no busca ejecutables en la carpeta actual
run(`"${join(android, isWindows ? 'gradlew.bat' : 'gradlew')}" assembleRelease`, android)

const apk = join(android, 'app/build/outputs/apk/release/app-release.apk')
const out = join(root, 'downloads/pulsso.apk')
mkdirSync(join(root, 'downloads'), { recursive: true })
copyFileSync(apk, out)
console.log(`\nAPK listo: downloads/pulsso.apk (${(statSync(out).size / 1024 / 1024).toFixed(1)} MB)`)
