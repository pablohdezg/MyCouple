import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Empty, Head, TextArea } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { fmtDate, today } from '../lib/dates'

const PROMPTS = [
  'algo que hizo hoy y me alegró',
  'una cosa suya que me hace sentir en casa',
  'un detalle pequeño que suele pasarme desapercibido',
  'algo que admiro de cómo es con los demás',
  'un momento de hoy que quiero recordar',
  'algo que me facilitó el día',
]

export default function Gratitude() {
  const { state, add, remove, me, toast } = useStore()
  const { back } = useNav()
  const [text, setText] = useState('')

  const items = useMemo(
    () => live(state.gratitudes).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt),
    [state.gratitudes],
  )
  const mineToday = items.filter((g) => g.date === today() && g.author === me).length
  const prompt = PROMPTS[items.length % PROMPTS.length]

  const save = () => {
    if (!text.trim()) return
    add('gratitudes', { author: me, text: text.trim(), date: today() })
    setText('')
    toast('Guardado 🙏')
  }

  return (
    <div className="page stack">
      <Head title="Gratitud" sub="Lo bueno también hay que decirlo" back={back} />

      <Card className="stack">
        <div className="eyebrow">Hoy agradezco…</div>
        <div className="display muted" style={{ fontSize: 15 }}>
          Escribe {prompt}.
        </div>
        <TextArea value={text} onChange={setText} rows={3} placeholder="Hoy agradezco que…" />
        <Button block onClick={save} disabled={!text.trim()}>
          Guardar
        </Button>
        {mineToday > 0 && (
          <div className="tiny muted center">Ya has escrito {mineToday} hoy. Puedes añadir más 💗</div>
        )}
      </Card>

      {items.length === 0 ? (
        <Empty
          emoji="🙏"
          title="Todavía nada"
          desc="Un minuto al día basta. Al cabo de un mes tendréis un listado precioso para releer en los días malos."
        />
      ) : (
        <div className="stack-sm">
          <div className="eyebrow">{items.length} notas de gratitud</div>
          {items.map((g) => (
            <Card key={g.id} className="tight">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Avatar profile={profileOf(state, g.author)} size="xs" />
                <div className="grow">
                  <div className="pre small">{g.text}</div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>
                    {fmtDate(g.date)}
                  </div>
                </div>
                {g.author === me && (
                  <button className="tiny muted" onClick={() => remove('gratitudes', g.id)}>
                    ✕
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
