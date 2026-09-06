import { useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Chip, Confirm, Empty, Field, Head, Input, Sheet, TextArea } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { ago } from '../lib/dates'
import { haptic } from '../lib/native'
import type { Coupon } from '../types'

const IDEAS: { emoji: string; title: string }[] = [
  { emoji: '💆', title: 'Un masaje de 20 minutos' },
  { emoji: '🍳', title: 'Desayuno en la cama' },
  { emoji: '🎬', title: 'Eliges tú la peli' },
  { emoji: '🧹', title: 'Hago tus tareas un día' },
  { emoji: '🚗', title: 'Te llevo donde quieras' },
  { emoji: '🍽️', title: 'Cena hecha por mí' },
  { emoji: '😴', title: 'Duermes media hora más' },
  { emoji: '🤐', title: 'Un "tienes razón" sin discutir' },
  { emoji: '📵', title: 'Una tarde sin móviles' },
  { emoji: '🛁', title: 'Baño preparado con velas' },
  { emoji: '🎁', title: 'Un capricho, yo invito' },
  { emoji: '🫂', title: 'Un abrazo de los largos' },
  { emoji: '🎶', title: 'Bailamos una canción' },
  { emoji: '☕', title: 'Café en la cama un domingo' },
]

const EMOJIS = ['💌', '💆', '🍳', '🎬', '🧹', '🚗', '🍽️', '😴', '🎁', '🛁', '📵', '🫂', '🎶', '☕']

export default function Coupons() {
  const { state, add, patch, remove, me, other, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'recibidos' | 'enviados'>('recibidos')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [emoji, setEmoji] = useState('💌')
  const [redeem, setRedeem] = useState<Coupon | null>(null)

  const all = live(state.coupons)
  const received = all.filter((c) => c.from === other)
  const sent = all.filter((c) => c.from === me)
  const shown = (tab === 'recibidos' ? received : sent).sort(
    (a, b) => Number(a.redeemed) - Number(b.redeemed) || b.updatedAt - a.updatedAt,
  )
  const pending = received.filter((c) => !c.redeemed).length

  const create = (t = title, e = emoji) => {
    if (!t.trim()) return
    add('coupons', {
      title: t.trim(),
      emoji: e,
      note: note.trim() || undefined,
      from: me,
      redeemed: false,
    })
    setTitle('')
    setNote('')
    setOpen(false)
    toast(`Vale enviado a ${profileOf(state, other).name} 🎟️`)
  }

  const redeemCoupon = (c: Coupon) => {
    patch('coupons', c.id, { redeemed: true, redeemedAt: Date.now() })
    setRedeem(null)
    void haptic('heavy')
    toast('¡Vale canjeado! Que lo cumpla 😄')
  }

  return (
    <div className="page stack">
      <Head
        title="Vales de amor"
        sub="Promesas que sí se cumplen"
        back={back}
        right={
          <button className="icon-btn" aria-label="Nuevo vale" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      <div className="chips">
        <Chip on={tab === 'recibidos'} onClick={() => setTab('recibidos')}>
          Para mí {pending > 0 && <span className="badge">{pending}</span>}
        </Chip>
        <Chip on={tab === 'enviados'} onClick={() => setTab('enviados')}>
          Que he regalado ({sent.length})
        </Chip>
      </div>

      {shown.length === 0 ? (
        <Empty
          emoji="🎟️"
          title={tab === 'recibidos' ? 'Todavía no tienes vales' : 'No has regalado ninguno'}
          desc="Un vale es una promesa canjeable: un masaje, una cena, elegir la peli. Se guardan hasta que se usan."
          action={<Button onClick={() => setOpen(true)}>Crear un vale</Button>}
        />
      ) : (
        <div className="stack">
          {shown.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              fromName={profileOf(state, c.from).name}
              canRedeem={tab === 'recibidos' && !c.redeemed}
              onRedeem={() => setRedeem(c)}
              onDelete={c.from === me && !c.redeemed ? () => remove('coupons', c.id) : undefined}
            />
          ))}
        </div>
      )}

      <div className="stack-sm">
        <div className="eyebrow">Ideas rápidas</div>
        <div className="chips">
          {IDEAS.filter((i) => !sent.some((c) => c.title === i.title))
            .slice(0, 8)
            .map((i) => (
              <Chip key={i.title} onClick={() => create(i.title, i.emoji)}>
                ＋ {i.emoji} {i.title}
              </Chip>
            ))}
        </div>
      </div>

      <button className="fab" aria-label="Nuevo vale" onClick={() => setOpen(true)}>
        ＋
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo vale">
        <div className="stack">
          <p className="small muted">
            Escribe algo que te comprometas a cumplir cuando lo canjee. Sin trampas.
          </p>
          <Field label="El vale es por…">
            <Input value={title} onChange={setTitle} placeholder="Un masaje de 20 minutos" />
          </Field>
          <Field label="Icono">
            <div className="chips">
              {EMOJIS.map((e) => (
                <Chip key={e} on={emoji === e} onClick={() => setEmoji(e)}>
                  <span style={{ fontSize: 17 }}>{e}</span>
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Letra pequeña (opcional)">
            <TextArea value={note} onChange={setNote} rows={2} placeholder="Canjeable cualquier día menos los lunes 😄" />
          </Field>
          <Button block onClick={() => create()} disabled={!title.trim()}>
            Regalar el vale
          </Button>
        </div>
      </Sheet>

      <Confirm
        open={!!redeem}
        title={`¿Canjear «${redeem?.title}»?`}
        desc="Se marcará como usado y no se puede deshacer. Avísale para que lo cumpla."
        confirmLabel="Sí, lo quiero ahora"
        onCancel={() => setRedeem(null)}
        onConfirm={() => redeem && redeemCoupon(redeem)}
      />
    </div>
  )
}

function CouponCard({
  coupon,
  fromName,
  canRedeem,
  onRedeem,
  onDelete,
}: {
  coupon: Coupon
  fromName: string
  canRedeem: boolean
  onRedeem: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={`card ${coupon.redeemed ? '' : 'marked'}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        opacity: coupon.redeemed ? 0.62 : 1,
        background: coupon.redeemed ? 'var(--surface)' : 'var(--grad-soft)',
        borderColor: coupon.redeemed ? 'var(--line)' : 'transparent',
      }}
    >
      {/* Muescas de ticket */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -9,
          top: '50%',
          marginTop: -9,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--bg)',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: -9,
          top: '50%',
          marginTop: -9,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--bg)',
        }}
      />
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="stamp lg" style={{ fontSize: 22 }}>
          {coupon.emoji}
        </span>
        <div className="grow">
          <div className="eyebrow">Vale por</div>
          <div className="display" style={{ fontSize: 18, marginTop: 2 }}>
            {coupon.title}
          </div>
          {coupon.note && <div className="tiny muted pre" style={{ marginTop: 4 }}>{coupon.note}</div>}
          <div className="tiny muted" style={{ marginTop: 6 }}>
            De {fromName}
            {coupon.redeemed && coupon.redeemedAt ? ` · canjeado ${ago(coupon.redeemedAt)}` : ''}
          </div>
        </div>
        {onDelete && (
          <button className="icon-btn" aria-label="Borrar vale" onClick={onDelete}>
            🗑️
          </button>
        )}
      </div>
      {canRedeem && (
        <>
          <div className="divider" style={{ borderTop: '1px dashed var(--line-2)', height: 0, background: 'none' }} />
          <Button block size="sm" onClick={onRedeem}>
            Canjear ahora
          </Button>
        </>
      )}
      {coupon.redeemed && (
        <div
          className="badge quiet"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 14,
            transform: 'rotate(-6deg)',
            letterSpacing: '0.12em',
            border: '1px solid var(--line-2)',
          }}
        >
          CANJEADO
        </div>
      )}
    </div>
  )
}
