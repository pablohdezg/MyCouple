import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Chip, Empty, Field, Head, Input, Sheet, TextArea } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { addDays, daysBetween, fmtDate, today } from '../lib/dates'
import { haptic } from '../lib/native'
import type { Letter } from '../types'

const PRESETS = [
  { label: 'En 1 mes', days: 30 },
  { label: 'En 6 meses', days: 182 },
  { label: 'En 1 año', days: 365 },
  { label: 'En 5 años', days: 1825 },
]

export default function Letters() {
  const { state, add, patch, me, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [openAt, setOpenAt] = useState(addDays(today(), 365))
  const [reading, setReading] = useState<Letter | null>(null)

  const letters = useMemo(
    () => live(state.letters).sort((a, b) => a.openAt.localeCompare(b.openAt)),
    [state.letters],
  )

  const save = () => {
    if (!body.trim()) return
    add('letters', {
      author: me,
      title: title.trim() || 'Carta para el futuro',
      body: body.trim(),
      openAt,
      opened: false,
      createdAt: Date.now(),
    })
    setTitle('')
    setBody('')
    setOpen(false)
    toast('Carta sellada 💌')
  }

  const openLetter = (l: Letter) => {
    if (daysBetween(today(), l.openAt) > 0) return
    void haptic('medium')
    if (!l.opened) patch('letters', l.id, { opened: true })
    setReading(l)
  }

  return (
    <div className="page stack">
      <Head
        title="Cartas al futuro"
        sub="Se abren solas el día que elijáis"
        back={back}
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      <Card className="soft small">
        Escribid cómo os sentís hoy, qué esperáis, qué prometéis. Nadie podrá leerlo hasta la fecha
        marcada: ni siquiera vosotros.
      </Card>

      {letters.length === 0 ? (
        <Empty
          emoji="💌"
          title="Aún no hay cartas"
          desc="La primera puede ser sencilla: cómo os sentís ahora mismo, para leerlo dentro de un año."
          action={<Button onClick={() => setOpen(true)}>Escribir una carta</Button>}
        />
      ) : (
        <div className="stack">
          {letters.map((l) => {
            const left = daysBetween(today(), l.openAt)
            const locked = left > 0
            return (
              <Card key={l.id} className={locked ? '' : 'pressable'} onClick={() => openLetter(l)}>
                <div className="row">
                  <div style={{ fontSize: 30 }}>{locked ? '🔒' : l.opened ? '📖' : '💌'}</div>
                  <div className="grow">
                    <div className="bold">{l.title}</div>
                    <div className="tiny muted">
                      De {profileOf(state, l.author).name} · se abre el {fmtDate(l.openAt)}
                    </div>
                    {locked ? (
                      <div className="tiny accent bold" style={{ marginTop: 3 }}>
                        Faltan {left} días
                      </div>
                    ) : (
                      <div className="tiny accent bold" style={{ marginTop: 3 }}>
                        {l.opened ? 'Leída · tocar para releer' : '¡Ya puedes abrirla!'}
                      </div>
                    )}
                  </div>
                  <Avatar profile={profileOf(state, l.author)} size="xs" />
                </div>
                {locked && (
                  <div className="pre blur-lock small" style={{ marginTop: 10 }}>
                    {l.body.slice(0, 120)}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva carta">
        <div className="stack">
          <Field label="Título">
            <Input value={title} onChange={setTitle} placeholder="Para cuando lo leamos juntos" />
          </Field>
          <Field label="Tu carta">
            <TextArea
              value={body}
              onChange={setBody}
              rows={9}
              placeholder="Hoy quiero decirte que…"
            />
          </Field>
          <Field label="¿Cuándo se abre?">
            <div className="chips" style={{ marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  on={openAt === addDays(today(), p.days)}
                  onClick={() => setOpenAt(addDays(today(), p.days))}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
            <input
              className="input"
              type="date"
              value={openAt}
              min={addDays(today(), 1)}
              onChange={(e) => setOpenAt(e.target.value)}
            />
          </Field>
          <Button block onClick={save} disabled={!body.trim()}>
            Sellar carta 💌
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!reading} onClose={() => setReading(null)}>
        {reading && (
          <div className="stack">
            <div className="center" style={{ fontSize: 38 }}>
              💌
            </div>
            <h2 className="center">{reading.title}</h2>
            <div className="center tiny muted">
              Escrita el {fmtDate(new Date(reading.createdAt).toISOString().slice(0, 10))} por{' '}
              {profileOf(state, reading.author).name}
            </div>
            <Card className="soft">
              <div className="pre display" style={{ fontSize: 16, lineHeight: 1.7 }}>
                {reading.body}
              </div>
            </Card>
            <Button block onClick={() => setReading(null)}>
              Cerrar
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
