import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Bar, Button, Card, Chip, Empty, Field, Head, Input, Sheet, TextArea } from '../components/ui'
import { live } from '../store/derive'
import { BUCKET_META } from '../data/misc'
import { fmtShort, iso } from '../lib/dates'
import { haptic } from '../lib/native'
import type { BucketCategory } from '../types'

const CATS = Object.keys(BUCKET_META) as BucketCategory[]

const SUGGESTIONS: { title: string; category: BucketCategory }[] = [
  { title: 'Ver una aurora boreal', category: 'viajes' },
  { title: 'Aprender a bailar juntos', category: 'crecer' },
  { title: 'Hacer un viaje por carretera', category: 'viajes' },
  { title: 'Adoptar una mascota', category: 'hogar' },
  { title: 'Cocinar un menú de 5 platos', category: 'gastronomia' },
  { title: 'Dormir bajo las estrellas', category: 'romantico' },
  { title: 'Correr una carrera juntos', category: 'aventura' },
  { title: 'Escribir nuestra historia', category: 'futuro' },
  { title: 'Plantar un árbol', category: 'futuro' },
  { title: 'Ir a un concierto de nuestro grupo', category: 'aventura' },
  { title: 'Pasar un finde sin móviles', category: 'romantico' },
  { title: 'Aprender un idioma juntos', category: 'crecer' },
]

export default function Bucket() {
  const { state, add, patch, remove, me, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState<BucketCategory>('viajes')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'hechos'>('todos')

  const items = useMemo(
    () => live(state.bucket).sort((a, b) => Number(a.done) - Number(b.done) || b.updatedAt - a.updatedAt),
    [state.bucket],
  )
  const done = items.filter((i) => i.done).length
  const shown = items.filter((i) =>
    filter === 'todos' ? true : filter === 'hechos' ? i.done : !i.done,
  )

  const save = (t = title, c = cat) => {
    if (!t.trim()) return
    add('bucket', { title: t.trim(), category: c, done: false, note: note.trim() || undefined, author: me })
    setTitle('')
    setNote('')
    setOpen(false)
    toast('Añadido a la lista ⭐')
  }

  const toggle = (id: string, isDone: boolean) => {
    void haptic(isDone ? 'light' : 'medium')
    patch('bucket', id, { done: !isDone, doneAt: !isDone ? Date.now() : undefined })
    if (!isDone) toast('¡Uno menos de la lista! 🎉')
  }

  return (
    <div className="page stack">
      <Head
        title="Lista de deseos"
        sub="Todo lo que queréis vivir juntos"
        back={back}
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      {items.length > 0 && (
        <Card className="stack-sm soft">
          <div className="row-between">
            <span className="bold">
              {done} de {items.length} cumplidos
            </span>
            <span className="accent bold">{Math.round((done / items.length) * 100)}%</span>
          </div>
          <Bar pct={(done / items.length) * 100} />
        </Card>
      )}

      <div className="chips scroll">
        {(['todos', 'pendientes', 'hechos'] as const).map((f) => (
          <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty
          emoji="⭐"
          title="Vuestra lista está vacía"
          desc="Apuntad esos planes que siempre decís que haréis algún día."
          action={<Button onClick={() => setOpen(true)}>Añadir el primero</Button>}
        />
      ) : (
        <div className="stack-sm">
          {CATS.filter((c) => shown.some((i) => i.category === c)).map((c) => (
            <div key={c} className="stack-sm">
              <div className="eyebrow">
                {BUCKET_META[c].emoji} {BUCKET_META[c].name}
              </div>
              <div className="list">
                {shown
                  .filter((i) => i.category === c)
                  .map((i) => (
                    <div key={i.id} className="list-item">
                      <button
                        onClick={() => toggle(i.id, i.done)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          border: '2px solid var(--accent)',
                          background: i.done ? 'var(--accent)' : 'transparent',
                          color: '#fff',
                          fontSize: 13,
                          flex: '0 0 auto',
                        }}
                      >
                        {i.done ? '✓' : ''}
                      </button>
                      <div className="grow" onClick={() => toggle(i.id, i.done)}>
                        <div className={`small bold ${i.done ? 'strike dim' : ''}`}>{i.title}</div>
                        {i.note && <div className="tiny muted">{i.note}</div>}
                        {i.done && i.doneAt && (
                          <div className="tiny accent">✓ {fmtShort(iso(new Date(i.doneAt)))}</div>
                        )}
                      </div>
                      <button className="tiny muted" onClick={() => remove('bucket', i.id)}>
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length < 6 && (
        <Card className="stack-sm">
          <div className="eyebrow">¿Ideas?</div>
          <div className="chips">
            {SUGGESTIONS.filter((s) => !items.some((i) => i.title === s.title))
              .slice(0, 6)
              .map((s) => (
                <Chip key={s.title} onClick={() => save(s.title, s.category)}>
                  ＋ {s.title}
                </Chip>
              ))}
          </div>
        </Card>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo deseo">
        <div className="stack">
          <Field label="¿Qué queréis hacer?">
            <Input value={title} onChange={setTitle} placeholder="Ver la nieve juntos" />
          </Field>
          <Field label="Categoría">
            <div className="chips">
              {CATS.map((c) => (
                <Chip key={c} on={cat === c} onClick={() => setCat(c)}>
                  {BUCKET_META[c].emoji} {BUCKET_META[c].name}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Nota (opcional)">
            <TextArea value={note} onChange={setNote} rows={3} placeholder="En invierno, en los Pirineos…" />
          </Field>
          <Button block onClick={() => save()} disabled={!title.trim()}>
            Añadir a la lista
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
