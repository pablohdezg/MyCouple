import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Card, Chip, Empty, Head, Sheet, Stars, TextArea, Toggle } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { DATE_IDEAS, DATE_TAGS, TAG_LABEL, type DateIdea, type DateTag } from '../data/dates'
import { fmtDate, today } from '../lib/dates'
import { pick, shuffle } from '../lib/utils'
import { haptic } from '../lib/native'
import type { DatePlan } from '../types'

export default function DateIdeas() {
  const { state, add, patch, remove, me, other, toast } = useStore()
  const { back } = useNav()
  const [tags, setTags] = useState<DateTag[]>([])
  const [current, setCurrent] = useState<DateIdea | null>(null)
  const [spin, setSpin] = useState(false)
  const [tab, setTab] = useState<'ruleta' | 'lista' | 'nuestras'>('ruleta')
  const [rating, setRating] = useState<DatePlan | null>(null)
  const [note, setNote] = useState('')
  const [secretMode, setSecretMode] = useState(false)
  const otherName = profileOf(state, other).name

  const filtered = useMemo(
    () => DATE_IDEAS.filter((i) => tags.every((t) => i.tags.includes(t))),
    [tags],
  )
  const planned = useMemo(
    () => live(state.dates).sort((a, b) => Number(a.done) - Number(b.done) || b.updatedAt - a.updatedAt),
    [state.dates],
  )

  const roll = () => {
    void haptic('medium')
    setSpin(true)
    const pool = filtered.length ? filtered : DATE_IDEAS
    let n = 0
    const timer = setInterval(() => {
      setCurrent(pick(pool))
      if (++n > 8) {
        clearInterval(timer)
        setSpin(false)
        void haptic('heavy')
      }
    }, 90)
  }

  const plan = (idea: DateIdea, date?: string, secret = false) => {
    add('dates', {
      title: idea.title,
      emoji: idea.emoji,
      date,
      done: false,
      tags: idea.tags,
      secret,
      plannedBy: me,
    })
    toast(secret ? `Guardada en secreto, ${otherName} no la verá hasta el día 🎁` : 'Guardada en vuestras citas 🌹')
    setSecretMode(false)
  }

  const toggleTag = (t: DateTag) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  return (
    <div className="page stack">
      <Head title="Ideas de citas" sub={`${DATE_IDEAS.length} planes esperando`} back={back} />

      <div className="chips">
        {(['ruleta', 'lista', 'nuestras'] as const).map((t) => (
          <Chip key={t} on={tab === t} onClick={() => setTab(t)}>
            {t === 'ruleta' ? '🎲 Ruleta' : t === 'lista' ? '📋 Todas' : `🌹 Nuestras (${planned.length})`}
          </Chip>
        ))}
      </div>

      {tab !== 'nuestras' && (
        <div className="chips scroll">
          {DATE_TAGS.map((t) => (
            <Chip key={t} on={tags.includes(t)} onClick={() => toggleTag(t)}>
              {TAG_LABEL[t]}
            </Chip>
          ))}
        </div>
      )}

      {tab === 'ruleta' && (
        <div className="stack">
          {current ? (
            <div className="playcard" key={current.id + String(spin)}>
              <div style={{ fontSize: 46 }}>{current.emoji}</div>
              <div className="q">{current.title}</div>
              <div style={{ opacity: 0.92, fontSize: 14 }}>{current.desc}</div>
              <div className="row wrap" style={{ justifyContent: 'center', gap: 6 }}>
                {current.tags.map((t) => (
                  <span
                    key={t}
                    className="tiny"
                    style={{
                      background: 'rgba(255,255,255,.25)',
                      padding: '3px 9px',
                      borderRadius: 99,
                    }}
                  >
                    {TAG_LABEL[t]}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <Card className="soft center stack" style={{ padding: 34 }}>
              <div style={{ fontSize: 44 }}>🎲</div>
              <div className="display" style={{ fontSize: 19 }}>
                ¿Qué hacemos hoy?
              </div>
              <p className="muted small">
                Filtra por lo que os apetezca y deja que la suerte decida.
                {filtered.length !== DATE_IDEAS.length && ` (${filtered.length} planes encajan)`}
              </p>
            </Card>
          )}
          <div className="row">
            <Button block onClick={roll} disabled={spin}>
              {current ? '🎲 Otra' : '🎲 Girar la ruleta'}
            </Button>
            {current && (
              <Button variant="ghost" onClick={() => plan(current, undefined, secretMode)}>
                💾 Guardar
              </Button>
            )}
          </div>
          {current && (
            <Toggle
              on={secretMode}
              onChange={setSecretMode}
              label="Guardar como sorpresa 🎁"
              desc={`${otherName} no verá el plan hasta que llegue el día`}
            />
          )}
        </div>
      )}

      {tab === 'lista' && (
        <div className="stack-sm">
          <div className="tiny muted">{filtered.length} ideas</div>
          {shuffle(filtered)
            .slice(0, 60)
            .map((i) => (
              <Card key={i.id} className="tight">
                <div className="row">
                  <span style={{ fontSize: 26 }}>{i.emoji}</span>
                  <div className="grow">
                    <div className="bold small">{i.title}</div>
                    <div className="tiny muted">{i.desc}</div>
                  </div>
                  <button className="icon-btn" onClick={() => plan(i)}>
                    ＋
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}

      {tab === 'nuestras' && (
        <div className="stack-sm">
          {planned.length === 0 ? (
            <Empty
              emoji="🌹"
              title="Sin citas guardadas"
              desc="Guarda ideas de la ruleta y aparecerán aquí para planificarlas."
            />
          ) : (
            planned.map((d) => {
              const hidden = d.secret && d.plannedBy === other && !d.done && (!d.date || d.date > today())
              if (hidden) {
                return (
                  <Card key={d.id} className="tight soft center small">
                    <div style={{ fontSize: 24 }}>🎁</div>
                    <div className="bold small">{otherName} os ha preparado una sorpresa</div>
                    <div className="tiny muted">
                      {d.date ? `Se revela el ${fmtDate(d.date)}` : 'Se revela cuando llegue el día'}
                    </div>
                  </Card>
                )
              }
              return (
                <Card key={d.id} className="tight stack-sm">
                  <div className="row">
                    <span style={{ fontSize: 24 }}>{d.emoji}</span>
                    <div className="grow">
                      <div className={`bold small ${d.done ? 'dim' : ''}`}>
                        {d.title}
                        {d.secret && d.plannedBy === me && ' 🎁'}
                      </div>
                      <div className="tiny muted">
                        {d.date ? fmtDate(d.date) : 'sin fecha'}
                        {d.done ? ' · hecha' : ''}
                      </div>
                    </div>
                    <button className="tiny muted" onClick={() => remove('dates', d.id)}>
                      ✕
                    </button>
                  </div>
                  {d.note && <div className="tiny muted pre">{d.note}</div>}
                  <div className="row">
                    <input
                      className="input"
                      type="date"
                      style={{ padding: '8px 12px', fontSize: 13 }}
                      value={d.date ?? ''}
                      onChange={(e) => patch('dates', d.id, { date: e.target.value })}
                    />
                    {!d.done ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          patch('dates', d.id, { done: true, date: d.date ?? today() })
                          setRating({ ...d, done: true })
                          void haptic('medium')
                        }}
                      >
                        ✓ Hecha
                      </Button>
                    ) : (
                      <Stars value={d.rating ?? 0} onChange={(v) => patch('dates', d.id, { rating: v })} size={17} />
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      <Sheet open={!!rating} onClose={() => setRating(null)} title="¿Qué tal fue?">
        {rating && (
          <div className="stack">
            <div className="center" style={{ fontSize: 40 }}>
              {rating.emoji}
            </div>
            <div className="center display" style={{ fontSize: 18 }}>
              {rating.title}
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Stars
                value={rating.rating ?? 0}
                size={30}
                onChange={(v) => {
                  patch('dates', rating.id, { rating: v })
                  setRating({ ...rating, rating: v })
                }}
              />
            </div>
            <TextArea value={note} onChange={setNote} rows={3} placeholder="Un recuerdo de esta cita…" />
            <Button
              block
              onClick={() => {
                patch('dates', rating.id, { note: note.trim() || undefined })
                setNote('')
                setRating(null)
                toast('Guardado 💗')
              }}
            >
              Guardar
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
