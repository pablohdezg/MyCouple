import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Card, Head } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { today, fmtDate } from '../lib/dates'
import { haptic } from '../lib/native'
import {
  MAX_GUESSES,
  WORD_LEN,
  evaluateGuess,
  isValidGuess,
  wordOfDay,
  type LetterState,
} from '../lib/wordle'

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['ENTER', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
]

const COLORS: Record<LetterState, { bg: string; fg: string }> = {
  correct: { bg: 'var(--accent)', fg: 'var(--accent-ink)' },
  present: { bg: 'var(--accent-2)', fg: 'var(--accent-ink)' },
  absent: { bg: '#c7bcc1', fg: '#fff' },
}

export default function Wordle() {
  const { state, upsert, me, other, toast } = useStore()
  const { back } = useNav()
  const date = today()
  const word = useMemo(() => wordOfDay(date), [date])

  const entry = live(state.wordleResults).find((r) => r.id === date)
  const mine = entry?.[me]
  const theirs = entry?.[other]

  const [guesses, setGuesses] = useState<string[]>(mine?.guesses ?? [])
  const [draft, setDraft] = useState('')
  const [shake, setShake] = useState(false)

  const finished = !!mine
  const won = guesses.some((g) => g.toLowerCase() === word)
  const lost = !won && guesses.length >= MAX_GUESSES

  const keyStates = useMemo(() => {
    const map: Record<string, LetterState> = {}
    for (const g of guesses) {
      const ev = evaluateGuess(g, word)
      g.toLowerCase()
        .split('')
        .forEach((letter, i) => {
          const cur = map[letter]
          const next = ev[i]
          if (!cur || (cur === 'absent' && next !== 'absent') || (cur === 'present' && next === 'correct')) {
            map[letter] = next
          }
        })
    }
    return map
  }, [guesses, word])

  const finish = (finalGuesses: string[], didWin: boolean) => {
    upsert('wordleResults', date, (prev) => ({
      ...prev,
      date,
      word,
      [me]: { guesses: finalGuesses, won: didWin, finishedAt: Date.now() },
    }))
  }

  const pressKey = (k: string) => {
    if (finished || won || lost) return
    if (k === 'ENTER') {
      if (draft.length !== WORD_LEN) return
      if (!isValidGuess(draft)) {
        setShake(true)
        setTimeout(() => setShake(false), 400)
        toast('Esa palabra no está en el diccionario')
        return
      }
      const next = [...guesses, draft]
      setGuesses(next)
      setDraft('')
      void haptic('light')
      const didWin = draft.toLowerCase() === word
      if (didWin || next.length >= MAX_GUESSES) finish(next, didWin)
      return
    }
    if (k === '⌫') {
      setDraft((d) => d.slice(0, -1))
      return
    }
    if (draft.length < WORD_LEN) setDraft((d) => d + k)
  }

  const rows: string[] = []
  for (let i = 0; i < MAX_GUESSES; i++) rows.push(guesses[i] ?? (i === guesses.length ? draft : ''))

  return (
    <div className="page stack">
      <Head title="Wordle en pareja" sub={fmtDate(date, { weekday: true })} back={back} />

      <Card className="soft stack-sm" style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
        {rows.map((rowWord, ri) => {
          const isSubmitted = ri < guesses.length
          const states = isSubmitted ? evaluateGuess(rowWord, word) : []
          const isCurrent = ri === guesses.length && !won && !lost
          return (
            <div
              key={ri}
              className="row"
              style={{
                gap: 7,
                justifyContent: 'center',
                animation: isCurrent && shake ? 'shake .4s' : undefined,
              }}
            >
              {Array.from({ length: WORD_LEN }, (_, ci) => {
                const letter = rowWord[ci] ?? ''
                const st = isSubmitted ? states[ci] : undefined
                const colors = st ? COLORS[st] : undefined
                const filled = isCurrent && letter
                return (
                  <div
                    key={ci}
                    className={isSubmitted ? 'wordle-tile-reveal' : filled ? 'wordle-tile-pop' : undefined}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 12,
                      border: colors ? 'none' : `2px solid ${filled ? 'var(--accent)' : 'var(--line)'}`,
                      background: colors?.bg ?? 'var(--surface)',
                      color: colors?.fg ?? 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 23,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      boxShadow: colors ? 'var(--shadow-sm)' : undefined,
                      animationDelay: isSubmitted ? `${ci * 70}ms` : undefined,
                    }}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          )
        })}
      </Card>

      {finished && (
        <Card className="soft center stack-sm">
          <div style={{ fontSize: 28 }}>{mine!.won ? '🎉' : '😅'}</div>
          <div className="bold">
            {mine!.won ? `¡Acertada en ${mine!.guesses.length}!` : `Era "${word.toUpperCase()}"`}
          </div>
        </Card>
      )}

      {finished && (
        <Card className="stack-sm">
          <div className="row">
            <div className="grow small">
              <span className="bold">Tú:</span> {mine!.won ? `${mine!.guesses.length} intentos ✅` : 'no la adivinaste'}
            </div>
          </div>
          <div className="row">
            <div className="grow small">
              <span className="bold">{profileOf(state, other).name}:</span>{' '}
              {theirs ? (theirs.won ? `${theirs.guesses.length} intentos ✅` : 'no la adivinó') : 'todavía no ha jugado'}
            </div>
          </div>
        </Card>
      )}

      {!finished && !won && !lost && (
        <div className="stack-sm" style={{ marginTop: 'auto' }}>
          {ROWS.map((row, i) => (
            <div key={i} className="row" style={{ gap: 4, justifyContent: 'center' }}>
              {row.map((k) => {
                const st = k.length === 1 ? keyStates[k] : undefined
                const colors = st ? COLORS[st] : undefined
                return (
                  <button
                    key={k}
                    onClick={() => pressKey(k === 'ENTER' ? 'ENTER' : k)}
                    style={{
                      minWidth: k.length > 1 ? 46 : 28,
                      height: 44,
                      borderRadius: 10,
                      border: 'none',
                      background: colors?.bg ?? 'var(--surface-2)',
                      color: colors?.fg ?? 'var(--text)',
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      flex: k.length > 1 ? '0 0 auto' : '1 1 0',
                      padding: '0 4px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {k}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
