import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Card, Head } from '../components/ui'
import { live, unlockedAchievements } from '../store/derive'
import { ACHIEVEMENTS } from '../data/misc'
import { DATE_IDEAS } from '../data/dates'
import { DECKS } from '../data/decks'
import { QUESTIONS } from '../data/questions'

/** Contados a partir del contenido real, para que no se queden obsoletos
 * cada vez que se añaden cartas nuevas. */
const DECK_CARDS = DECKS.reduce((n, d) => n + d.cards.length, 0)

interface Entry {
  path: string
  emoji: string
  title: string
  desc: string
}

const GROUPS: { name: string; items: Entry[] }[] = [
  {
    name: 'Cada día',
    items: [
      { path: 'pregunta', emoji: '❓', title: 'Pregunta del día', desc: `${QUESTIONS.length} preguntas, una al día` },
      { path: 'animo', emoji: '🌤️', title: 'Cómo estamos', desc: 'Ánimo diario y check-in semanal' },
      { path: 'gratitud', emoji: '🙏', title: 'Gratitud', desc: 'Algo que agradeces del otro' },
      { path: 'calendario', emoji: '🗓️', title: 'Agenda', desc: 'Vuestras fechas importantes' },
    ],
  },
  {
    name: 'Recuerdos y sueños',
    items: [
      { path: 'recuerdos', emoji: '📸', title: 'Recuerdos', desc: 'Vuestro álbum de fotos' },
      { path: 'deseos', emoji: '⭐', title: 'Lista de deseos', desc: 'Todo lo que queréis hacer' },
      { path: 'cartas', emoji: '💌', title: 'Cartas al futuro', desc: 'Se abren en la fecha elegida' },
      { path: 'cuentaatras', emoji: '⏳', title: 'Cuentas atrás', desc: 'Viajes, reencuentros, planes' },
      { path: 'resumen', emoji: '📊', title: 'Nuestro año', desc: 'Vuestras cifras del año' },
    ],
  },
  {
    name: 'Planes y juegos',
    items: [
      { path: 'citas', emoji: '🌹', title: 'Ideas de citas', desc: `Ruleta con ${DATE_IDEAS.length} planes` },
      { path: 'juegos', emoji: '🎲', title: 'Juegos', desc: `${DECK_CARDS} cartas en seis mazos` },
      { path: 'minijuegos', emoji: '🕹️', title: 'Minijuegos', desc: 'Wordle en pareja y Enlaza letras' },
      { path: 'vales', emoji: '🎟️', title: 'Vales de amor', desc: 'Promesas canjeables' },
      { path: 'listas', emoji: '📝', title: 'Nuestras listas', desc: 'La compra, pelis, libros…' },
      { path: 'lenguajes', emoji: '💞', title: 'Lenguajes del amor', desc: 'Test y consejos' },
    ],
  },
  {
    name: 'El día a día',
    items: [
      { path: 'paces', emoji: '🕊️', title: 'Hacer las paces', desc: 'Guía para después de discutir' },
      { path: 'tareas', emoji: '🧺', title: 'Tareas del hogar', desc: 'Repartir sin discutir' },
      { path: 'gastos', emoji: '💸', title: 'Gastos compartidos', desc: 'Quién pagó qué' },
      { path: 'logros', emoji: '🏅', title: 'Logros', desc: 'Vuestras medallas' },
      { path: 'ajustes', emoji: '⚙️', title: 'Ajustes', desc: 'Tema, código, copia de seguridad' },
    ],
  },
]

export default function More() {
  const { state } = useStore()
  const { go } = useNav()
  const unlocked = unlockedAchievements(state)

  return (
    <div className="page stack">
      <Head title={state.couple.title} sub="Todo lo que podéis hacer aquí" />

      <Card className="soft" onClick={() => go('logros')}>
        <div className="row">
          <div className="avatar-pair">
            <Avatar profile={state.couple.a} size="sm" />
            <Avatar profile={state.couple.b} size="sm" />
          </div>
          <div className="grow">
            <div className="bold">
              {state.couple.a.name} & {state.couple.b.name}
            </div>
            <div className="tiny muted">
              {unlocked.size}/{ACHIEVEMENTS.length} logros · {live(state.memories).length} recuerdos ·{' '}
              {live(state.posts).length} momentos
            </div>
          </div>
          <span style={{ fontSize: 20 }}>🏅</span>
        </div>
      </Card>

      {GROUPS.map((g) => (
        <div key={g.name} className="stack-sm">
          <div className="eyebrow">{g.name}</div>
          <div className="grid-2">
            {g.items.map((it) => (
              <button key={it.path} className="tile" onClick={() => go(it.path)}>
                <span className="ico">{it.emoji}</span>
                <span className="t">{it.title}</span>
                <span className="d">{it.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="center tiny muted" style={{ marginTop: 10 }}>
        Hecho con 💗 para vosotros dos
      </div>
    </div>
  )
}
