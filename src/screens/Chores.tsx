import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Chip, Empty, Field, Head, Input, Select, Sheet } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { CHORE_SUGGESTIONS } from '../data/misc'
import { ago } from '../lib/dates'
import { haptic } from '../lib/native'
import type { Chore, WhoAll } from '../types'

const REPEATS = [
  { value: 'ninguna' as const, label: 'Una vez' },
  { value: 'diaria' as const, label: 'Cada día' },
  { value: 'semanal' as const, label: 'Cada semana' },
  { value: 'mensual' as const, label: 'Cada mes' },
]

/** Una tarea repetitiva vuelve a estar pendiente cuando pasa su periodo. */
function isPending(c: Chore): boolean {
  if (!c.lastDoneAt) return true
  if (c.repeat === 'ninguna') return !c.done
  const days = c.repeat === 'diaria' ? 1 : c.repeat === 'semanal' ? 7 : 30
  return Date.now() - c.lastDoneAt > days * 86400000
}

export default function Chores() {
  const { state, add, patch, remove, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🧹')
  const [assignee, setAssignee] = useState<WhoAll>('ambos')
  const [repeat, setRepeat] = useState<Chore['repeat']>('semanal')

  const chores = useMemo(() => live(state.chores), [state.chores])
  const pending = chores.filter(isPending)
  const done = chores.filter((c) => !isPending(c))

  const points = useMemo(() => {
    const out = { a: 0, b: 0 }
    for (const c of chores) {
      if (!c.lastDoneAt) continue
      if (c.assignee === 'a') out.a += c.points
      else if (c.assignee === 'b') out.b += c.points
      else {
        out.a += c.points / 2
        out.b += c.points / 2
      }
    }
    return out
  }, [chores])

  const save = (t = title, e = emoji) => {
    if (!t.trim()) return
    add('chores', {
      title: t.trim(),
      emoji: e,
      assignee,
      repeat,
      done: false,
      points: 1,
    })
    setTitle('')
    setOpen(false)
    toast('Tarea añadida 🧺')
  }

  const complete = (c: Chore) => {
    void haptic('medium')
    patch('chores', c.id, { done: true, lastDoneAt: Date.now(), points: c.points })
    toast('¡Hecho! Gracias 💗')
  }

  const label = (w: WhoAll) =>
    w === 'ambos' ? 'Los dos' : profileOf(state, w).name

  return (
    <div className="page stack">
      <Head
        title="Tareas del hogar"
        sub="Repartir sin discutir"
        back={back}
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      <Card className="soft">
        <div className="row" style={{ justifyContent: 'space-around' }}>
          {(['a', 'b'] as const).map((w) => (
            <div key={w} className="center stack-sm" style={{ alignItems: 'center' }}>
              <Avatar profile={profileOf(state, w)} size="sm" />
              <div className="display bold" style={{ fontSize: 22 }}>
                {Math.round(points[w])}
              </div>
              <div className="tiny muted">tareas hechas</div>
            </div>
          ))}
        </div>
      </Card>

      {chores.length === 0 ? (
        <Empty
          emoji="🧺"
          title="Sin tareas todavía"
          desc="Añadid lo que hay que hacer en casa y repartidlo. Se reinicia solo si es repetitiva."
          action={<Button onClick={() => setOpen(true)}>Añadir tarea</Button>}
        />
      ) : (
        <>
          <div className="stack-sm">
            <div className="eyebrow">Pendientes ({pending.length})</div>
            {pending.length === 0 ? (
              <Card className="center small muted">Todo hecho. Qué gustazo. ✨</Card>
            ) : (
              <div className="list">
                {pending.map((c) => (
                  <div key={c.id} className="list-item">
                    <span style={{ fontSize: 22 }}>{c.emoji}</span>
                    <div className="grow">
                      <div className="bold small">{c.title}</div>
                      <div className="tiny muted">
                        {label(c.assignee)} · {REPEATS.find((r) => r.value === c.repeat)?.label}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => complete(c)}>
                      ✓
                    </Button>
                    <button className="tiny muted" onClick={() => remove('chores', c.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {done.length > 0 && (
            <div className="stack-sm">
              <div className="eyebrow">Hechas</div>
              <div className="list">
                {done.map((c) => (
                  <div key={c.id} className="list-item dim">
                    <span style={{ fontSize: 20 }}>{c.emoji}</span>
                    <div className="grow">
                      <div className="small strike">{c.title}</div>
                      <div className="tiny muted">
                        {c.lastDoneAt ? ago(c.lastDoneAt) : ''} · {label(c.assignee)}
                      </div>
                    </div>
                    <button
                      className="tiny muted"
                      onClick={() => patch('chores', c.id, { done: false, lastDoneAt: undefined })}
                    >
                      ↺
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva tarea">
        <div className="stack">
          <Field label="¿Qué hay que hacer?">
            <Input value={title} onChange={setTitle} placeholder="Fregar los platos" />
          </Field>
          <Field label="Sugerencias">
            <div className="chips">
              {CHORE_SUGGESTIONS.map((s) => (
                <Chip
                  key={s.title}
                  onClick={() => {
                    setTitle(s.title)
                    setEmoji(s.emoji)
                  }}
                >
                  {s.emoji} {s.title}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="¿Quién?">
            <div className="chips">
              {(['a', 'b', 'ambos'] as WhoAll[]).map((w) => (
                <Chip key={w} on={assignee === w} onClick={() => setAssignee(w)}>
                  {label(w)}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Repetición">
            <Select value={repeat} onChange={setRepeat} options={REPEATS} />
          </Field>
          <Button block onClick={() => save()} disabled={!title.trim()}>
            Añadir
          </Button>
          <div className="tiny muted center">
            Repartir bien las tareas es una de las cosas que más discusiones evita 💗
          </div>
        </div>
      </Sheet>
    </div>
  )
}
