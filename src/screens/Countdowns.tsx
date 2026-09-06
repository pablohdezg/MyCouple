import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Chip, Empty, Field, Head, Input, Sheet } from '../components/ui'
import { live } from '../store/derive'
import { addDays, daysBetween, fmtDate, today } from '../lib/dates'

const EMOJIS = ['⏳', '✈️', '🏖️', '🎄', '🎂', '🏡', '💍', '🚗', '🎓', '🎉', '❤️', '🌍']

export default function Countdowns() {
  const { state, add, remove, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('⏳')
  const [date, setDate] = useState(addDays(today(), 30))

  const items = useMemo(
    () =>
      live(state.countdowns)
        .map((c) => ({ ...c, left: daysBetween(today(), c.date) }))
        .sort((a, b) => a.left - b.left),
    [state.countdowns],
  )

  const save = () => {
    if (!title.trim()) return
    add('countdowns', { title: title.trim(), emoji, date })
    setTitle('')
    setOpen(false)
    toast('Cuenta atrás en marcha ⏳')
  }

  return (
    <div className="page stack">
      <Head
        title="Cuentas atrás"
        sub={state.couple.longDistance ? 'Para el próximo reencuentro' : 'Para lo que estáis esperando'}
        back={back}
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      {items.length === 0 ? (
        <Empty
          emoji="⏳"
          title="Sin cuentas atrás"
          desc="Un viaje, un reencuentro, una mudanza… tener algo que esperar juntos hace mucho."
          action={<Button onClick={() => setOpen(true)}>Crear una</Button>}
        />
      ) : (
        <div className="stack">
          {items.map((c) => {
            const past = c.left < 0
            return (
              <div key={c.id} className={past ? 'card' : 'hero'}>
                <div className="row-between">
                  <div style={{ fontSize: 34 }}>{c.emoji}</div>
                  <button
                    className="tiny"
                    style={{ opacity: 0.8, color: past ? 'var(--muted)' : '#fff' }}
                    onClick={() => remove('countdowns', c.id)}
                  >
                    ✕
                  </button>
                </div>
                <div className="display" style={{ fontSize: 20, marginTop: 8 }}>
                  {c.title}
                </div>
                <div
                  className="display"
                  style={{ fontSize: past ? 22 : 44, lineHeight: 1.1, marginTop: 4 }}
                >
                  {past
                    ? '¡Ya ha pasado!'
                    : c.left === 0
                      ? '¡Es hoy!'
                      : `${c.left} ${c.left === 1 ? 'día' : 'días'}`}
                </div>
                <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{fmtDate(c.date)}</div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva cuenta atrás">
        <div className="stack">
          <Field label="¿Qué esperáis?">
            <Input value={title} onChange={setTitle} placeholder="Nuestro viaje a Roma" />
          </Field>
          <Field label="Icono">
            <div className="chips">
              {EMOJIS.map((e) => (
                <Chip key={e} on={emoji === e} onClick={() => setEmoji(e)}>
                  <span style={{ fontSize: 18 }}>{e}</span>
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Fecha">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button block onClick={save} disabled={!title.trim()}>
            Crear
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
