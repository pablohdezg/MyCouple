import type { SyncConfig } from './sync'
import { loadMedia, saveMedia } from './media'

/**
 * Fotos, vídeos, notas de voz y dibujos viven en IndexedDB, cada uno en su
 * propio móvil — por eso hacía falta esto: sin subirlos a algún sitio
 * compartido, la otra persona nunca podía verlos, aunque el mensaje o el
 * recuerdo sí le llegara (sólo llega el texto, la fecha, el `mediaId`...).
 *
 * Se usa el propio proyecto de Supabase, en su servicio de almacenamiento
 * (Storage), con las mismas credenciales que ya tenéis puestas para
 * sincronizar. Cada archivo se guarda en una ruta con vuestro código de
 * pareja delante, así que sólo quien conozca el código puede llegar a él
 * (la misma idea que protege la fila de la tabla `pares`).
 *
 * Si no tenéis la sincronización activada, todo esto simplemente no hace
 * nada: los archivos se quedan sólo en el móvil, como siempre.
 */

const BUCKET = 'media'

function objectUrl(cfg: SyncConfig, id: string): string {
  return `${cfg.url.replace(/\/+$/, '')}/storage/v1/object/${BUCKET}/${encodeURIComponent(cfg.code)}/${encodeURIComponent(id)}`
}

function headers(cfg: SyncConfig, extra: Record<string, string> = {}) {
  return { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, ...extra }
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { blob: new Blob([bytes], { type: mime }), mime }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

/** Sube un archivo a Storage. No falla la app si no hay conexión: es "best effort". */
export async function uploadMedia(cfg: SyncConfig | undefined, id: string, dataUrl: string): Promise<void> {
  if (!cfg?.url || !cfg.key || !cfg.code) return
  try {
    const { blob, mime } = dataUrlToBlob(dataUrl)
    await fetch(objectUrl(cfg, id), {
      method: 'POST',
      headers: headers(cfg, { 'Content-Type': mime, 'x-upsert': 'true' }),
      body: blob,
    })
  } catch {
    /* se queda sólo en local; no pasa nada grave */
  }
}

/** Descarga un archivo de Storage (o null si no existe / no hay red). */
export async function downloadMedia(cfg: SyncConfig | undefined, id: string): Promise<string | undefined> {
  if (!cfg?.url || !cfg.key || !cfg.code) return undefined
  try {
    const res = await fetch(objectUrl(cfg, id), { headers: headers(cfg) })
    if (!res.ok) return undefined
    return await blobToDataUrl(await res.blob())
  } catch {
    return undefined
  }
}

export async function deleteRemoteMedia(cfg: SyncConfig | undefined, id: string): Promise<void> {
  if (!cfg?.url || !cfg.key || !cfg.code) return
  try {
    await fetch(objectUrl(cfg, id), { method: 'DELETE', headers: headers(cfg) })
  } catch {
    /* nada */
  }
}

/** Guarda en local y, si hay sincronización, sube también a Storage. */
export async function saveMediaSynced(
  id: string,
  dataUrl: string,
  cfg?: SyncConfig,
): Promise<void> {
  await saveMedia(id, dataUrl)
  void uploadMedia(cfg, id, dataUrl)
}

/**
 * Lee de local; si no está (porque lo mandó la otra persona y aún no ha
 * llegado a este móvil), intenta bajarlo de Storage y lo deja guardado en
 * local para la próxima vez.
 */
/**
 * Se asegura de que un archivo que ya está en este móvil también esté subido.
 *
 * Hace falta para las fotos elegidas antes de configurar la sincronización
 * (por ejemplo la de perfil, que se pone en el primer paso de la app): sin
 * esto se quedaban para siempre sólo en el móvil que las eligió.
 */
export async function ensureUploaded(id: string, cfg?: SyncConfig): Promise<void> {
  if (!cfg?.url || !cfg.key || !cfg.code) return
  const local = await loadMedia(id)
  if (local) await uploadMedia(cfg, id, local)
}

export async function loadMediaSynced(id: string, cfg?: SyncConfig): Promise<string | undefined> {
  const local = await loadMedia(id)
  if (local) return local
  const remote = await downloadMedia(cfg, id)
  if (remote) await saveMedia(id, remote)
  return remote
}
