import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, CollectionKey, Syncable, Who } from '../types'
import { emptyState, STATE_VERSION } from './initial'
import { mergeStates } from './merge'
import { configValid, pull, pullLive, push } from '../lib/sync'
import { now, uid } from '../lib/utils'
import { applyStatusBar, notifyNow, onResume } from '../lib/native'
import { scheduleWidgetUpdate } from '../lib/widgets'

const KEY = 'nuestro-rincon:state'
const SAVE_DEBOUNCE = 250
const SYNC_INTERVAL = 25_000

/**
 * Compara el estado antes y después de recibir datos remotos y avisa con
 * una notificación local si hay algo nuevo de la otra persona. Es la única
 * forma de "notificación de chat" posible sin un servidor de verdad detrás:
 * sólo dispara mientras la app está abierta (en primer o segundo plano, no
 * con el proceso totalmente cerrado) porque no hay un servicio de push.
 */
async function notifyNewFromPartner(before: AppState, after: AppState): Promise<void> {
  if (!after.settings.notifications) return
  const other = before.me === 'a' ? 'b' : 'a'
  const seenIds = new Set(before.messages.map((m) => m.id))
  const fresh = after.messages.filter(
    (m) => m.author === other && !m.deleted && !seenIds.has(m.id),
  )
  if (!fresh.length) return
  const last = fresh[fresh.length - 1]
  const name = after.couple[other].name
  const preview =
    last.kind === 'foto'
      ? '📷 Foto'
      : last.kind === 'video'
        ? '🎥 Vídeo'
        : last.kind === 'voz'
          ? '🎙️ Nota de voz'
          : last.kind === 'dibujo'
            ? '🎨 Dibujo'
            : last.kind === 'sticker'
              ? last.text
              : last.text
  void notifyNow(
    fresh.length === 1 ? name : `${name} · ${fresh.length} mensajes`,
    preview,
    9_000_000 + (Date.now() % 900_000),
  )
}

/** Avisa cuando la otra persona crea una partida nueva de un minijuego
 * (por ahora, "Enlaza letras") a la que todavía no te has unido. */
async function notifyGameInvite(before: AppState, after: AppState): Promise<void> {
  if (!after.settings.notifications) return
  const other = before.me === 'a' ? 'b' : 'a'
  const seenIds = new Set(before.wordGames.map((g) => g.id))
  const invites = after.wordGames.filter(
    (g) => !g.deleted && !seenIds.has(g.id) && g.startedBy === other,
  )
  if (!invites.length) return
  const g = invites[invites.length - 1]
  const name = after.couple[other].name
  void notifyNow(
    `${name} te invita a jugar 🔤`,
    `Enlaza letras · cuadrícula de ${g.size}×${g.size} · ${g.seconds}s`,
    9_100_000 + (Date.now() % 900_000),
  )
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as AppState
    return { ...emptyState(), ...parsed, version: STATE_VERSION }
  } catch {
    return emptyState()
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('No se pudo guardar el estado', e)
  }
}

type Updater = (s: AppState) => AppState

export interface StoreApi {
  state: AppState
  /** Actualiza el estado global (sella updatedAt automáticamente). */
  update: (fn: Updater) => void
  /** Añade un elemento a una colección; devuelve el id creado. */
  add: <K extends CollectionKey>(key: K, item: Omit<AppState[K][number], 'id' | 'updatedAt'>) => string
  /** Modifica un elemento por id. */
  patch: <K extends CollectionKey>(
    key: K,
    id: string,
    changes: Partial<AppState[K][number]>,
  ) => void
  /** Marca un elemento como borrado (tumba, para que el merge lo respete). */
  remove: (key: CollectionKey, id: string) => void
  /** Inserta o modifica por id (para claves deterministas: fechas, autores…). */
  upsert: <K extends CollectionKey>(
    key: K,
    id: string,
    make: (prev?: AppState[K][number]) => Partial<AppState[K][number]>,
  ) => void
  me: Who
  other: Who
  toast: (msg: string) => void
  syncNow: () => Promise<void>
  syncState: 'off' | 'idle' | 'working' | 'error'
  syncError?: string
  resetAll: () => void
  importState: (s: AppState) => void
}

const Ctx = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<StoreApi['syncState']>('off')
  const [syncError, setSyncError] = useState<string | undefined>()
  const stateRef = useRef(state)
  const saveTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)

  stateRef.current = state

  /* ---------- persistencia ---------- */
  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => save(state), SAVE_DEBOUNCE)
    return () => window.clearTimeout(saveTimer.current)
  }, [state])

  /* ---------- widgets de la pantalla de inicio ---------- */
  useEffect(() => {
    scheduleWidgetUpdate(state)
  }, [state])

  /* ---------- tema ---------- */
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-palette', state.settings.theme)
    root.setAttribute('data-dark', state.settings.dark ? '1' : '0')
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || '#fff6f4'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', bg)
    void applyStatusBar(state.settings.dark, bg)
  }, [state.settings.theme, state.settings.dark])

  const update = useCallback((fn: Updater) => {
    setState((prev) => ({ ...fn(prev), updatedAt: now() }))
  }, [])

  const add = useCallback(
    <K extends CollectionKey>(key: K, item: Omit<AppState[K][number], 'id' | 'updatedAt'>) => {
      const id = uid()
      setState((prev) => ({
        ...prev,
        [key]: [...(prev[key] as Syncable[]), { ...item, id, updatedAt: now() }],
        updatedAt: now(),
      }))
      return id
    },
    [],
  )

  const patch = useCallback(
    <K extends CollectionKey>(key: K, id: string, changes: Partial<AppState[K][number]>) => {
      setState((prev) => ({
        ...prev,
        [key]: (prev[key] as Syncable[]).map((x) =>
          x.id === id ? { ...x, ...changes, updatedAt: now() } : x,
        ),
        updatedAt: now(),
      }))
    },
    [],
  )

  const remove = useCallback((key: CollectionKey, id: string) => {
    setState((prev) => ({
      ...prev,
      [key]: (prev[key] as Syncable[]).map((x) =>
        x.id === id ? { ...x, deleted: true, updatedAt: now() } : x,
      ),
      updatedAt: now(),
    }))
  }, [])

  const upsert = useCallback(
    <K extends CollectionKey>(
      key: K,
      id: string,
      make: (prev?: AppState[K][number]) => Partial<AppState[K][number]>,
    ) => {
      setState((prev) => {
        const list = prev[key] as Syncable[]
        const existing = list.find((x) => x.id === id) as AppState[K][number] | undefined
        const next = existing
          ? list.map((x) => (x.id === id ? { ...x, ...make(existing), updatedAt: now() } : x))
          : [...list, { id, updatedAt: now(), ...make(undefined) } as Syncable]
        return { ...prev, [key]: next, updatedAt: now() }
      })
    },
    [],
  )

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600)
  }, [])

  /* ---------- sincronización ---------- */
  const syncNow = useCallback(async () => {
    const cfg = stateRef.current.settings.sync
    if (!cfg.enabled || !configValid(cfg)) {
      setSyncState('off')
      return
    }
    setSyncState('working')
    try {
      const before = stateRef.current
      const remote = await pull(cfg)
      let merged = before
      if (remote) {
        merged = mergeStates(before, remote)
        setState(merged)
        void notifyNewFromPartner(before, merged)
        void notifyGameInvite(before, merged)
      }
      await push(cfg, merged)

      // La posición viaja por su propia tabla, no dentro del estado: es lo
      // que permite que el servicio de Android la actualice con la app
      // cerrada. Aquí la recogemos para pintarla en el mapa.
      const pings = await pullLive(cfg)
      if (pings.length) {
        setState((prev) => {
          let changed = false
          const locations = [...prev.locations]
          for (const p of pings) {
            if (p.who !== 'a' && p.who !== 'b') continue
            const at = Date.parse(p.at)
            if (!Number.isFinite(at)) continue
            const i = locations.findIndex((l) => l.id === p.who)
            if (i >= 0 && (locations[i].at ?? 0) >= at) continue
            const fresh = {
              id: p.who,
              updatedAt: at,
              who: p.who,
              lat: p.lat,
              lon: p.lon,
              accuracy: p.accuracy ?? undefined,
              battery: p.battery ?? undefined,
              at,
            }
            if (i >= 0) locations[i] = fresh
            else locations.push(fresh)
            changed = true
          }
          return changed ? { ...prev, locations } : prev
        })
      }

      setSyncError(undefined)
      setSyncState('idle')
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, sync: { ...prev.settings.sync, lastSync: now() } },
      }))
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Error de sincronización')
      setSyncState('error')
    }
  }, [])

  const syncEnabled = state.settings.sync.enabled
  useEffect(() => {
    if (!syncEnabled) {
      setSyncState('off')
      return
    }
    void syncNow()
    const t = window.setInterval(() => void syncNow(), SYNC_INTERVAL)
    return () => window.clearInterval(t)
  }, [syncEnabled, syncNow])

  useEffect(() => {
    void onResume(() => {
      if (stateRef.current.settings.sync.enabled) void syncNow()
    })
  }, [syncNow])

  const resetAll = useCallback(() => {
    localStorage.removeItem(KEY)
    setState(emptyState())
  }, [])

  const importState = useCallback((incoming: AppState) => {
    setState((prev) => mergeStates(prev, incoming))
  }, [])

  const api = useMemo<StoreApi>(
    () => ({
      state,
      update,
      add,
      patch,
      remove,
      upsert,
      me: state.me,
      other: state.me === 'a' ? 'b' : 'a',
      toast,
      syncNow,
      syncState,
      syncError,
      resetAll,
      importState,
    }),
    [
      state,
      update,
      add,
      patch,
      remove,
      upsert,
      toast,
      syncNow,
      syncState,
      syncError,
      resetAll,
      importState,
    ],
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore fuera del StoreProvider')
  return ctx
}
