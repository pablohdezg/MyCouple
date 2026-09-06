import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Chip, Confirm, Empty, Field, Head, Input, Sheet, Slider } from '../components/ui'
import { balance, live, profileOf } from '../store/derive'
import { EXPENSE_CATEGORIES } from '../data/misc'
import { fmtShort, today } from '../lib/dates'
import { money } from '../lib/utils'
import type { Who } from '../types'

export default function Expenses() {
  const { state, add, remove, update, me, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState<Who>(me)
  const [shareA, setShareA] = useState(50)
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [date, setDate] = useState(today())

  const cur = state.settings.currency
  const items = useMemo(
    () => live(state.expenses).sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses],
  )
  const net = balance(state)
  const pending = items.filter((e) => !e.settled)
  const total = pending.reduce((s, e) => s + e.amount, 0)

  const save = () => {
    const value = Number(amount.replace(',', '.'))
    if (!title.trim() || !value || value <= 0) return
    add('expenses', {
      title: title.trim(),
      amount: value,
      paidBy,
      shareA,
      date,
      category,
      settled: false,
    })
    setTitle('')
    setAmount('')
    setShareA(50)
    setOpen(false)
    toast('Gasto anotado 💸')
  }

  const settle = () => {
    // De una sola vez: con muchos gastos pendientes, marcarlos uno a uno
    // repintaba la app tantas veces como gastos hubiera.
    const ids = new Set(pending.map((e) => e.id))
    const at = Date.now()
    update((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (ids.has(e.id) ? { ...e, settled: true, updatedAt: at } : e)),
      updatedAt: at,
    }))
    setSettleOpen(false)
    toast('Cuentas saldadas ✨')
  }

  const debtor = net > 0 ? profileOf(state, 'b') : profileOf(state, 'a')
  const creditor = net > 0 ? profileOf(state, 'a') : profileOf(state, 'b')

  return (
    <div className="page stack">
      <Head
        title="Gastos compartidos"
        sub="Sin cuentas raras entre vosotros"
        back={back}
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      <div className="hero">
        <div className="tiny" style={{ opacity: 0.85, letterSpacing: '.12em', fontWeight: 700 }}>
          BALANCE ACTUAL
        </div>
        {Math.abs(net) < 0.01 ? (
          <div className="display" style={{ fontSize: 26, marginTop: 8 }}>
            Estáis en paz ✨
          </div>
        ) : (
          <>
            <div className="display" style={{ fontSize: 34, marginTop: 6 }}>
              {money(Math.abs(net), cur)}
            </div>
            <div style={{ opacity: 0.94, fontSize: 14 }}>
              {debtor.name} le debe a {creditor.name}
            </div>
          </>
        )}
        <div className="tiny" style={{ opacity: 0.85, marginTop: 10 }}>
          {pending.length} gastos sin saldar · {money(total, cur)} en total
        </div>
      </div>

      {pending.length > 0 && (
        <Button variant="ghost" block onClick={() => setSettleOpen(true)}>
          🤝 Saldar cuentas
        </Button>
      )}

      {items.length === 0 ? (
        <Empty
          emoji="💸"
          title="Sin gastos anotados"
          desc="Anotad la compra, las cenas o el viaje y la app calcula quién debe qué."
          action={<Button onClick={() => setOpen(true)}>Añadir gasto</Button>}
        />
      ) : (
        <div className="list">
          {items.map((e) => (
            <div key={e.id} className={`list-item ${e.settled ? 'dim' : ''}`}>
              <Avatar profile={profileOf(state, e.paidBy)} size="xs" />
              <div className="grow">
                <div className="bold small">{e.title}</div>
                <div className="tiny muted">
                  {fmtShort(e.date)} · {e.category} · {e.shareA === 50 ? 'a medias' : `${e.shareA}/${100 - e.shareA}`}
                  {e.settled ? ' · saldado' : ''}
                </div>
              </div>
              <div className="bold small nowrap">{money(e.amount, cur)}</div>
              <button className="tiny muted" onClick={() => remove('expenses', e.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo gasto">
        <div className="stack">
          <Field label="¿En qué?">
            <Input value={title} onChange={setTitle} placeholder="Compra semanal" />
          </Field>
          <div className="grid-2">
            <Field label={`Importe (${cur})`}>
              <Input value={amount} onChange={setAmount} placeholder="24,50" inputMode="decimal" />
            </Field>
            <Field label="Fecha">
              <input className="input" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
            </Field>
          </div>
          <Field label="¿Quién pagó?">
            <div className="chips">
              {(['a', 'b'] as Who[]).map((w) => (
                <Chip key={w} on={paidBy === w} onClick={() => setPaidBy(w)}>
                  {profileOf(state, w).emoji} {profileOf(state, w).name}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label={`Reparto: ${profileOf(state, 'a').name} ${shareA}% · ${profileOf(state, 'b').name} ${100 - shareA}%`}>
            <Slider value={shareA} onChange={setShareA} min={0} max={100} />
          </Field>
          <Field label="Categoría">
            <div className="chips">
              {EXPENSE_CATEGORIES.map((c) => (
                <Chip key={c} on={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Field>
          <Button block onClick={save} disabled={!title.trim() || !amount}>
            Guardar gasto
          </Button>
        </div>
      </Sheet>

      <Confirm
        open={settleOpen}
        title="¿Saldar cuentas?"
        desc={`Se marcarán como pagados los ${pending.length} gastos pendientes. El balance vuelve a cero.`}
        onCancel={() => setSettleOpen(false)}
        onConfirm={settle}
        confirmLabel="Sí, estamos en paz"
      />
    </div>
  )
}
