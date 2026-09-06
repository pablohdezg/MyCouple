import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from './store/store'
import { useNav } from './router'
import { ACHIEVEMENTS } from './data/misc'
import { hideSplash, notifyNow, onBackButton, scheduleReminders } from './lib/native'
import { agenda, live, unseenNudges } from './store/derive'
import { parse, today } from './lib/dates'
import { getPosition } from './lib/geo'
import {
  configureBackgroundLocation,
  isBackgroundRunning,
  lastBackgroundFix,
  onBackgroundFix,
  startBackgroundLocation,
  stopBackgroundLocation,
} from './lib/background'
import { configValid, pushLive } from './lib/sync'
import { ensureUploaded } from './lib/storage'
import { native } from './lib/native'
import { Hearts } from './components/ui'
import Lock from './screens/Lock'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Wall from './screens/Wall'
import Chat from './screens/Chat'
import More from './screens/More'

const CalendarScreen = lazy(() => import('./screens/Calendar'))
const DailyQuestion = lazy(() => import('./screens/DailyQuestion'))
const Memories = lazy(() => import('./screens/Memories'))
const Bucket = lazy(() => import('./screens/Bucket'))
const DateIdeas = lazy(() => import('./screens/DateIdeas'))
const Lists = lazy(() => import('./screens/Lists'))
const Chores = lazy(() => import('./screens/Chores'))
const Expenses = lazy(() => import('./screens/Expenses'))
const Mood = lazy(() => import('./screens/Mood'))
const LoveLanguages = lazy(() => import('./screens/LoveLanguages'))
const Games = lazy(() => import('./screens/Games'))
const Letters = lazy(() => import('./screens/Letters'))
const Gratitude = lazy(() => import('./screens/Gratitude'))
const Achievements = lazy(() => import('./screens/Achievements'))
const Countdowns = lazy(() => import('./screens/Countdowns'))
const Settings = lazy(() => import('./screens/Settings'))
const MapScreen = lazy(() => import('./screens/MapScreen'))
const Coupons = lazy(() => import('./screens/Coupons'))
const Wrapped = lazy(() => import('./screens/Wrapped'))
const Repair = lazy(() => import('./screens/Repair'))
const Wordle = lazy(() => import('./screens/Wordle'))
const WordGrid = lazy(() => import('./screens/WordGrid'))
const Minigames = lazy(() => import('./screens/Minigames'))

const TABS = [
  { path: 'inicio', ico: '🏠', label: 'Inicio' },
  { path: 'muro', ico: '📔', label: 'Nuestro muro' },
  { path: 'chat', ico: '💬', label: 'Chat' },
  { path: 'mapa', ico: '🗺️', label: 'Mapa' },
  { path: 'mas', ico: '✨', label: 'Más' },
]

const SCREENS: Record<string, React.ComponentType> = {
  inicio: Home,
  muro: Wall,
  chat: Chat,
  calendario: CalendarScreen,
  mas: More,
  pregunta: DailyQuestion,
  recuerdos: Memories,
  deseos: Bucket,
  citas: DateIdeas,
  listas: Lists,
  tareas: Chores,
  gastos: Expenses,
  animo: Mood,
  lenguajes: LoveLanguages,
  juegos: Games,
  cartas: Letters,
  gratitud: Gratitude,
  logros: Achievements,
  cuentaatras: Countdowns,
  ajustes: Settings,
  mapa: MapScreen,
  vales: Coupons,
  resumen: Wrapped,
  paces: Repair,
  wordle: Wordle,
  enlaza: WordGrid,
  minijuegos: Minigames,
}

/** Cada cuánto se refresca la posición con el reparto activado. */
const LOCATION_INTERVAL = 4 * 60 * 1000

export default function App() {
  const { state, update, upsert, add, me, other, toast, syncNow } = useStore()
  const { path, go, back } = useNav()
  const [unlocked, setUnlocked] = useState(!state.settings.pin)
  const [celebrate, setCelebrate] = useState(false)
  const lastLocation = useRef(0)
  /** Config de sincronización siempre al día, para usarla dentro de
   * callbacks que no se vuelven a crear en cada render. */
  const syncCfg = useRef(state.settings.sync)
  syncCfg.current = state.settings.sync

  useEffect(() => {
    void hideSplash()
  }, [])

  /* Si la app se queda abierta y pasa la medianoche, hay que repintar: si no,
     la pregunta del día, el ánimo o las buenas noches se quedan mostrando lo
     de ayer hasta que tocas algo. */
  const [day, setDay] = useState(today)
  useEffect(() => {
    const t = setInterval(() => setDay(today()), 60_000)
    return () => clearInterval(t)
  }, [])
  void day

  /* Sella la visita de hoy, para la racha de días seguidos usando la app. */
  useEffect(() => {
    const already = live(state.visits).some((v) => v.author === me && v.date === today())
    if (!already) add('visits', { date: today(), author: me })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Botón atrás de Android */
  useEffect(() => {
    void onBackButton(() => {
      if (window.location.hash.replace(/^#\/?/, '') !== 'inicio') {
        back()
        return true
      }
      return false
    })
  }, [back])

  /* Desbloqueo de logros */
  useEffect(() => {
    const have = new Set(state.achievements.map((a) => a.id))
    const won = ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(state))
    if (!won.length) return
    update((s) => ({
      ...s,
      achievements: [...s.achievements, ...won.map((w) => ({ id: w.id, at: Date.now() }))],
    }))
    setCelebrate(true)
    toast(`${won[0].emoji} ¡Logro desbloqueado: ${won[0].name}!`)
    const t = setTimeout(() => setCelebrate(false), 3600)
    return () => clearTimeout(t)
  }, [state, update, toast])

  /* "Nuestro año en resumen": avisa una vez cuando empieza un año nuevo de
     que el resumen del anterior ya está listo para verlo, al estilo
     Spotify Wrapped. */
  useEffect(() => {
    const startYear = Number(state.couple.anniversary.slice(0, 4))
    const previousYear = new Date().getFullYear() - 1
    if (previousYear < startYear) return
    if (state.wrappedYearsNotified.includes(previousYear)) return
    update((s) => ({
      ...s,
      wrappedYearsNotified: [...s.wrappedYearsNotified, previousYear],
    }))
    if (state.settings.notifications) {
      void notifyNow(
        `🎉 Vuestro ${previousYear} ya está listo`,
        'Vuestro año en resumen os espera en la app, con todas las cifras.',
        9_200_000 + (previousYear % 900_000),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.couple.anniversary, state.wrappedYearsNotified])

  /* Recordatorios locales */
  useEffect(() => {
    if (!state.settings.notifications) {
      void scheduleReminders([])
      return
    }
    const items = agenda(state, 120).slice(0, 40)
    void scheduleReminders(
      items.flatMap((e, i) => {
        const at = parse(e.date)
        at.setHours(9, 0, 0, 0)
        const out = [{ id: 1000 + i, title: `${e.emoji} ${e.title}`, body: '¡Es hoy!', at }]
        const before = parse(e.date)
        before.setDate(before.getDate() - 1)
        before.setHours(20, 0, 0, 0)
        out.push({ id: 5000 + i, title: `${e.emoji} ${e.title}`, body: 'Es mañana 💗', at: before })
        return out
      }),
    )
  }, [state])

  const sharing = state.settings.shareLocation
  const otherName = state.couple[other].name

  /* Las fotos de perfil se eligen en el primer paso de la app, cuando aún no
     hay sincronización configurada, así que se quedaban sólo en ese móvil.
     En cuanto hay conexión, nos aseguramos de subirlas. */
  useEffect(() => {
    const cfg = state.settings.sync
    if (!cfg.enabled || !configValid(cfg)) return
    for (const who of ['a', 'b'] as const) {
      const id = state.couple[who].photoId
      if (id) void ensureUploaded(id, cfg)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.sync.enabled, state.couple.a.photoId, state.couple.b.photoId])

  /* El servicio nativo necesita saber a dónde subir la posición y cuáles
     son vuestros lugares, porque lo hace él solo con la app cerrada. Se lo
     recordamos siempre que cambie algo de eso. */
  const syncSignature = JSON.stringify(state.settings.sync)
  const placesSignature = JSON.stringify(
    live(state.places).map((p) => ({
      name: p.name,
      emoji: p.emoji,
      lat: p.lat,
      lon: p.lon,
      radius: p.radius,
    })),
  )
  useEffect(() => {
    if (!native()) return
    const cfg = state.settings.sync
    if (!cfg.enabled || !configValid(cfg)) return
    void configureBackgroundLocation({
      url: cfg.url,
      key: cfg.key,
      code: cfg.code,
      me,
      otherName,
      places: JSON.parse(placesSignature),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncSignature, placesSignature, me, otherName])

  /* ---------- Reparto de ubicación ----------
     En la app instalada lo lleva un servicio de Android que sigue vivo con
     la app cerrada. En el navegador, donde eso no existe, se refresca
     mientras la pestaña esté abierta. */
  useEffect(() => {
    const save = (fix: { lat: number; lon: number; accuracy?: number; at: number }) => {
      lastLocation.current = Date.now()
      upsert('locations', me, () => ({
        who: me,
        lat: fix.lat,
        lon: fix.lon,
        accuracy: fix.accuracy,
        at: fix.at,
      }))
      // A la tabla de posiciones, que es de donde lee el otro móvil aunque
      // tenga la app cerrada. En la app instalada de esto ya se encarga el
      // servicio nativo (y además añade la batería), así que aquí sólo lo
      // hacemos desde el navegador para no pisarle la fila.
      const cfg = syncCfg.current
      if (!native() && cfg.enabled && configValid(cfg)) {
        void pushLive(cfg, { who: me, lat: fix.lat, lon: fix.lon, accuracy: fix.accuracy })
      }
      // Y una sincronización normal, para lo demás.
      void syncNow()
    }

    if (!sharing) {
      void stopBackgroundLocation()
      return
    }

    let alive = true

    if (native()) {
      void onBackgroundFix((fix) => alive && save(fix))
      void startBackgroundLocation(otherName).then(async (res) => {
        if (!alive) return
        if (!res.ok) {
          update((st) => ({ ...st, settings: { ...st.settings, shareLocation: false } }))
          if (res.error) toast(res.error)
          return
        }
        // Si el servicio ya venía corriendo de antes, recuperamos su última
        // posición para no esperar al siguiente aviso.
        const last = await lastBackgroundFix()
        if (last && alive) save(last)
      })
      return () => {
        alive = false
      }
    }

    // Navegador: sondeo mientras la página está abierta.
    const ping = async () => {
      if (!alive || Date.now() - lastLocation.current < LOCATION_INTERVAL - 5000) return
      try {
        const pos = await getPosition()
        save({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          at: Date.now(),
        })
      } catch {
        /* sin permiso o sin señal: se reintenta más tarde */
      }
    }
    void ping()
    const t = window.setInterval(() => void ping(), LOCATION_INTERVAL)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [sharing, me, otherName, upsert, update, syncNow, toast])

  /* Si el servicio quedó corriendo de una sesión anterior pero el ajuste
     está apagado, lo paramos: nadie debe compartir sin querer. */
  useEffect(() => {
    if (state.settings.shareLocation) return
    void isBackgroundRunning().then((on) => {
      if (on) void stopBackgroundLocation()
    })
  }, [state.settings.shareLocation])

  const nudges = useMemo(() => unseenNudges(state), [state])

  if (!state.onboarded) return <Onboarding />
  if (state.settings.pin && !unlocked) return <Lock onOk={() => setUnlocked(true)} />

  const Screen = SCREENS[path] ?? Home
  const isTab = TABS.some((t) => t.path === path)

  return (
    <div className="app">
      {/* Las pantallas pesadas se cargan sólo al entrar en ellas: así la app
          arranca mucho antes en móviles justitos. */}
      <Suspense fallback={<div className="page center muted small" style={{ paddingTop: 40 }}>Cargando…</div>}>
        <Screen />
      </Suspense>
      <Hearts show={celebrate} />
      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.path}
            className={`nav-item ${path === t.path || (!isTab && t.path === 'mas') ? 'on' : ''}`}
            onClick={() => go(t.path)}
          >
            <span className="ico">{t.ico}</span>
            {t.label}
            {t.path === 'chat' && nudges.length > 0 && <i className="nav-dot" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
