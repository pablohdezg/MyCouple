/** Geometría de la esfera y proyección Web Mercator, sin dependencias. */

export interface LatLon {
  lat: number
  lon: number
}

const R = 6371 // radio terrestre en km
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Distancia en kilómetros entre dos puntos (fórmula del haversine). */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Rumbo inicial de a hacia b, en grados desde el norte. */
export function bearing(a: LatLon, b: LatLon): number {
  const dLon = rad(b.lon - a.lon)
  const y = Math.sin(dLon) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLon)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

const ROSA = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']

export function compass(deg: number): string {
  return ROSA[Math.round(deg / 45) % 8]
}

export function fmtDistance(km: number): string {
  if (km < 0.1) return `${Math.round(km * 1000)} m`
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km).toLocaleString('es-ES')} km`
}

/** Una frase con gracia para la distancia que os separa. */
export function distanceMood(km: number): string {
  if (km < 0.05) return 'Estáis juntos 💗'
  if (km < 0.5) return 'A un paseo de nada'
  if (km < 3) return 'En el mismo barrio'
  if (km < 25) return 'En la misma ciudad'
  if (km < 150) return 'Un ratito de coche'
  if (km < 700) return 'Un viaje, pero se hace'
  if (km < 3000) return 'Un vuelo os separa'
  return 'Al otro lado del mundo'
}

/** Tiempo aproximado andando / en coche. */
export function travelTime(km: number): string {
  if (km < 2) return `${Math.max(1, Math.round((km / 4.8) * 60))} min andando`
  if (km < 400) return `${(km / 80).toFixed(1).replace('.', ',')} h en coche`
  return `${(km / 750 + 1.5).toFixed(1).replace('.', ',')} h en avión`
}

/* ---------- Proyección Web Mercator ---------- */

export interface Point {
  x: number
  y: number
}

/** Coordenadas en píxeles del mundo para un nivel de zoom dado. */
export function project({ lat, lon }: LatLon, z: number): Point {
  const size = 256 * 2 ** z
  const x = ((lon + 180) / 360) * size
  const s = Math.sin(rad(Math.max(-85.05, Math.min(85.05, lat))))
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size
  return { x, y }
}

export function unproject({ x, y }: Point, z: number): LatLon {
  const size = 256 * 2 ** z
  const lon = (x / size) * 360 - 180
  const n = Math.PI - 2 * Math.PI * (y / size)
  const lat = deg(Math.atan(Math.sinh(n)))
  return { lat, lon }
}

/** Punto medio y zoom que encuadra todos los puntos dados. */
export function fitView(points: LatLon[], w: number, h: number): { center: LatLon; zoom: number } {
  if (!points.length) return { center: { lat: 40.4, lon: -3.7 }, zoom: 5 }
  if (points.length === 1) return { center: points[0], zoom: 14 }

  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  }
  for (let z = 17; z >= 1; z--) {
    const pts = points.map((p) => project(p, z))
    const dx = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x))
    const dy = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))
    if (dx < w * 0.72 && dy < h * 0.66) return { center, zoom: z }
  }
  return { center, zoom: 1 }
}

/** Hora local aproximada en un punto, estimada por su longitud. */
export function localTimeAt(lon: number, at = Date.now()): string {
  const offsetHours = Math.round(lon / 15)
  const d = new Date(at + (offsetHours * 60 + new Date().getTimezoneOffset()) * 60000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface Fix {
  coords: { latitude: number; longitude: number; accuracy?: number }
}

/**
 * Pide la posición al dispositivo. Dentro del APK usa el plugin de
 * Capacitor (que gestiona los permisos de Android) y en el navegador la
 * API estándar.
 */
export async function getPosition(): Promise<Fix> {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (cap?.isNativePlatform?.()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const perm = await Geolocation.checkPermissions()
    if (perm.location !== 'granted') {
      const asked = await Geolocation.requestPermissions()
      if (asked.location !== 'granted') {
        const err = new Error('Permiso denegado') as Error & { code: number }
        err.code = 1
        throw err
      }
    }
    return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este dispositivo no tiene GPS'))
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    })
  })
}

export function geoErrorMessage(e: unknown): string {
  const code = (e as GeolocationPositionError)?.code
  if (code === 1) return 'Has denegado el permiso de ubicación'
  if (code === 2) return 'No se ha podido determinar tu posición'
  if (code === 3) return 'El GPS ha tardado demasiado. Inténtalo de nuevo'
  return e instanceof Error ? e.message : 'No se ha podido obtener la ubicación'
}
