/**
 * Convierte dist-single/ en un único archivo HTML autocontenido.
 *
 *   npx vite build --config vite.single.config.ts
 *   node scripts/inline.mjs
 *
 * Genera:
 *   dist-single/nuestro-rincon.html   → abrir con doble clic o subir a cualquier sitio
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'dist-single')

const files = await readdir(dir)
const jsName = files.find((f) => f.endsWith('.js'))
const cssName = files.find((f) => f.endsWith('.css'))

const js = await readFile(join(dir, jsName), 'utf8')
const css = cssName ? await readFile(join(dir, cssName), 'utf8') : ''
const icon = await readFile(join(root, 'public', 'icon-192.png'))

const html = `<!doctype html>
<html lang="es" data-palette="rubor" data-dark="0">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#fff6f4" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="MyCouple" />
<link rel="icon" href="data:image/png;base64,${icon.toString('base64')}" />
<title>MyCouple</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${js}</script>
</body>
</html>
`

await writeFile(join(dir, 'nuestro-rincon.html'), html)
console.log(
  `✓ dist-single/nuestro-rincon.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`,
)

// Variante sin <html>/<head>/<body> para incrustar en otras páginas.
const fragment = `<title>MyCouple</title>
<style>${css}
html, body { height: 100%; }
</style>
<div id="root"></div>
<script type="module">
  document.documentElement.setAttribute('data-palette', 'rubor')
  document.documentElement.setAttribute('data-dark', '0')
${js}
</script>
`
await writeFile(join(dir, 'fragmento.html'), fragment)
console.log(`✓ dist-single/fragmento.html (${(Buffer.byteLength(fragment) / 1024).toFixed(0)} KB)`)
