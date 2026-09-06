/**
 * Genera todos los iconos y splash a partir de assets/icon.svg.
 *
 *   node scripts/generate-assets.mjs
 *
 * Crea:
 *  - public/  → iconos de la PWA
 *  - android/app/src/main/res/  → iconos de la app y splash (si existe la carpeta)
 */
import sharp from 'sharp'
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const icon = join(root, 'assets', 'icon.svg')
const foreground = join(root, 'assets', 'icon-foreground.svg')
const BG = '#e8567c'

const exists = async (p) => {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

const out = async (file, buffer) => {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, buffer)
  console.log('  ✓', file.replace(root + '/', ''))
}

const png = (src, size, opts = {}) =>
  sharp(src, { density: 400 }).resize(size, size, { fit: 'contain', ...opts }).png().toBuffer()

async function main() {
  console.log('Iconos de la PWA:')
  for (const size of [64, 180, 192, 256, 384, 512]) {
    const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`
    await out(join(root, 'public', name), await png(icon, size))
  }
  await out(join(root, 'public', 'favicon.svg'), await readFile(icon))
  await out(
    join(root, 'public', 'favicon.ico'),
    await sharp(icon, { density: 400 }).resize(48, 48).png().toBuffer(),
  )

  const res = join(root, 'android', 'app', 'src', 'main', 'res')
  if (!(await exists(res))) {
    console.log('\n(No hay carpeta android/: ejecuta `npx cap add android` y vuelve a lanzarlo.)')
    return
  }

  console.log('\nIconos de Android:')
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
  for (const [d, size] of Object.entries(densities)) {
    await out(join(res, `mipmap-${d}`, 'ic_launcher.png'), await png(icon, size))
    await out(join(res, `mipmap-${d}`, 'ic_launcher_round.png'), await png(icon, size))
    // Capa de primer plano del icono adaptativo (108dp con zona segura)
    await out(
      join(res, `mipmap-${d}`, 'ic_launcher_foreground.png'),
      await png(foreground, Math.round(size * 2.25)),
    )
  }

  // Color de fondo del icono adaptativo
  await out(
    join(res, 'values', 'ic_launcher_background.xml'),
    Buffer.from(
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
    ),
  )

  console.log('\nPantalla de inicio:')
  const splash = async (w, h, file) => {
    const logo = await sharp(icon, { density: 400 })
      .resize(Math.round(Math.min(w, h) * 0.32))
      .png()
      .toBuffer()
    const img = await sharp({
      create: { width: w, height: h, channels: 4, background: '#fff6f4' },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer()
    await out(file, img)
  }
  const splashSizes = { mdpi: 480, hdpi: 800, xhdpi: 1280, xxhdpi: 1600, xxxhdpi: 1920 }
  await splash(1920, 1920, join(res, 'drawable', 'splash.png'))
  for (const [d, size] of Object.entries(splashSizes)) {
    const short = Math.round(size * 0.5625)
    await splash(short, size, join(res, `drawable-port-${d}`, 'splash.png'))
    await splash(size, short, join(res, `drawable-land-${d}`, 'splash.png'))
  }

  // Icono pequeño de las notificaciones (silueta blanca sobre transparente)
  console.log('\nIcono de notificaciones:')
  for (const [d, size] of Object.entries({ mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 })) {
    const heart = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
         <path d="M50 88 C50 88 8 60 8 34 C8 18 20 8 33 8 C41 8 47 12 50 18 C53 12 59 8 67 8 C80 8 92 18 92 34 C92 60 50 88 50 88 Z" fill="#ffffff"/>
       </svg>`,
    )
    await out(join(res, `drawable-${d}`, 'ic_stat_icon.png'), await sharp(heart).png().toBuffer())
  }

  console.log('\n¡Listo! 💗')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
