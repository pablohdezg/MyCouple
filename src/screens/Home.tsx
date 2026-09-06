import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Bar, Button, Card, Chip, Photo, Sheet, TextArea } from '../components/ui'
import { Suspense, lazy } from 'react'
import type { MapMarker } from '../components/LiveMap'

/** Leaflet pesa lo suyo: el mini mapa de la portada se carga aparte para que
 * la app abra rápido también en móviles lentos. */
const LiveMap = lazy(() => import('../components/LiveMap'))
import {
  agenda,
  appStreak,
  daysTogether,
  isMonthiversaryToday,
  moodToday,
  monthsTogether,
  nextMilestone,
  nextMonthiversary,
  nightStreak,
  onThisDay,
  profileOf,
  questionOfDay,
  questionStreak,
  unseenNudges,
  live,
} from '../store/derive'
import { ago, humanDuration, today, nightKey, fmtShort } from '../lib/dates'
import { LOVE_LINES, MOOD_FACES, NIGHT_LINES, NUDGES } from '../data/misc'
import { distanceKm, distanceMood, fmtDistance } from '../lib/geo'
import { seededIndex } from '../lib/utils'
import { haptic } from '../lib/native'

export default function Home() {
  const { state, add, patch, upsert, me, other, toast } = useStore()
  const { go } = useNav()
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  const meP = profileOf(state, me)
  const otherP = profileOf(state, other)
  const days = daysTogether(state)
  const ms = nextMilestone(state)
  const monthiversaryToday = isMonthiversaryToday(state)
  const monthCount = monthsTogether(state)
  const nextMonth = nextMonthiversary(state)
  const q = questionOfDay(state)
  const answers = live(state.dailyAnswers).find((a) => a.id === today())
  const iAnswered = !!answers?.[me]
  const bothAnswered = !!answers?.a && !!answers?.b
  const streak = questionStreak(state)
  const together = appStreak(state)
  const upcoming = useMemo(() => agenda(state, 400).slice(0, 3), [state])
  const myMood = moodToday(state, me)
  const theirMood = moodToday(state, other)
  const pending = unseenNudges(state)
  const line = LOVE_LINES[seededIndex(today(), LOVE_LINES.length)]

  const myLoc = live(state.locations).find((l) => l.id === me)
  const theirLoc = live(state.locations).find((l) => l.id === other)
  const km = myLoc && theirLoc ? distanceKm(myLoc, theirLoc) : null

  const flashback = useMemo(() => onThisDay(state)[0], [state])

  const nights = live(state.nights)
  const iSaidNight = nights.some((n) => n.id === `${nightKey()}:${me}`)
  const theySaidNight = nights.some((n) => n.id === `${nightKey()}:${other}`)
  const nStreak = nightStreak(state)
  const isNight = new Date().getHours() >= 20 || new Date().getHours() < 5

  const coupons = live(state.coupons).filter((c) => c.from === other && !c.redeemed)

  /** La última nota que te ha dejado la otra persona, y la última que dejaste tú. */
  const notes = live(state.notes).sort((a, b) => b.at - a.at)
  const noteForMe = notes.find((n) => n.author === other)
  const noteFromMe = notes.find((n) => n.author === me)

  const sendNote = () => {
    const t = noteText.trim()
    if (!t) return
    add('notes', { author: me, text: t, at: Date.now() })
    setNoteText('')
    setNoteOpen(false)
    void haptic('medium')
    toast(`Nota enviada a ${otherP.name} 💌`)
  }

  /** Marcadores del mini mapa de la portada. */
  const mapMarkers: MapMarker[] = []
  if (myLoc)
    mapMarkers.push({
      id: 'p-me', lat: myLoc.lat, lon: myLoc.lon, label: 'Tú', emoji: meP.emoji, kind: 'persona', mine: true,
    })
  if (theirLoc)
    mapMarkers.push({
      id: 'p-other', lat: theirLoc.lat, lon: theirLoc.lon, label: otherP.name, emoji: otherP.emoji, kind: 'persona',
    })

  const sayGoodNight = () => {
    upsert('nights', `${nightKey()}:${me}`, () => ({
      date: nightKey(),
      author: me,
      at: Date.now(),
      message: NIGHT_LINES[seededIndex(today() + me, NIGHT_LINES.length)],
    }))
    void haptic('medium')
    toast('Buenas noches 🌙')
  }

  const sendNudge = (emoji: string, label: string) => {
    add('nudges', { from: me, emoji, label, at: Date.now(), seen: false })
    add('messages', {
      author: me,
      text: `${emoji} ${label}`,
      createdAt: Date.now(),
      kind: 'nudge',
    })
    void haptic('medium')
    setNudgeOpen(false)
    toast(`Enviado a ${otherP.name} ${emoji}`)
  }

  return (
    <div className="page stack">
      {/* Hero */}
      <div className="hero">
        <div className="row-between">
          <div className="avatar-pair">
            <Avatar profile={state.couple.a} />
            <Avatar profile={state.couple.b} />
          </div>
          <div className="tiny" style={{ opacity: 0.9, textAlign: 'right' }}>
            {state.couple.title}
            {together >= 2 && (
              <div style={{ marginTop: 4, fontWeight: 700 }}>🔥 {together} días seguidos</div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.14em', opacity: 0.85, fontWeight: 700 }}>
            JUNTOS DESDE {fmtShort(state.couple.anniversary).toUpperCase()}
          </div>
          <div
            className="display"
            style={{ fontSize: 52, lineHeight: 1.05, marginTop: 4, fontWeight: 600 }}
          >
            {days.toLocaleString('es-ES')}
            <span style={{ fontSize: 20, marginLeft: 8 }}>días</span>
          </div>
          <div style={{ opacity: 0.92, fontSize: 14, marginTop: 2 }}>
            {humanDuration(state.couple.anniversary)}
          </div>
        </div>
        {ms && (
          <div style={{ marginTop: 18 }}>
            <div className="row-between tiny" style={{ opacity: 0.92, marginBottom: 6 }}>
              <span>{ms.label}</span>
              <span>faltan {ms.left} días</span>
            </div>
            <div
              style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.3)' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (days / ms.days) * 100)}%`,
                  borderRadius: 3,
                  background: '#fff',
                  transition: 'width .6s',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mesaniversario */}
      {monthiversaryToday ? (
        <Card className="soft center stack-sm">
          <div style={{ fontSize: 30 }}>🎉</div>
          <div className="display" style={{ fontSize: 19 }}>
            ¡Hoy cumplís {monthCount} {monthCount === 1 ? 'mes' : 'meses'}!
          </div>
          <div className="tiny muted">Un mesaniversario más para celebrar a vuestra manera</div>
        </Card>
      ) : (
        <div className="row-between" style={{ padding: '2px 4px' }}>
          <span className="tiny muted">
            Cumplís {nextMonth.months} {nextMonth.months === 1 ? 'mes' : 'meses'} el{' '}
            {fmtShort(nextMonth.date)}
          </span>
          <span className="tiny muted">
            {nextMonth.left === 1 ? 'mañana' : `en ${nextMonth.left} días`}
          </span>
        </div>
      )}

      {/* "Nuestro año" recién estrenado, tipo Spotify Wrapped */}
      {new Date().getMonth() === 0 && Number(state.couple.anniversary.slice(0, 4)) < new Date().getFullYear() && (
        <Card className="pressable" style={{ background: 'var(--grad)' }} onClick={() => go('resumen')}>
          <div className="row">
            <span style={{ fontSize: 28 }}>🎉</span>
            <div className="grow" style={{ color: 'var(--accent-ink)' }}>
              <div className="bold">Vuestro {new Date().getFullYear() - 1} ya está listo</div>
              <div className="tiny" style={{ opacity: 0.9 }}>
                El resumen de vuestro año, con todas las cifras
              </div>
            </div>
            <span style={{ color: 'var(--accent-ink)' }}>›</span>
          </div>
        </Card>
      )}

      {/* Avisos de pensando en ti */}
      {pending.length > 0 && (
        <Card
          className="soft"
          onClick={() => {
            pending.forEach((n) => patch('nudges', n.id, { seen: true }))
            go('chat')
          }}
        >
          <div className="row">
            <div style={{ fontSize: 28 }}>{pending[pending.length - 1].emoji}</div>
            <div className="grow">
              <div className="bold">{otherP.name} te ha escrito</div>
              <div className="small muted">{pending[pending.length - 1].label}</div>
            </div>
            <span className="badge">{pending.length}</span>
          </div>
        </Card>
      )}

      {/* Acciones rápidas */}
      <div className="row" style={{ gap: 10 }}>
        <Button block onClick={() => setNudgeOpen(true)}>
          💭 Pensando en ti
        </Button>
        <Button variant="ghost" onClick={() => go('citas')}>
          🎲
        </Button>
        <Button variant="ghost" onClick={() => go('mapa')}>
          🗺️
        </Button>
      </div>

      {/* Vales pendientes */}
      {coupons.length > 0 && (
        <Card className="tight" onClick={() => go('vales')}>
          <div className="row">
            <span style={{ fontSize: 24 }}>{coupons[0].emoji}</span>
            <div className="grow">
              <div className="bold small">
                Tienes {coupons.length} {coupons.length === 1 ? 'vale' : 'vales'} sin canjear
              </div>
              <div className="tiny muted nowrap">{coupons[0].title}</div>
            </div>
            <span className="muted">›</span>
          </div>
        </Card>
      )}

      {/* Hoy hace un año */}
      {flashback && (
        <Card className="stack-sm" onClick={() => go('recuerdos')}>
          <div className="row-between">
            <span className="eyebrow">
              Hoy hace {flashback.yearsAgo === 1 ? 'un año' : `${flashback.yearsAgo} años`}
            </span>
            <span style={{ fontSize: 15 }}>⏳</span>
          </div>
          {flashback.memories[0]?.mediaId ? (
            <div className="row">
              <div
                style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', flex: '0 0 auto' }}
              >
                <Photo id={flashback.memories[0].mediaId} />
              </div>
              <div className="grow small">
                <div className="bold">{flashback.memories[0].caption || 'Un recuerdo vuestro'}</div>
                {flashback.memories[0].place && (
                  <div className="tiny muted">{flashback.memories[0].place}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="small pre">
              {flashback.memories[0]?.caption ?? flashback.posts[0]?.text.slice(0, 140)}
            </div>
          )}
        </Card>
      )}

      {/* Pregunta del día */}
      <Card onClick={() => go('pregunta')} className="stack-sm">
        <div className="row-between">
          <span className="eyebrow">Pregunta del día</span>
          {streak > 0 && <span className="badge">🔥 {streak} días</span>}
        </div>
        <div className="display" style={{ fontSize: 18, lineHeight: 1.35 }}>
          {q.text}
        </div>
        <div className="row tiny muted" style={{ marginTop: 4 }}>
          {bothAnswered ? (
            <span className="accent bold">✓ Respondida por los dos · toca para leerla</span>
          ) : iAnswered ? (
            <span>Esperando a {otherP.name}…</span>
          ) : (
            <span className="accent bold">Toca para responder →</span>
          )}
        </div>
      </Card>

      {/* Ánimo */}
      <Card className="stack-sm" onClick={() => go('animo')}>
        <span className="eyebrow">¿Cómo estamos hoy?</span>
        <div className="row" style={{ justifyContent: 'space-around', marginTop: 4 }}>
          {[
            { p: meP, m: myMood, label: 'Tú' },
            { p: otherP, m: theirMood, label: otherP.name },
          ].map((x, i) => (
            <div key={i} className="center stack-sm" style={{ alignItems: 'center', flex: 1 }}>
              <Avatar profile={x.p} size="sm" />
              <div style={{ fontSize: 26 }}>{x.m ? MOOD_FACES[x.m.mood - 1] : '🫥'}</div>
              <div className="tiny muted">{x.m ? (x.m.tags[0] ?? 'registrado') : 'sin registrar'}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dónde estamos */}
      {mapMarkers.length > 0 ? (
        <Card className="stack-sm">
          <div className="row-between">
            <span className="eyebrow">Dónde estamos</span>
            <button className="tiny accent bold" onClick={() => go('mapa')}>
              Ver mapa entero
            </button>
          </div>
          <div onClick={() => go('mapa')} style={{ cursor: 'pointer' }}>
            <Suspense
              fallback={<div className="shimmer" style={{ height: 170, borderRadius: 16 }} />}
            >
              <LiveMap
                markers={mapMarkers}
                height={170}
                style={state.settings.dark ? 'noche' : 'calle'}
                interactive={false}
              />
            </Suspense>
          </div>
          <div className="row-between">
            <div>
              <div className="display" style={{ fontSize: 22 }}>
                {km !== null ? fmtDistance(km) : 'Sin la otra ubicación'}
              </div>
              <div className="tiny muted">
                {km !== null ? distanceMood(km) : `${otherP.name} aún no comparte la suya`}
              </div>
            </div>
            <div className="avatar-pair">
              <Avatar profile={meP} size="sm" />
              <Avatar profile={otherP} size="sm" />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="soft" onClick={() => go('mapa')}>
          <div className="row">
            <span style={{ fontSize: 26 }}>🗺️</span>
            <div className="grow">
              <div className="bold small">Ved dónde está cada uno</div>
              <div className="tiny muted">Activa el mapa y os veréis en tiempo real</div>
            </div>
            <span className="muted">›</span>
          </div>
        </Card>
      )}

      {/* Próximos eventos */}
      {upcoming.length > 0 && (
        <div className="stack-sm">
          <div className="row-between">
            <span className="eyebrow">Lo que viene</span>
            <button className="tiny accent bold" onClick={() => go('calendario')}>
              Ver agenda
            </button>
          </div>
          <div className="list">
            {upcoming.map((e) => (
              <button key={e.id + e.date} className="list-item" onClick={() => go('calendario')}>
                <span style={{ fontSize: 22 }}>{e.emoji}</span>
                <div className="grow">
                  <div className="bold small nowrap">{e.title}</div>
                  <div className="tiny muted">{fmtShort(e.date)}</div>
                </div>
                <span className="badge">
                  {e.daysLeft === 0 ? '¡hoy!' : e.daysLeft === 1 ? 'mañana' : `${e.daysLeft} d`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buenas noches */}
      {isNight && (
        <Card className="soft stack-sm">
          <div className="row-between">
            <span className="eyebrow">Buenas noches</span>
            {nStreak > 0 && <span className="badge">🌙 {nStreak} noches</span>}
          </div>
          {iSaidNight ? (
            <div className="row">
              <span style={{ fontSize: 24 }}>🌙</span>
              <div className="grow small muted">
                {theySaidNight
                  ? `${otherP.name} también se ha despedido. Que descanséis 💗`
                  : `Ya te has despedido. Esperando a ${otherP.name}…`}
              </div>
            </div>
          ) : (
            <>
              <p className="small muted">
                Un gesto de nada que, repetido, se convierte en algo vuestro.
              </p>
              <Button variant="soft" block onClick={sayGoodNight}>
                🌙 Darle las buenas noches
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Nota escrita a mano por la pareja */}
      <Card className="soft stack-sm">
        <div className="row-between">
          <span className="eyebrow">{noteForMe ? `Nota de ${otherP.name}` : 'Frase del día'}</span>
          <button
            className="tiny accent bold"
            onClick={() => {
              setNoteText(noteFromMe?.text ?? '')
              setNoteOpen(true)
            }}
          >
            ✏️ Escribirle una
          </button>
        </div>

        {noteForMe ? (
          <>
            <div className="display center" style={{ fontSize: 17, lineHeight: 1.45, marginTop: 4 }}>
              «{noteForMe.text}»
            </div>
            <div className="tiny muted center">{ago(noteForMe.at)}</div>
          </>
        ) : (
          <>
            <div className="display center" style={{ fontSize: 17, lineHeight: 1.45, marginTop: 4 }}>
              «{line}»
            </div>
            <div className="tiny muted center">
              Una frase distinta cada día. Cuando {otherP.name} te deje una nota, saldrá aquí en su
              lugar.
            </div>
          </>
        )}

        {noteFromMe && (
          <div
            className="tiny muted center"
            style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}
          >
            La tuya para {otherP.name}: «{noteFromMe.text}»
          </div>
        )}
      </Card>

      {/* Progreso de deseos */}
      {live(state.bucket).length > 0 && (
        <Card className="stack-sm" onClick={() => go('deseos')}>
          <div className="row-between">
            <span className="eyebrow">Lista de deseos</span>
            <span className="tiny muted">
              {live(state.bucket).filter((b) => b.done).length}/{live(state.bucket).length}
            </span>
          </div>
          <Bar
            pct={
              (live(state.bucket).filter((b) => b.done).length /
                Math.max(1, live(state.bucket).length)) *
              100
            }
          />
        </Card>
      )}

      {/* Accesos */}
      <div className="grid-3">
        {[
          { p: 'recuerdos', e: '📸', t: 'Recuerdos' },
          { p: 'juegos', e: '🎲', t: 'Juegos' },
          { p: 'mas', e: '✨', t: 'Todo' },
        ].map((x) => (
          <button key={x.p} className="tile" onClick={() => go(x.p)} style={{ alignItems: 'center' }}>
            <span className="ico">{x.e}</span>
            <span className="t">{x.t}</span>
          </button>
        ))}
      </div>

      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Una nota para él/ella">
        <div className="stack">
          <p className="small muted">
            Lo que escribas aquí aparecerá en la portada de {otherP.name} hasta que le escribas otra.
            Una frase, un recordatorio, un te quiero.
          </p>
          <TextArea
            value={noteText}
            onChange={setNoteText}
            rows={4}
            placeholder="Hoy me he acordado de ti cuando…"
          />
          <Button block onClick={sendNote} disabled={!noteText.trim()}>
            Dejarle la nota 💌
          </Button>
        </div>
      </Sheet>

      <Sheet open={nudgeOpen} onClose={() => setNudgeOpen(false)} title="Enviar un detalle">
        <p className="muted small" style={{ marginBottom: 14 }}>
          Un toque para que sepa que estás ahí. Aparecerá en vuestro chat.
        </p>
        <div className="chips">
          {NUDGES.map((n) => (
            <Chip key={n.label} onClick={() => sendNudge(n.emoji, n.label)}>
              {n.emoji} {n.label}
            </Chip>
          ))}
        </div>
      </Sheet>

      <div style={{ height: 4 }} />
      <div className="center tiny muted">
        💗 Hecho con cariño para {state.couple.a.name} y {state.couple.b.name}
      </div>
    </div>
  )
}
