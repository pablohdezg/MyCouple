import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Card, Confirm, Field, Head, Input, Sheet } from '../components/ui'
import { DECKS, type Deck } from '../data/decks'
import { live, profileOf } from '../store/derive'
import { haptic } from '../lib/native'
import { shuffle } from '../lib/utils'
import type { Who } from '../types'

/** Mazo especial: sólo existe si la pareja ya ha añadido alguna carta propia. */
const SURPRISE: Deck = {
  id: 'sorpresa',
  name: 'Sorpréndeme',
  emoji: '🎲',
  desc: 'Una carta al azar de entre todos los mazos que tenéis desbloqueados.',
  cards: [],
}

export default function Games() {
  const { state, update, add, me, toast } = useStore()
  const { back } = useNav()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [idx, setIdx] = useState(0)
  const [turn, setTurn] = useState<Who>(me)
  const [askSpicy, setAskSpicy] = useState(false)
  const [quiz, setQuiz] = useState(false)
  const [addingCard, setAddingCard] = useState<Deck | null>(null)
  const [newCard, setNewCard] = useState('')

  const played = useMemo(() => live(state.gameLog).length, [state.gameLog])
  const customCards = useMemo(() => live(state.customCards), [state.customCards])

  const unlockedDecks = useMemo(
    () => DECKS.filter((d) => !d.adult || state.settings.spicy),
    [state.settings.spicy],
  )

  const withCustom = (d: Deck): Deck => {
    const mine = customCards.filter((c) => c.deck === d.id).map((c) => c.text)
    return mine.length ? { ...d, cards: [...d.cards, ...mine] } : d
  }

  /** Prioriza cartas que no hayáis visto todavía en este mazo; cuando ya os
   * las sabéis todas, empieza a repetir desde el principio. */
  const freshOrder = (d: Deck): number[] => {
    const all = d.cards.map((_, i) => i)
    const seen = new Set(
      live(state.gameLog)
        .filter((g) => g.deck === d.id)
        .map((g) => Number(g.cardId)),
    )
    const pool = all.filter((i) => !seen.has(i))
    return shuffle(pool.length ? pool : all)
  }

  const openDeck = (d: Deck) => {
    if (d.id === SURPRISE.id) {
      const pool = unlockedDecks.flatMap((x) => withCustom(x).cards)
      setDeck({ ...SURPRISE, cards: pool })
      setOrder(shuffle(pool.map((_, i) => i)))
      setIdx(0)
      setTurn(me)
      return
    }
    if (d.adult && !state.settings.spicy) {
      setAskSpicy(true)
      return
    }
    const full = withCustom(d)
    setDeck(full)
    setOrder(freshOrder(full))
    setIdx(0)
    setTurn(me)
  }

  const next = () => {
    if (!deck) return
    void haptic('medium')
    add('gameLog', { deck: deck.id, cardId: String(order[idx]), at: Date.now() })
    setTurn((t) => (t === 'a' ? 'b' : 'a'))
    setIdx((i) => (i + 1 >= order.length ? 0 : i + 1))
  }

  const saveCustomCard = () => {
    if (!addingCard || !newCard.trim()) return
    add('customCards', { deck: addingCard.id, text: newCard.trim(), author: me })
    setNewCard('')
    setAddingCard(null)
    toast('Carta añadida a vuestro mazo ✍️')
  }

  if (deck) {
    const card = deck.cards[order[idx]]
    return (
      <div className="page stack">
        <Head
          title={deck.name}
          sub={`Carta ${idx + 1} de ${order.length}`}
          back={() => setDeck(null)}
        />
        <Card className="soft center small">
          Le toca a <span className="bold accent">{profileOf(state, turn).name}</span>
        </Card>
        <div className="playcard" key={`${deck.id}-${idx}`}>
          <div style={{ fontSize: 34 }}>{deck.emoji}</div>
          <div className="q">{card}</div>
        </div>
        <Button size="lg" block onClick={next}>
          Siguiente carta →
        </Button>
        <div className="row">
          <Button
            variant="plain"
            block
            onClick={() => {
              setOrder(deck.id === SURPRISE.id ? shuffle(deck.cards.map((_, i) => i)) : freshOrder(deck))
              setIdx(0)
              toast('Barajado 🔀')
            }}
          >
            🔀 Barajar
          </Button>
          {deck.id !== SURPRISE.id && (
            <Button variant="plain" block onClick={() => setAddingCard(deck)}>
              ✍️ Añadir carta
            </Button>
          )}
        </div>

        <Sheet
          open={!!addingCard}
          onClose={() => setAddingCard(null)}
          title={`Añadir carta a "${addingCard?.name ?? ''}"`}
        >
          <div className="stack">
            <Field label="Vuestra carta" hint="Se mezclará con las demás la próxima vez que juguéis a este mazo">
              <Input value={newCard} onChange={setNewCard} placeholder="Escribid vuestra pregunta o reto…" />
            </Field>
            <Button block onClick={saveCustomCard} disabled={!newCard.trim()}>
              Guardar carta
            </Button>
          </div>
        </Sheet>
      </div>
    )
  }

  return (
    <div className="page stack">
      <Head title="Juegos" sub={`${played} cartas jugadas juntos`} back={back} />

      <div className="stack">
        {DECKS.map((d) => (
          <Card key={d.id} className="pressable" onClick={() => openDeck(d)}>
            <div className="row">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: 'var(--grad)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flex: '0 0 auto',
                }}
              >
                {d.emoji}
              </div>
              <div className="grow">
                <div className="bold">
                  {d.name}
                  {d.adult && !state.settings.spicy && ' 🔒'}
                </div>
                <div className="tiny muted">{d.desc}</div>
                <div className="tiny muted">{d.cards.length} cartas</div>
              </div>
              <span className="muted">›</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="pressable soft" onClick={() => openDeck(SURPRISE)}>
        <div className="row">
          <span style={{ fontSize: 26 }}>🎲</span>
          <div className="grow">
            <div className="bold">Sorpréndeme</div>
            <div className="tiny muted">Una carta al azar de todos vuestros mazos desbloqueados</div>
          </div>
          <span className="muted">›</span>
        </div>
      </Card>

      <Card className="pressable soft" onClick={() => setQuiz(true)}>
        <div className="row">
          <span style={{ fontSize: 26 }}>🧠</span>
          <div className="grow">
            <div className="bold">¿Cuánto nos conocemos?</div>
            <div className="tiny muted">Cómo jugar al concurso de pareja</div>
          </div>
        </div>
      </Card>

      <Confirm
        open={askSpicy}
        title="Cartas íntimas 🔥"
        desc="Preguntas sobre deseo, límites y complicidad. Activadlas solo si os apetece a los dos. Podéis desactivarlas cuando queráis en Ajustes."
        confirmLabel="Sí, activar"
        onCancel={() => setAskSpicy(false)}
        onConfirm={() => {
          update((s) => ({ ...s, settings: { ...s.settings, spicy: true } }))
          setAskSpicy(false)
          toast('Mazo desbloqueado 🔥')
        }}
      />

      <Sheet open={quiz} onClose={() => setQuiz(false)} title="¿Cuánto nos conocemos?">
        <div className="stack small">
          <p>Un juego sin app, solo con vosotros y un papel:</p>
          <ol style={{ paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
            <li>Cada uno escribe 10 preguntas sobre sí mismo, con su respuesta tapada.</li>
            <li>Por turnos, leéis una pregunta y el otro responde.</li>
            <li>Un punto por acierto. Si falla, cuenta la respuesta real y explicadla.</li>
            <li>Quien pierda, invita a la próxima cita o elige la peli del viernes.</li>
          </ol>
          <p className="muted">
            Truco: las preguntas buenas no son de datos («¿mi color favorito?») sino de emociones
            («¿qué me da más vergüenza?»).
          </p>
          <Button block onClick={() => setQuiz(false)}>
            ¡Vamos!
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
