import { useStore } from '../store/store'
import { useNav } from '../router'
import { Bar, Card, Head } from '../components/ui'
import { ACHIEVEMENTS } from '../data/misc'
import { daysTogether, live, unlockedAchievements } from '../store/derive'
import { fmtDate, iso } from '../lib/dates'

export default function Achievements() {
  const { state } = useStore()
  const { back } = useNav()
  const unlocked = unlockedAchievements(state)
  const at = new Map(state.achievements.map((a) => [a.id, a.at]))
  const pct = (unlocked.size / ACHIEVEMENTS.length) * 100

  const stats = [
    { label: 'Días juntos', value: daysTogether(state).toLocaleString('es-ES'), emoji: '💗' },
    { label: 'Recuerdos', value: live(state.memories).length, emoji: '📸' },
    { label: 'Momentos', value: live(state.posts).length, emoji: '📔' },
    { label: 'Mensajes', value: live(state.messages).length, emoji: '💬' },
    { label: 'Preguntas', value: live(state.dailyAnswers).filter((a) => a.a && a.b).length, emoji: '❓' },
    { label: 'Deseos cumplidos', value: live(state.bucket).filter((b) => b.done).length, emoji: '⭐' },
    { label: 'Citas hechas', value: live(state.dates).filter((d) => d.done).length, emoji: '🌹' },
    { label: 'Gratitudes', value: live(state.gratitudes).length, emoji: '🙏' },
  ]

  return (
    <div className="page stack">
      <Head title="Logros" sub={`${unlocked.size} de ${ACHIEVEMENTS.length} desbloqueados`} back={back} />

      <Card className="soft stack-sm">
        <Bar pct={pct} />
        <div className="tiny muted center">{Math.round(pct)}% completado</div>
      </Card>

      <div className="stack-sm">
        <div className="eyebrow">Vuestros números</div>
        <div className="grid-2">
          {stats.map((s) => (
            <Card key={s.label} className="tight center">
              <div style={{ fontSize: 20 }}>{s.emoji}</div>
              <div className="display bold" style={{ fontSize: 22 }}>
                {s.value}
              </div>
              <div className="tiny muted">{s.label}</div>
            </Card>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <div className="eyebrow">Medallas</div>
        <div className="grid-2">
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.has(a.id)
            return (
              <Card key={a.id} className={`tight ${has ? '' : 'dim'}`}>
                <div style={{ fontSize: 26, filter: has ? undefined : 'grayscale(1)' }}>
                  {has ? a.emoji : '🔒'}
                </div>
                <div className="bold small" style={{ marginTop: 4 }}>
                  {a.name}
                </div>
                <div className="tiny muted">{a.desc}</div>
                {has && at.get(a.id) && (
                  <div className="tiny accent" style={{ marginTop: 3 }}>
                    {fmtDate(iso(new Date(at.get(a.id)!)))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
