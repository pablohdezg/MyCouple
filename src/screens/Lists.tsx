import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Chip, Empty, Head, Input, Sheet, Stars } from '../components/ui'
import { live } from '../store/derive'
import { LIST_META } from '../data/misc'
import type { ListKind } from '../types'

const KINDS = Object.keys(LIST_META) as ListKind[]

export default function Lists() {
  const { state, add, patch, remove, me, toast } = useStore()
  const { back } = useNav()
  const [kind, setKind] = useState<ListKind>('peliculas')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')

  const items = useMemo(
    () =>
      live(state.lists)
        .filter((i) => i.list === kind)
        .sort((a, b) => Number(a.done) - Number(b.done) || b.updatedAt - a.updatedAt),
    [state.lists, kind],
  )
  const meta = LIST_META[kind]

  const save = () => {
    if (!title.trim()) return
    add('lists', {
      list: kind,
      title: title.trim(),
      note: note.trim() || undefined,
      done: false,
      addedBy: me,
    })
    setTitle('')
    setNote('')
    setOpen(false)
    toast('Añadido a la lista 📝')
  }

  return (
    <div className="page stack">
      <Head title="Nuestras listas" sub="Lo que queréis ver, leer, comer y visitar" back={back} />

      <div className="chips scroll">
        {KINDS.map((k) => (
          <Chip key={k} on={kind === k} onClick={() => setKind(k)}>
            {LIST_META[k].emoji} {LIST_META[k].name}
          </Chip>
        ))}
      </div>

      <div className="row-between">
        <div className="eyebrow">
          {meta.emoji} {meta.name} · {items.filter((i) => !i.done).length} pendientes
        </div>
        <button className="icon-btn" onClick={() => setOpen(true)}>
          ＋
        </button>
      </div>

      {kind === 'regalos' && (
        <div className="tiny muted" style={{ padding: '0 2px' }}>
          🎁 Trucazo: si es un deseo del otro, podéis reservarlo en secreto para comprarlo — no se le
          enseña a quien lo pidió, para que siga siendo sorpresa.
        </div>
      )}

      {items.length === 0 ? (
        <Empty
          emoji={meta.emoji}
          title={`Sin ${meta.name.toLowerCase()} todavía`}
          desc="Id apuntando lo que os recomienden. Nunca más ese «no sé qué ver»."
          action={<Button onClick={() => setOpen(true)}>Añadir</Button>}
        />
      ) : (
        <div className="list">
          {items.map((i) => {
            const isGift = kind === 'regalos'
            const isMyWish = isGift && i.addedBy === me
            const canReserve = isGift && !isMyWish
            const reservedByMe = i.reservedBy === me
            return (
              <div key={i.id} className="list-item">
                <button
                  onClick={() => patch('lists', i.id, { done: !i.done })}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    border: '2px solid var(--accent)',
                    background: i.done ? 'var(--accent)' : 'transparent',
                    color: '#fff',
                    fontSize: 12,
                    flex: '0 0 auto',
                  }}
                >
                  {i.done ? '✓' : ''}
                </button>
                <div className="grow">
                  <div className={`small bold ${i.done ? 'strike dim' : ''}`}>{i.title}</div>
                  {i.note && <div className="tiny muted">{i.note}</div>}
                  {canReserve && reservedByMe && (
                    <div className="tiny" style={{ color: 'var(--accent)' }}>
                      🎁 Reservado por ti, en secreto
                    </div>
                  )}
                  {i.done && (
                    <Stars value={i.rating ?? 0} size={14} onChange={(v) => patch('lists', i.id, { rating: v })} />
                  )}
                </div>
                {canReserve && (
                  <button
                    className="tiny"
                    style={{ opacity: reservedByMe ? 1 : 0.5, padding: 4 }}
                    title="Reservar en secreto para comprarlo"
                    onClick={() => patch('lists', i.id, { reservedBy: reservedByMe ? undefined : me })}
                  >
                    🎁
                  </button>
                )}
                <button className="tiny muted" onClick={() => remove('lists', i.id)}>
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={`Añadir a ${meta.name}`}>
        <div className="stack">
          <Input value={title} onChange={setTitle} placeholder={`Título de ${meta.name.toLowerCase()}`} />
          <Input value={note} onChange={setNote} placeholder="Nota (dónde, quién lo recomendó…)" />
          <Button block onClick={save} disabled={!title.trim()}>
            Añadir
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
