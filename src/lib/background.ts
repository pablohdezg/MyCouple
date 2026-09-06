import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { native } from './native'

/**
 * Ubicación en segundo plano.
 *
 * Habla con el plugin nativo propio (`LocationSharingPlugin.java`), que
 * levanta un servicio en primer plano de Android. Mientras está activo, el
 * sistema mantiene la app viva aunque la cierres, y por eso aparece una
 * notificación permanente: es un requisito de Android, no un capricho. Sin
 * ella el sistema mata el proceso a los pocos minutos.
 */

export interface BackgroundFix {
  lat: number
  lon: number
  accuracy?: number
  at: number
}

interface LocationSharingPlugin {
  start(options: {
    title?: string
    text?: string
    intervalMs?: number
    distanceM?: number
  }): Promise<{ started: boolean }>
  stop(): Promise<{ started: boolean }>
  isRunning(): Promise<{ running: boolean }>
  getLast(): Promise<{ available: boolean } & Partial<BackgroundFix>>
  configure(options: {
    url?: string
    key?: string
    code?: string
    me?: string
    otherName?: string
    places?: string
  }): Promise<{ ok: boolean }>
  batteryStatus(): Promise<{ exempt: boolean; needed: boolean }>
  requestBatteryExemption(): Promise<{ exempt: boolean }>
  addListener(
    event: 'location',
    fn: (fix: BackgroundFix) => void,
  ): Promise<PluginListenerHandle>
}

const LocationSharing = registerPlugin<LocationSharingPlugin>('LocationSharing')

let listener: PluginListenerHandle | null = null

/** Se suscribe a las posiciones que envía el servicio. */
export async function onBackgroundFix(fn: (fix: BackgroundFix) => void): Promise<void> {
  if (!native()) return
  try {
    await listener?.remove()
    listener = await LocationSharing.addListener('location', fn)
  } catch {
    /* el plugin no está disponible */
  }
}

export async function isBackgroundRunning(): Promise<boolean> {
  if (!native()) return false
  try {
    const { running } = await LocationSharing.isRunning()
    return running
  } catch {
    return false
  }
}

/**
 * Arranca el seguimiento en segundo plano.
 * - `intervalMs`: cada cuánto puede avisar como mucho.
 * - `distanceM`: metros que hay que moverse para que avise.
 *   Filtrar por distancia ahorra muchísima batería frente a un temporizador
 *   fijo, porque estando quieto no gasta casi nada.
 */
export async function startBackgroundLocation(
  otherName: string,
  intervalMs = 3 * 60 * 1000,
  distanceM = 50,
): Promise<{ ok: boolean; error?: string }> {
  if (!native()) {
    return { ok: false, error: 'Esto sólo funciona en la app instalada, no en el navegador' }
  }
  try {
    await LocationSharing.start({
      title: 'MyCouple · compartiendo tu ubicación',
      text: `${otherName} puede ver dónde estás. Toca para abrir.`,
      intervalMs,
      distanceM,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('NO_LOCATION_PERMISSION') || msg.toLowerCase().includes('permis')) {
      return { ok: false, error: 'Necesito permiso de ubicación para poder compartirla' }
    }
    return { ok: false, error: 'No se pudo activar el segundo plano' }
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  if (!native()) return
  try {
    await LocationSharing.stop()
  } catch {
    /* ya estaba parado */
  }
}

/**
 * Le da al servicio nativo todo lo que necesita para trabajar solo:
 * credenciales de sincronización, quién es quién y vuestros lugares.
 *
 * Sin esto el servicio tomaría posiciones pero no sabría dónde subirlas
 * cuando la app no está abierta, que era justo el problema de antes.
 */
export async function configureBackgroundLocation(options: {
  url: string
  key: string
  code: string
  me: string
  otherName: string
  places: { name: string; emoji: string; lat: number; lon: number; radius: number }[]
}): Promise<void> {
  if (!native()) return
  try {
    await LocationSharing.configure({
      url: options.url,
      key: options.key,
      code: options.code,
      me: options.me,
      otherName: options.otherName,
      places: JSON.stringify(options.places),
    })
  } catch {
    /* versión antigua del plugin */
  }
}

/** ¿Está la app a salvo de que el sistema mate el servicio? */
export async function batteryExemptionStatus(): Promise<{ exempt: boolean; needed: boolean }> {
  if (!native()) return { exempt: true, needed: false }
  try {
    return await LocationSharing.batteryStatus()
  } catch {
    return { exempt: true, needed: false }
  }
}

/** Abre el diálogo del sistema para quitar la optimización de batería. */
export async function requestBatteryExemption(): Promise<void> {
  if (!native()) return
  try {
    await LocationSharing.requestBatteryExemption()
  } catch {
    /* el fabricante no expone ese diálogo */
  }
}

/** Última posición que guardó el servicio, si la hay. */
export async function lastBackgroundFix(): Promise<BackgroundFix | null> {
  if (!native()) return null
  try {
    const r = await LocationSharing.getLast()
    if (!r.available || r.lat == null || r.lon == null) return null
    return { lat: r.lat, lon: r.lon, accuracy: r.accuracy, at: r.at ?? Date.now() }
  } catch {
    return null
  }
}
