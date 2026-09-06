import { useStore } from '../store/store'
import { useNav } from '../router'
import { Card, Head } from '../components/ui'
import { live } from '../store/derive'
import { today } from '../lib/dates'

export default function Minigames() {
  const { state } = useStore()
  const { back, go } = useNav()

  const playedWordle = live(state.wordleResults).some((r) => r.id === today())
  const activeGrid = live(state.wordGames).sort((a, b) => b.createdAt - a.createdAt)[0]

  return (
    <div className="page stack">
      <Head title="Minijuegos" sub="Retos rápidos para jugar los dos" back={back} />

      <Card className="pressable" onClick={() => go('wordle')}>
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
            🟩
          </div>
          <div className="grow">
            <div className="bold">Wordle en pareja</div>
            <div className="tiny muted">
              {playedWordle ? 'Ya has jugado la de hoy' : 'La misma palabra secreta, cada día'}
            </div>
          </div>
          <span className="muted">›</span>
        </div>
      </Card>

      <Card className="pressable" onClick={() => go('enlaza')}>
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
            🔤
          </div>
          <div className="grow">
            <div className="bold">Enlaza letras</div>
            <div className="tiny muted">
              {activeGrid ? 'Tenéis una partida en marcha' : 'Buscad palabras en la misma cuadrícula'}
            </div>
          </div>
          <span className="muted">›</span>
        </div>
      </Card>

      <Card className="soft small">
        Más adelante llegarán más juegos rápidos por aquí. Si se os ocurre alguno, decídselo a
        quien mantiene la app 😉
      </Card>
    </div>
  )
}
