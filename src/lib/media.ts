import { get, set, del, keys } from 'idb-keyval'

/**
 * Fotos y audios se guardan en IndexedDB (no en localStorage) para no
 * reventar la cuota. El estado sólo guarda el `mediaId`.
 */

const KEY = (id: string) => `media:${id}`

export async function saveMedia(id: string, dataUrl: string): Promise<void> {
  await set(KEY(id), dataUrl)
}

export async function loadMedia(id: string): Promise<string | undefined> {
  return (await get(KEY(id))) as string | undefined
}

export async function deleteMedia(id: string): Promise<void> {
  await del(KEY(id))
}

export async function allMediaKeys(): Promise<string[]> {
  const k = (await keys()) as string[]
  return k.filter((x) => typeof x === 'string' && x.startsWith('media:'))
}

/** Lee un File y lo redimensiona a un JPEG razonable para móvil. */
export function fileToDataUrl(file: File, maxSide = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const src = String(reader.result)
      if (!file.type.startsWith('image/')) return resolve(src)
      const img = new Image()
      img.onerror = () => resolve(src)
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(src)
        ctx.drawImage(img, 0, 0, w, h)
        try {
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch {
          resolve(src)
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

/** Abre el selector de imágenes del sistema (funciona en web y en Android). */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
