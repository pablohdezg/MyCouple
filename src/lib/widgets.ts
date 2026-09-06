import { registerPlugin } from '@capacitor/core'
import { native } from './native'
import { live, daysTogether, nextMonthiversary, profileOf } from '../store/derive'
import { humanDuration } from './dates'
import { bearing, compass, distanceKm, fmtDistance } from './geo'
import { loadMediaSynced } from './storage'
import type { AppState } from '../types'

/**
 * Puente con los widgets nativos de la pantalla de inicio de Android
 * (`WidgetBridgePlugin.java`). La app calcula los textos ya listos en
 * español y se los pasa al plugin, que sólo los guarda y refresca los
 * widgets: así toda la lógica de fechas, distancia, etc. vive en un único
 * sitio (aquí), no duplicada en Java.
 */
interface WidgetBridge {
  update(data: {
    daysNumber?: string
    daysBreakdown?: string
    milestoneText?: string
    meName?: string
    otherName?: string
    meEmoji?: string
    otherEmoji?: string
    distanceText?: string
    distanceUpdated?: string
    memoryCaption?: string
    memoryDate?: string
    memoryImage?: string
    carousel?: { caption: string; date: string; image: string }[]
  }): Promise<void>
}

const WidgetBridge = registerPlugin<WidgetBridge>('WidgetBridge')

/** Reduce una foto ya cargada a una miniatura ligera para el widget. */
function shrinkForWidget(dataUrl: string, maxSide = 480, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onerror = () => resolve(dataUrl)
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.src = dataUrl
  })
}

/** Sólo se reenvían las fotos del carrusel cuando cambian de verdad: son las
 * más pesadas de preparar y no hace falta hacerlo en cada actualización. */
let lastCarouselFingerprint = ''

async function buildCarousel(
  state: AppState,
): Promise<{ caption: string; date: string; image: string }[] | undefined> {
  const photos = live(state.memories)
    .filter((m) => m.mediaId && (!m.mediaKind || m.mediaKind === 'foto'))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  const fingerprint = photos.map((p) => `${p.id}:${p.updatedAt}`).join(',')
  if (fingerprint === lastCarouselFingerprint) return undefined
  lastCarouselFingerprint = fingerprint

  const items: { caption: string; date: string; image: string }[] = []
  for (const p of photos) {
    const full = await loadMediaSynced(p.mediaId!, state.settings.sync)
    if (!full) continue
    items.push({ caption: p.caption ?? '', date: p.date, image: await shrinkForWidget(full, 480, 0.65) })
  }
  return items
}

/** Recalcula los textos de los tres widgets y se los manda al plugin nativo. */
export async function updateWidgets(state: AppState): Promise<void> {
  if (!native()) return

  const meP = profileOf(state, state.me)
  const other = state.me === 'a' ? 'b' : 'a'
  const otherP = profileOf(state, other)

  const days = daysTogether(state)
  const daysBreakdown = humanDuration(state.couple.anniversary)
  const next = nextMonthiversary(state)
  const milestoneText = `Cumplís ${next.months} ${next.months === 1 ? 'mes' : 'meses'} ${
    next.left === 0 ? 'hoy' : next.left === 1 ? 'mañana' : `en ${next.left} días`
  }`

  const mine = live(state.locations).find((l) => l.id === state.me)
  const theirs = live(state.locations).find((l) => l.id === other)
  let distanceText: string | undefined
  let distanceUpdated: string | undefined
  if (mine && theirs) {
    const km = distanceKm(mine, theirs)
    const dir = bearing(mine, theirs)
    distanceText = `${fmtDistance(km)} · ${otherP.name} está al ${compass(dir)}`
    distanceUpdated = new Date(Math.min(mine.at, theirs.at)).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const memory = live(state.memories)
    .filter((m) => m.mediaId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  let memoryImage: string | undefined
  if (memory?.mediaId) {
    const full = await loadMediaSynced(memory.mediaId, state.settings.sync)
    if (full) memoryImage = await shrinkForWidget(full)
  }

  const carousel = await buildCarousel(state)

  try {
    await WidgetBridge.update({
      daysNumber: String(days),
      daysBreakdown,
      milestoneText,
      meName: meP.name || 'Tú',
      otherName: otherP.name || 'Tu pareja',
      meEmoji: meP.emoji,
      otherEmoji: otherP.emoji,
      distanceText,
      distanceUpdated,
      memoryCaption: memory?.caption || undefined,
      memoryDate: memory ? memory.date : undefined,
      memoryImage,
      carousel,
    })
  } catch {
    /* el plugin no está disponible (p. ej. en el navegador) */
  }
}

/** Para no recalcular en cada tecla: solo una vez cada pocos segundos. */
let pending: number | undefined
export function scheduleWidgetUpdate(state: AppState): void {
  if (!native()) return
  window.clearTimeout(pending)
  pending = window.setTimeout(() => void updateWidgets(state), 4000)
}
