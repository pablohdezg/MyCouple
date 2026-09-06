import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Card, Chip, Head } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { haptic } from '../lib/native'
import { shuffle } from '../lib/utils'
import {
  GRID_SIZES,
  TIME_OPTIONS,
  areAdjacent,
  isWord,
  randomGrid,
  wordFromPath,
} from '../lib/wordgrid'
import type { AppState, WordGame, Who } from '../types'

type Banner = { kind: 'found' | 'dup' | 'bad'; text: string; seq: number }

/** Margen entre que alguien da a "empezar" y el pistoletazo de salida: lo
 * justo para que la señal llegue al otro móvil y los dos arranquen juntos. */
const COUNTDOWN_MS = 12_000

export default function WordGrid() {
  const { state, add, patch, upsert, me, other, syncNow } = useStore()
  const { back } = useNav()

  const games = useMemo(
    () => live(state.wordGames).sort((a, b) => b.createdAt - a.createdAt),
    [state.wordGames],
  )
  const game = games[0]

  const [size, setSize] = useState<number>(5)
  const [seconds, setSeconds] = useState<number>(120)
  /** Reloj propio, para ir repintando la cuenta atrás. */
  const [now, setNow] = useState(() => Date.now())

  const startGame = () => {
    add('wordGames', {
      size,
      seconds,
      grid: randomGrid(size),
      startedBy: me,
      createdAt: Date.now(),
      [me === 'a' ? 'joinedA' : 'joinedB']: true,
    })
    void syncNow()
  }

  /* Mientras estemos en esta pantalla esperando al otro, sincronizamos más a
     menudo que los 25 segundos de siempre: si no, unirse o empezar una
     partida tardaba media vida en llegar al otro móvil. */
  const waiting = !!game && (!game.startAt || game.startAt > now)
  useEffect(() => {
    if (!waiting) return
    const t = setInterval(() => void syncNow(), 3000)
    return () => clearInterval(t)
  }, [waiting, syncNow])

  /* Un tic de reloj para la cuenta atrás. Sólo mientras haga falta: no tiene
     sentido repintar cuatro veces por segundo si la partida ya terminó. */
  const needsClock = !!game && (!game[me] || !game[other])
  useEffect(() => {
    if (!needsClock) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [needsClock])

  /* Si se acabó el tiempo sin que llegáramos a entregar (por cerrar la app a
     media partida), damos la partida por jugada con lo que hubiera, para que
     el recuento no se quede esperando eternamente.
     El margen de gracia es importante: sin él, esto entregaba una lista vacía
     justo a la vez que la pantalla de juego entregaba las palabras buenas, y
     según cuál llegara última se perdían todas. */
  const GRACE = 6000
  const pendingId =
    game && game.startAt && !game[me] && now >= game.startAt + game.seconds * 1000 + GRACE
      ? game.id
      : null
  useEffect(() => {
    if (!pendingId) return
    upsert('wordGames', pendingId, (prev) => ({
      ...prev,
      [me]: { words: [], finishedAt: Date.now() },
    }))
    void syncNow()
  }, [pendingId, me, upsert, syncNow])

  if (!game) {
    return (
      <div className="page stack">
        <Head title="Enlaza letras" sub="Buscad palabras en la misma cuadrícula" back={back} />
        <ConfigCard size={size} setSize={setSize} seconds={seconds} setSeconds={setSeconds} onStart={startGame} />
        <Rules />
      </div>
    )
  }

  const iJoined = me === 'a' ? game.joinedA : game.joinedB
  const otherJoined = other === 'a' ? game.joinedA : game.joinedB
  const mine = game[me]
  const theirs = game[other]
  const otherName = profileOf(state, other).name

  const join = () => {
    patch('wordGames', game.id, { [me === 'a' ? 'joinedA' : 'joinedB']: true })
    void syncNow()
  }

  const launch = () => {
    patch('wordGames', game.id, { startAt: Date.now() + COUNTDOWN_MS })
    void syncNow()
  }

  const bothJoined = !!iJoined && !!otherJoined
  const started = !!game.startAt && game.startAt <= now
  const countingDown = !!game.startAt && game.startAt > now
  const endsAt = game.startAt ? game.startAt + game.seconds * 1000 : 0

  /* Mientras la partida haya empezado y no hayamos entregado, se juega.
     El tiempo sale del reloj real compartido, no de un contador propio: así
     los dos empiezan y acaban a la vez aunque uno entre un poco más tarde.

     Ojo con la condición: aquí NO se puede mirar el reloj. Si quitáramos la
     pantalla de juego en cuanto se pasa la hora de fin, la quitaríamos justo
     antes de que ella misma entregara las palabras, y se perdía la partida
     entera. Es la propia pantalla la que decide cuándo ha acabado y entrega;
     al entregar aparece `mine` y entonces sí desaparece. */
  if (started && !mine) {
    return (
      <PlayScreen
        game={game}
        endsAt={endsAt}
        onDone={(words) => {
          upsert('wordGames', game.id, (prev) => ({
            ...prev,
            [me]: { words, finishedAt: Date.now() },
          }))
          void syncNow()
        }}
      />
    )
  }

  return (
    <div className="page stack">
      <Head
        title="Enlaza letras"
        sub={`Cuadrícula de ${game.size}×${game.size} · ${game.seconds}s`}
        back={back}
      />

      {!iJoined ? (
        <Card className="soft center stack-sm">
          <div style={{ fontSize: 30 }}>🔤</div>
          <div className="bold">{profileOf(state, game.startedBy).name} preparó una partida</div>
          <div className="tiny muted">
            Cuadrícula de {game.size}×{game.size} · {game.seconds} segundos
          </div>
          <Button size="lg" onClick={join}>
            Unirme a la partida
          </Button>
        </Card>
      ) : !otherJoined ? (
        <Card className="soft center stack-sm">
          <div style={{ fontSize: 28 }}>⏳</div>
          <div className="bold">Esperando a {otherName}</div>
          <div className="tiny muted">Los dos tenéis que uniros antes de poder jugar</div>
        </Card>
      ) : countingDown ? (
        <Card className="soft center stack-sm">
          <div className="tiny muted">Empezáis los dos a la vez en</div>
          <div className="display" style={{ fontSize: 64, color: 'var(--accent)', lineHeight: 1 }}>
            {Math.max(1, Math.ceil((game.startAt! - now) / 1000))}
          </div>
          <div className="tiny muted">Preparad el dedo 👆</div>
        </Card>
      ) : !mine ? (
        <Card className="soft center stack-sm">
          <div style={{ fontSize: 30 }}>🔤</div>
          <div className="bold">¡Ya estáis los dos!</div>
          <div className="tiny muted">
            Al dar a empezar, salta una cuenta atrás en los dos móviles y jugáis
            exactamente el mismo tiempo.
          </div>
          <Button size="lg" onClick={launch} disabled={!bothJoined}>
            Empezar la partida
          </Button>
        </Card>
      ) : !theirs ? (
        <Card className="soft center stack-sm">
          <div style={{ fontSize: 28 }}>⏳</div>
          <div className="bold">Encontraste {mine.words.length} palabras</div>
          <div className="tiny muted">Esperando a que {otherName} termine esta misma cuadrícula</div>
        </Card>
      ) : (
        <Results state={state} game={game} me={me} other={other} />
      )}

      {mine && (
        <div className="stack-sm">
          <div className="eyebrow">Revancha</div>
          <ConfigCard size={size} setSize={setSize} seconds={seconds} setSeconds={setSeconds} onStart={startGame} />
        </div>
      )}

      <Rules />
    </div>
  )
}

function ConfigCard({
  size,
  setSize,
  seconds,
  setSeconds,
  onStart,
}: {
  size: number
  setSize: (n: number) => void
  seconds: number
  setSeconds: (n: number) => void
  onStart: () => void
}) {
  return (
    <Card className="stack-sm">
      <div className="eyebrow">Tamaño de la cuadrícula</div>
      <div className="chips">
        {GRID_SIZES.map((s) => (
          <Chip key={s} on={size === s} onClick={() => setSize(s)}>
            {s}×{s}
          </Chip>
        ))}
      </div>
      <div className="eyebrow" style={{ marginTop: 6 }}>
        Tiempo
      </div>
      <div className="chips">
        {TIME_OPTIONS.map((t) => (
          <Chip key={t} on={seconds === t} onClick={() => setSeconds(t)}>
            {t}s
          </Chip>
        ))}
      </div>
      <Button block onClick={onStart}>
        Generar tablero nuevo
      </Button>
    </Card>
  )
}

function Rules() {
  return (
    <Card className="soft small">
      Encadenad letras vecinas (también en diagonal) arrastrando el dedo para formar palabras de 3
      letras o más. Los dos tenéis que uniros y, al dar a empezar, salta una cuenta atrás en los
      dos móviles: jugáis la misma cuadrícula, a la vez y con el mismo tiempo. Al final: 1 punto
      por cada palabra que hayáis encontrado los dos, 2 puntos por cada una que sólo haya
      encontrado uno.
    </Card>
  )
}

/* ---------- Resultado, con recuento animado ---------- */

function Results({
  state,
  game,
  me,
  other,
}: {
  state: AppState
  game: WordGame
  me: Who
  other: Who
}) {
  const mine = game[me]!
  const theirs = game[other]!
  const otherName = profileOf(state, other).name

  const sequence = useMemo(() => {
    const shared = mine.words.filter((w) => theirs.words.includes(w))
    const onlyMine = mine.words.filter((w) => !theirs.words.includes(w))
    const onlyTheirs = theirs.words.filter((w) => !mine.words.includes(w))
    // Orden mezclado a propósito: si se agrupasen por tipo, la primera
    // tanda (las compartidas) ya dejaría claro quién va ganando.
    return shuffle([
      ...shared.map((w) => ({ word: w, pts: 1, who: 'both' as const })),
      ...onlyMine.map((w) => ({ word: w, pts: 2, who: me })),
      ...onlyTheirs.map((w) => ({ word: w, pts: 2, who: other })),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine.words.join(','), theirs.words.join(',')])

  const [shown, setShown] = useState(0)
  const [settled, setSettled] = useState(sequence.length === 0)
  useEffect(() => {
    if (shown < sequence.length) {
      const t = setTimeout(() => {
        setShown((s) => s + 1)
        void haptic('light')
      }, 750)
      return () => clearTimeout(t)
    }
    if (!settled) {
      const t = setTimeout(() => setSettled(true), 900)
      return () => clearTimeout(t)
    }
  }, [shown, sequence.length, settled])

  const revealed = sequence.slice(0, shown)
  const myScore = revealed.reduce((s, e) => s + (e.who === 'both' || e.who === me ? e.pts : 0), 0)
  const theirScore = revealed.reduce((s, e) => s + (e.who === 'both' || e.who === other ? e.pts : 0), 0)
  const myWords = revealed.filter((e) => e.who === 'both' || e.who === me).length
  const theirWords = revealed.filter((e) => e.who === 'both' || e.who === other).length
  const counting = shown < sequence.length
  const done = settled

  const finalMyScore = sequence.reduce((s, e) => s + (e.who === 'both' || e.who === me ? e.pts : 0), 0)
  const finalTheirScore = sequence.reduce((s, e) => s + (e.who === 'both' || e.who === other ? e.pts : 0), 0)
  const maxFinal = Math.max(finalMyScore, finalTheirScore, 1)
  const BAR_MAX = 180

  const meP = profileOf(state, me)
  const otherP = profileOf(state, other)
  const myRank = done ? (myScore === theirScore ? 1 : myScore > theirScore ? 1 : 2) : undefined
  const theirRank = done ? (myScore === theirScore ? 1 : theirScore > myScore ? 1 : 2) : undefined

  return (
    <Card className="stack-sm">
      <div className="row-between">
        <div className="bold">Resultado</div>
        <div className="tiny muted">
          {game.size}×{game.size} · {game.seconds}s
        </div>
      </div>

      {sequence.length === 0 ? (
        <div className="center small muted" style={{ padding: '8px 0' }}>
          Nadie encontró ninguna palabra esta vez 😅
        </div>
      ) : (
        <div className="row" style={{ gap: 16, alignItems: 'flex-end', justifyContent: 'center', paddingTop: 30 }}>
          <PodiumColumn
            emoji={meP.emoji}
            name="Tú"
            points={myScore}
            words={myWords}
            height={Math.max(24, Math.round((myScore / maxFinal) * BAR_MAX))}
            color="var(--accent)"
            rank={myRank}
          />
          <PodiumColumn
            emoji={otherP.emoji}
            name={otherName}
            points={theirScore}
            words={theirWords}
            height={Math.max(24, Math.round((theirScore / maxFinal) * BAR_MAX))}
            color="var(--accent-2)"
            rank={theirRank}
          />
        </div>
      )}

      {!done && sequence.length > 0 && (
        <button
          className="tiny muted center"
          onClick={() => {
            setShown(sequence.length)
            setSettled(true)
          }}
        >
          {counting ? 'Contando palabras…' : 'Redoble de tambores…'} (toca para saltar)
        </button>
      )}
    </Card>
  )
}

function PodiumColumn({
  emoji,
  name,
  points,
  words,
  height,
  color,
  rank,
}: {
  emoji: string
  name: string
  points: number
  words: number
  height: number
  color: string
  rank?: number
}) {
  return (
    <div className="center" style={{ width: 120 }}>
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          marginBottom: -14,
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {emoji}
      </div>
      <div
        style={{
          width: '100%',
          height,
          borderRadius: '18px 18px 6px 6px',
          background: color,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 20,
          transition: 'height .5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <span className="display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-ink)' }}>
          {points}
        </span>
      </div>
      <div className="bold small" style={{ marginTop: 8 }}>
        {name}
      </div>
      <div className="tiny muted">{words} palabras</div>
      {rank && (
        <div className="display" style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>
          {rank}º
        </div>
      )}
    </div>
  )
}

/* ---------- Pantalla de juego ---------- */

function PlayScreen({
  game,
  endsAt,
  onDone,
}: {
  game: WordGame
  endsAt: number
  onDone: (words: string[]) => void
}) {
  const size = game.size
  const grid = game.grid
  // El tiempo restante sale del reloj real, no de un contador propio: así los
  // dos acabáis a la vez y no se descuadra si la pantalla se apaga.
  const [left, setLeft] = useState(() => Math.ceil((endsAt - Date.now()) / 1000))
  const [path, setPath] = useState<number[]>([])
  const [flashPath, setFlashPath] = useState<{ path: number[]; ok: boolean } | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  const bannerSeq = useRef(0)
  const bannerTimer = useRef<number | undefined>(undefined)
  const flashTimer = useRef<number | undefined>(undefined)
  const dragging = useRef(false)
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])

  /** Guardamos las palabras en una referencia para poder entregarlas desde el
   * temporizador sin depender de cuándo se creó el intervalo. */
  const foundRef = useRef<string[]>([])
  const doneRef = useRef(false)

  useEffect(() => {
    const tick = () => {
      const secs = Math.ceil((endsAt - Date.now()) / 1000)
      setLeft(secs)
      if (secs <= 0 && !doneRef.current) {
        doneRef.current = true
        onDone(foundRef.current)
      }
    }
    tick()
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])

  useEffect(
    () => () => {
      window.clearTimeout(bannerTimer.current)
      window.clearTimeout(flashTimer.current)
    },
    [],
  )

  const showBanner = (kind: Banner['kind'], text: string) => {
    bannerSeq.current += 1
    window.clearTimeout(bannerTimer.current)
    setBanner({ kind, text, seq: bannerSeq.current })
    bannerTimer.current = window.setTimeout(() => setBanner(null), 1100)
  }

  const cellAt = (x: number, y: number): number | null => {
    for (let i = 0; i < cellRefs.current.length; i++) {
      const el = cellRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i
    }
    return null
  }

  const commitPath = (finalPath: number[]) => {
    if (finalPath.length >= 3) {
      const w = wordFromPath(grid, finalPath).toLowerCase()
      if (found.includes(w)) {
        showBanner('dup', `Ya tenías "${w.toUpperCase()}"`)
        void haptic('light')
      } else if (isWord(w)) {
        setFound((f) => {
          const next = [...f, w]
          foundRef.current = next
          return next
        })
        showBanner('found', w.toUpperCase())
        window.clearTimeout(flashTimer.current)
        setFlashPath({ path: finalPath, ok: true })
        flashTimer.current = window.setTimeout(() => setFlashPath(null), 500)
        void haptic('medium')
      } else {
        showBanner('bad', `"${w.toUpperCase()}" no existe`)
        void haptic('light')
      }
    }
    setPath([])
    dragging.current = false
  }

  const onDown = (idx: number) => {
    dragging.current = true
    setFlashPath(null)
    setPath([idx])
  }

  const onMove = (x: number, y: number) => {
    if (!dragging.current) return
    const idx = cellAt(x, y)
    if (idx === null) return
    setPath((p) => {
      if (p[p.length - 1] === idx) return p
      const back = p.length >= 2 && p[p.length - 2] === idx
      if (back) return p.slice(0, -1)
      if (p.includes(idx)) return p
      if (!areAdjacent(p[p.length - 1], idx, size)) return p
      return [...p, idx]
    })
  }

  return (
    <div
      className="page stack"
      style={{ touchAction: 'none', userSelect: 'none' }}
      onPointerMove={(e) => onMove(e.clientX, e.clientY)}
      onPointerUp={() => commitPath(path)}
      onPointerLeave={() => dragging.current && commitPath(path)}
    >
      <div className="row-between">
        <span
          className="bold"
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: left <= 10 ? 'var(--accent)' : 'var(--surface-2)',
            color: left <= 10 ? 'var(--accent-ink)' : 'var(--text)',
          }}
        >
          ⏱️ {left}s
        </span>
        <span className="bold" style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--surface-2)' }}>
          {found.length} palabras
        </span>
      </div>

      <div className="center" style={{ minHeight: 74, position: 'relative' }}>
        {banner ? (
          <div key={banner.seq} className={`wordgrid-banner ${banner.kind}`}>
            {banner.kind === 'found' && <span style={{ marginRight: 6 }}>✓</span>}
            {banner.text}
          </div>
        ) : (
          <span className="display" style={{ fontSize: 26, textTransform: 'uppercase', minHeight: 40 }}>
            {wordFromPath(grid, path)}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: 7,
          maxWidth: 380,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {grid.split('').map((letter, i) => {
          const active = path.includes(i)
          const flashed = flashPath?.path.includes(i)
          return (
            <div
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el
              }}
              onPointerDown={() => onDown(i)}
              className={flashed ? 'wordgrid-cell-pop' : undefined}
              style={{
                aspectRatio: '1',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size >= 6 ? 18 : 23,
                fontWeight: 800,
                textTransform: 'uppercase',
                background: active || flashed ? 'var(--accent)' : 'var(--surface)',
                color: active || flashed ? 'var(--accent-ink)' : 'var(--text)',
                boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transform: active ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform .1s, background .15s, color .15s',
              }}
            >
              {letter}
            </div>
          )
        })}
      </div>
    </div>
  )
}
