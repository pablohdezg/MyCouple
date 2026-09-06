import type { AppState } from '../types'

/**
 * Sincronización opcional entre los dos móviles.
 *
 * Usa la API REST de Supabase directamente (sin dependencias): basta con
 * crear un proyecto gratuito, ejecutar el SQL de `supabase.sql` y pegar la
 * URL + la clave anon en Ajustes. El "código de pareja" es la contraseña
 * compartida que identifica vuestra fila.
 *
 * Sin configurar nada, la app funciona al 100 % en local.
 */

export interface SyncConfig {
  url: string
  key: string
  code: string
}

const TABLE = 'pares'

function endpoint(cfg: SyncConfig, qs = '') {
  return `${cfg.url.replace(/\/+$/, '')}/rest/v1/${TABLE}${qs}`
}

function headers(cfg: SyncConfig, extra: Record<string, string> = {}) {
  return {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export function configValid(cfg: Partial<SyncConfig> | undefined): cfg is SyncConfig {
  return !!(cfg && cfg.url && cfg.key && cfg.code && /^https?:\/\//.test(cfg.url))
}

/** Descarga el estado remoto (o null si aún no existe). */
export async function pull(cfg: SyncConfig): Promise<AppState | null> {
  const res = await fetch(
    endpoint(cfg, `?code=eq.${encodeURIComponent(cfg.code)}&select=data&limit=1`),
    { headers: headers(cfg) },
  )
  if (!res.ok) throw new Error(`Error al descargar (${res.status})`)
  const rows = (await res.json()) as { data: AppState }[]
  return rows[0]?.data ?? null
}

/** Sube el estado (upsert por código). */
export async function push(cfg: SyncConfig, state: AppState): Promise<void> {
  const body = JSON.stringify([
    { code: cfg.code, data: stripHeavy(state), updated_at: new Date().toISOString() },
  ])
  const res = await fetch(endpoint(cfg), {
    method: 'POST',
    headers: headers(cfg, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body,
  })
  if (!res.ok) throw new Error(`Error al subir (${res.status})`)
}

/** Comprueba credenciales sin escribir nada. */
export async function testConnection(cfg: SyncConfig): Promise<void> {
  const res = await fetch(endpoint(cfg, '?select=code&limit=1'), { headers: headers(cfg) })
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'No existe la tabla "pares". Ejecuta el SQL de supabase.sql.'
        : `Conexión rechazada (${res.status}). Revisa la URL y la clave.`,
    )
  }
  // La tabla de ubicación en vivo es más nueva: si falta, la app funciona
  // igual pero la ubicación deja de actualizarse con la app cerrada, así
  // que conviene decirlo en vez de fallar en silencio.
  if (!(await liveTableExists(cfg))) {
    throw new Error(
      'Conecta bien, pero falta la tabla "ubicaciones". Vuelve a ejecutar supabase.sql para que la ubicación funcione con la app cerrada.',
    )
  }
}

/** ¿Está creada ya la tabla de ubicación en vivo? */
export async function liveTableExists(cfg: SyncConfig): Promise<boolean> {
  try {
    const res = await fetch(liveEndpoint(cfg, '?select=who&limit=1'), { headers: headers(cfg) })
    return res.ok
  } catch {
    return false
  }
}

/* ---------- Ubicación en vivo ----------
   Tabla aparte y diminuta ("ubicaciones"), en vez de meter la posición en
   el JSON gigante de "pares". Así el servicio de Android puede escribirla
   él solo, con la app cerrada, sin descargar y volver a subir el estado
   entero cada pocos minutos.

   Todo esto falla en silencio a propósito: si todavía no habéis ejecutado
   la parte nueva de supabase.sql, la app sigue funcionando igual que antes
   en vez de romperse. */

export interface LivePing {
  who: 'a' | 'b'
  lat: number
  lon: number
  accuracy?: number | null
  battery?: number | null
  at: string
}

function liveEndpoint(cfg: SyncConfig, qs = '') {
  return `${cfg.url.replace(/\/+$/, '')}/rest/v1/ubicaciones${qs}`
}

/** Últimas posiciones de los dos, tal y como las dejó cada móvil. */
export async function pullLive(cfg: SyncConfig): Promise<LivePing[]> {
  try {
    const res = await fetch(
      liveEndpoint(cfg, `?code=eq.${encodeURIComponent(cfg.code)}&select=*`),
      { headers: headers(cfg) },
    )
    if (!res.ok) return []
    return (await res.json()) as LivePing[]
  } catch {
    return []
  }
}

/** Sube nuestra posición actual. */
export async function pushLive(
  cfg: SyncConfig,
  ping: { who: 'a' | 'b'; lat: number; lon: number; accuracy?: number; battery?: number },
): Promise<void> {
  try {
    await fetch(liveEndpoint(cfg), {
      method: 'POST',
      headers: headers(cfg, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([
        {
          code: cfg.code,
          who: ping.who,
          lat: ping.lat,
          lon: ping.lon,
          accuracy: ping.accuracy ?? null,
          battery: ping.battery ?? null,
          at: new Date().toISOString(),
        },
      ]),
    })
  } catch {
    /* sin conexión o sin la tabla creada todavía */
  }
}

/** Las fotos viven en IndexedDB de cada móvil: no se envían. */
function stripHeavy(state: AppState): AppState {
  return { ...state, settings: { ...state.settings, sync: { ...state.settings.sync, key: '' } } }
}
