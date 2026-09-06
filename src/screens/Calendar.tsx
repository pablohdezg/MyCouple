import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Button, Card, Empty, Field, Head, Input, Select, Sheet, TextArea, Toggle } from '../components/ui'
import { agenda, live } from '../store/derive'
import { DIAS_CORTOS, fmtDate, monthMatrix, monthName, parse, today } from '../lib/dates'
import type { EventKind } from '../types'

const KINDS: { value: EventKind; label: string }[] = [
  { value: 'evento', label: '📌 Evento' },
  { value: 'cita', label: '🌹 Cita' },
  { value: 'cumple', label: '🎂 Cumpleaños' },
  { value: 'aniversario', label: '💞 Aniversario' },
  { value: 'viaje', label: '✈️ Viaje' },
  { value: 'recordatorio', label: '⏰ Recordatorio' },
]

export default function CalendarScreen() {
  const { state, add, remove, me, toast } = useStore()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(today())
  const [open, setOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('')
  const [kind, setKind] = useState<EventKind>('evento')
  const [notes, setNotes] = useState('')
  const [yearly, setYearly] = useState(false)

  const all = useMemo(() => agenda(state, 800), [state])
  const byDate = useMemo(() => {
    const map = new Map<string, typeof all>()
    for (const e of all) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return map
  }, [all])

  const cells = useMemo(() => monthMatrix(year, month), [year, month])
  const selectedItems = byDate.get(selected) ?? []
  const upcoming = all.filter((e) => e.daysLeft >= 0).slice(0, 12)

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const save = () => {
    if (!title.trim()) return
    add('events', {
      title: title.trim(),
      date,
      time: time || undefined,
      kind,
      notes: notes.trim() || undefined,
      repeatYearly: yearly,
      author: me,
    })
    setTitle('')
    setNotes('')
    setTime('')
    setYearly(false)
    setOpen(false)
    toast('Añadido a la agenda 🗓️')
  }

  return (
    <div className="page stack">
      <Head
        title="Agenda"
        sub="Vuestras fechas importantes"
        right={
          <button className="icon-btn" onClick={() => { setDate(selected); setOpen(true) }}>
            ＋
          </button>
        }
      />

      <Card className="stack-sm">
        <div className="row-between">
          <button className="icon-btn" onClick={() => shift(-1)}>
            ‹
          </button>
          <div className="display bold" style={{ fontSize: 17, textTransform: 'capitalize' }}>
            {monthName(year, month)}
          </div>
          <button className="icon-btn" onClick={() => shift(1)}>
            ›
          </button>
        </div>
        <div className="cal">
          {DIAS_CORTOS.map((d, i) => (
            <div key={i} className="cal-h">
              {d}
            </div>
          ))}
          {cells.map((c) => {
            const d = parse(c)
            const out = d.getMonth() !== month
            const items = byDate.get(c) ?? []
            return (
              <button
                key={c}
                className={`cal-d ${out ? 'out' : ''} ${c === today() ? 'today' : ''} ${
                  c === selected ? 'sel' : ''
                }`}
                onClick={() => setSelected(c)}
              >
                {d.getDate()}
                <span className="dots">
                  {items.slice(0, 3).map((_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="stack-sm">
        <div className="eyebrow" style={{ textTransform: 'uppercase' }}>
          {fmtDate(selected, { weekday: true })}
        </div>
        {selectedItems.length === 0 ? (
          <Card className="center muted small">Nada este día. ¿Improvisamos algo? 💗</Card>
        ) : (
          <div className="list">
            {selectedItems.map((e) => {
              const own = live(state.events).find((x) => x.id === e.id)
              return (
                <div key={e.id} className="list-item">
                  <span style={{ fontSize: 22 }}>{e.emoji}</span>
                  <div className="grow">
                    <div className="bold small">{e.title}</div>
                    {own?.time && <div className="tiny muted">a las {own.time}</div>}
                    {own?.notes && <div className="tiny muted pre">{own.notes}</div>}
                  </div>
                  {own && (
                    <button
                      className="tiny muted"
                      onClick={() => {
                        remove('events', own.id)
                        toast('Evento borrado')
                      }}
                    >
                      Borrar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="stack-sm">
        <div className="eyebrow">Próximamente</div>
        {upcoming.length === 0 ? (
          <Empty emoji="🗓️" title="Sin nada en el horizonte" desc="Añadid cumpleaños, viajes o vuestra próxima cita." />
        ) : (
          <div className="list">
            {upcoming.map((e) => (
              <button
                key={e.id + e.date}
                className="list-item"
                onClick={() => {
                  const d = parse(e.date)
                  setYear(d.getFullYear())
                  setMonth(d.getMonth())
                  setSelected(e.date)
                }}
              >
                <span style={{ fontSize: 20 }}>{e.emoji}</span>
                <div className="grow">
                  <div className="bold small nowrap">{e.title}</div>
                  <div className="tiny muted">{fmtDate(e.date)}</div>
                </div>
                <span className="badge">
                  {e.daysLeft === 0 ? '¡hoy!' : e.daysLeft === 1 ? 'mañana' : `${e.daysLeft} d`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo en la agenda">
        <div className="stack">
          <Field label="¿Qué es?">
            <Input value={title} onChange={setTitle} placeholder="Cena de aniversario" />
          </Field>
          <div className="grid-2">
            <Field label="Fecha">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Hora (opcional)">
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Tipo">
            <Select value={kind} onChange={setKind} options={KINDS} />
          </Field>
          <Field label="Notas (opcional)">
            <TextArea value={notes} onChange={setNotes} rows={3} placeholder="Reservar mesa…" />
          </Field>
          <Card className="tight">
            <Toggle on={yearly} onChange={setYearly} label="Se repite cada año" desc="Ideal para cumpleaños y aniversarios" />
          </Card>
          <Button block onClick={save} disabled={!title.trim()}>
            Guardar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
