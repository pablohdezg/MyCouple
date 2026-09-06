import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Chip, Field, Head, Sheet, Slider, TextArea } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { MOOD_FACES, MOOD_LABEL, MOOD_TAGS } from '../data/misc'
import { addDays, fmtDate, fmtShort, mondayOf, today } from '../lib/dates'
import type { CheckIn, MoodEntry } from '../types'

export default function Mood() {
  const { state, upsert, me, other, toast } = useStore()
  const { back } = useNav()
  const [tab, setTab] = useState<'hoy' | 'semana'>('hoy')

  const mineId = `${today()}:${me}`
  const mine = live(state.moods).find((m) => m.id === mineId)
  const theirs = live(state.moods).find((m) => m.id === `${today()}:${other}`)

  const [mood, setMood] = useState(mine?.mood ?? 3)
  const [energy, setEnergy] = useState(mine?.energy ?? 3)
  const [tags, setTags] = useState<string[]>(mine?.tags ?? [])
  const [note, setNote] = useState(mine?.note ?? '')

  const week = mondayOf()
  const check = live(state.checkins).find((c) => c.id === week)
  const myCheck = check?.[me]
  const theirCheck = check?.[other]
  const [ci, setCi] = useState({
    connection: myCheck?.connection ?? 4,
    communication: myCheck?.communication ?? 4,
    intimacy: myCheck?.intimacy ?? 4,
    appreciation: myCheck?.appreciation ?? '',
    need: myCheck?.need ?? '',
  })
  const [ciOpen, setCiOpen] = useState(false)

  const history = useMemo(() => {
    const out: { date: string; a?: MoodEntry; b?: MoodEntry }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today(), -i)
      out.push({
        date: d,
        a: live(state.moods).find((m) => m.id === `${d}:a`),
        b: live(state.moods).find((m) => m.id === `${d}:b`),
      })
    }
    return out
  }, [state.moods])

  const saveMood = () => {
    upsert('moods', mineId, () => ({
      date: today(),
      author: me,
      mood,
      energy,
      tags,
      note: note.trim() || undefined,
    }))
    toast('Guardado. Gracias por contarlo 💗')
  }

  const saveCheck = () => {
    upsert('checkins', week, (prev) => ({
      ...(prev as CheckIn),
      weekOf: week,
      [me]: { ...ci, at: Date.now() },
    }))
    setCiOpen(false)
    toast('Check-in guardado ✨')
  }

  const toggleTag = (t: string) =>
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))

  return (
    <div className="page stack">
      <Head title="Cómo estamos" sub={fmtDate(today(), { weekday: true })} back={back} />

      <div className="chips">
        <Chip on={tab === 'hoy'} onClick={() => setTab('hoy')}>
          🌤️ Hoy
        </Chip>
        <Chip on={tab === 'semana'} onClick={() => setTab('semana')}>
          🕯️ Check-in semanal
        </Chip>
      </div>

      {tab === 'hoy' && (
        <>
          <Card className="stack">
            <div className="center" style={{ fontSize: 52 }}>
              {MOOD_FACES[mood - 1]}
            </div>
            <div className="center display" style={{ fontSize: 19 }}>
              {MOOD_LABEL[mood - 1]}
            </div>
            <Field label="Ánimo">
              <Slider value={mood} onChange={setMood} />
            </Field>
            <Field label={`Energía: ${'▮'.repeat(energy)}${'▯'.repeat(5 - energy)}`}>
              <Slider value={energy} onChange={setEnergy} />
            </Field>
            <Field label="¿Cómo te sientes?">
              <div className="chips">
                {MOOD_TAGS.map((t) => (
                  <Chip key={t} on={tags.includes(t)} onClick={() => toggleTag(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </Field>
            <TextArea value={note} onChange={setNote} rows={2} placeholder="¿Quieres contar algo más?" />
            <Button block onClick={saveMood}>
              {mine ? 'Actualizar' : 'Guardar'}
            </Button>
          </Card>

          <Card className="stack-sm">
            <div className="eyebrow">{profileOf(state, other).name} hoy</div>
            {theirs ? (
              <div className="row">
                <div style={{ fontSize: 34 }}>{MOOD_FACES[theirs.mood - 1]}</div>
                <div className="grow">
                  <div className="bold">{MOOD_LABEL[theirs.mood - 1]}</div>
                  <div className="tiny muted">{theirs.tags.join(' · ') || 'sin etiquetas'}</div>
                  {theirs.note && <div className="small pre" style={{ marginTop: 4 }}>{theirs.note}</div>}
                </div>
              </div>
            ) : (
              <div className="muted small">Todavía no ha registrado cómo está hoy.</div>
            )}
            {theirs && theirs.mood <= 2 && (
              <Card className="soft small">
                💡 Va con el día torcido. Un mensaje, un abrazo o simplemente escuchar suele valer
                más que intentar arreglarlo.
              </Card>
            )}
          </Card>

          <Card className="stack-sm">
            <div className="eyebrow">Últimas dos semanas</div>
            <div className="row" style={{ gap: 4, justifyContent: 'space-between' }}>
              {history.map((h) => (
                <div key={h.date} className="center" style={{ flex: 1 }}>
                  <div style={{ fontSize: 15 }}>{h.a ? MOOD_FACES[h.a.mood - 1] : '·'}</div>
                  <div style={{ fontSize: 15 }}>{h.b ? MOOD_FACES[h.b.mood - 1] : '·'}</div>
                  <div className="tiny muted" style={{ fontSize: 9 }}>
                    {h.date.slice(8)}
                  </div>
                </div>
              ))}
            </div>
            <div className="tiny muted center">
              Arriba {profileOf(state, 'a').name}, abajo {profileOf(state, 'b').name}
            </div>
          </Card>
        </>
      )}

      {tab === 'semana' && (
        <>
          <Card className="soft stack-sm">
            <div className="eyebrow">Semana del {fmtShort(week)}</div>
            <p className="small">
              Diez minutos a la semana para deciros cómo va. Se ve lo que ha puesto el otro cuando
              los dos hayáis respondido.
            </p>
            <Button block onClick={() => setCiOpen(true)}>
              {myCheck ? 'Editar mi check-in' : 'Hacer mi check-in'}
            </Button>
          </Card>

          {myCheck && theirCheck ? (
            <div className="stack">
              {(['a', 'b'] as const).map((w) => {
                const side = check?.[w]
                if (!side) return null
                return (
                  <Card key={w} className="stack-sm">
                    <div className="row">
                      <Avatar profile={profileOf(state, w)} size="sm" />
                      <div className="bold">{profileOf(state, w).name}</div>
                    </div>
                    {[
                      ['Conexión', side.connection],
                      ['Comunicación', side.communication],
                      ['Intimidad', side.intimacy],
                    ].map(([label, v]) => (
                      <div key={String(label)} className="row-between small">
                        <span className="muted">{label}</span>
                        <span>{'❤️'.repeat(Number(v))}{'🤍'.repeat(5 - Number(v))}</span>
                      </div>
                    ))}
                    {side.appreciation && (
                      <div className="small">
                        <span className="eyebrow">Agradezco</span>
                        <div className="pre">{side.appreciation}</div>
                      </div>
                    )}
                    {side.need && (
                      <div className="small">
                        <span className="eyebrow">Necesito</span>
                        <div className="pre">{side.need}</div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="center muted small">
              {myCheck
                ? `Ya está el tuyo. Cuando ${profileOf(state, other).name} responda, veréis los dos.`
                : 'Aún no habéis hecho el check-in de esta semana.'}
            </Card>
          )}

          {live(state.checkins).filter((c) => c.id !== week && c.a && c.b).length > 0 && (
            <div className="stack-sm">
              <div className="eyebrow">Semanas anteriores</div>
              <div className="list">
                {live(state.checkins)
                  .filter((c) => c.id !== week && (c.a || c.b))
                  .sort((x, y) => y.id.localeCompare(x.id))
                  .slice(0, 8)
                  .map((c) => {
                    const avg = (['a', 'b'] as const)
                      .map((w) => c[w])
                      .filter(Boolean)
                      .map((s) => (s!.connection + s!.communication + s!.intimacy) / 3)
                    const mean = avg.reduce((a, b) => a + b, 0) / Math.max(1, avg.length)
                    return (
                      <div key={c.id} className="list-item">
                        <div className="grow small bold">Semana del {fmtShort(c.id)}</div>
                        <span className="badge">{mean.toFixed(1)}/5</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </>
      )}

      <Sheet open={ciOpen} onClose={() => setCiOpen(false)} title="Check-in de la semana">
        <div className="stack">
          {(
            [
              ['connection', 'Lo conectados que me he sentido'],
              ['communication', 'Cómo nos hemos comunicado'],
              ['intimacy', 'Cariño e intimidad'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={`${label}: ${ci[k]}/5`}>
              <Slider value={ci[k]} onChange={(v) => setCi({ ...ci, [k]: v })} />
            </Field>
          ))}
          <Field label="Algo que te agradezco de esta semana">
            <TextArea
              value={ci.appreciation}
              onChange={(v) => setCi({ ...ci, appreciation: v })}
              rows={3}
              placeholder="Gracias por…"
            />
          </Field>
          <Field label="Algo que necesito la semana que viene">
            <TextArea
              value={ci.need}
              onChange={(v) => setCi({ ...ci, need: v })}
              rows={3}
              placeholder="Me vendría bien que…"
            />
          </Field>
          <Button block onClick={saveCheck}>
            Guardar check-in
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
