import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Head, TextArea } from '../components/ui'
import { live, profileOf, questionOfDay, questionStreak } from '../store/derive'
import { QUESTIONS } from '../data/questions'
import { fmtDate, today } from '../lib/dates'
import type { DailyAnswer } from '../types'

export default function DailyQuestion() {
  const { state, upsert, update, me, other, toast } = useStore()
  const { back } = useNav()
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<'hoy' | 'historial'>('hoy')

  const q = questionOfDay(state)
  const entry = live(state.dailyAnswers).find((a) => a.id === today())
  const mine = entry?.[me]
  const theirs = entry?.[other]
  const streak = questionStreak(state)

  const history = useMemo(
    () =>
      live(state.dailyAnswers)
        .filter((a) => a.id !== today() && (a.a || a.b))
        .sort((x, y) => y.id.localeCompare(x.id)),
    [state.dailyAnswers],
  )

  const answer = () => {
    const text = draft.trim()
    if (!text) return
    upsert('dailyAnswers', today(), (prev) => ({
      ...(prev as DailyAnswer),
      qid: q.qid,
      [me]: { text, at: Date.now() },
    }))
    update((s) => ({
      ...s,
      seenQuestions: [...new Set([...s.seenQuestions, q.qid])],
    }))
    setDraft('')
    toast('Respuesta guardada 💗')
  }

  return (
    <div className="page stack">
      <Head title="Pregunta del día" sub={fmtDate(today(), { weekday: true })} back={back} />

      <div className="row">
        <button className={`chip ${tab === 'hoy' ? 'on' : ''}`} onClick={() => setTab('hoy')}>
          Hoy
        </button>
        <button
          className={`chip ${tab === 'historial' ? 'on' : ''}`}
          onClick={() => setTab('historial')}
        >
          Historial ({history.length})
        </button>
        {streak > 0 && <span className="badge" style={{ marginLeft: 'auto' }}>🔥 {streak} días</span>}
      </div>

      {tab === 'hoy' && (
        <>
          <div className="hero">
            <div className="tiny" style={{ opacity: 0.85, letterSpacing: '0.12em', fontWeight: 700 }}>
              PREGUNTA {q.qid + 1} DE {QUESTIONS.length}
            </div>
            <div className="display" style={{ fontSize: 24, marginTop: 10, lineHeight: 1.32 }}>
              {q.text}
            </div>
          </div>

          {!mine ? (
            <Card className="stack">
              <div className="eyebrow">Tu respuesta</div>
              <TextArea
                value={draft}
                onChange={setDraft}
                rows={5}
                placeholder="Sin prisa. Lo importante es que sea de verdad."
              />
              <Button block onClick={answer} disabled={!draft.trim()}>
                Responder
              </Button>
              <p className="tiny muted center">
                Verás la respuesta de {profileOf(state, other).name} cuando los dos hayáis respondido.
              </p>
            </Card>
          ) : (
            <>
              <Card className="stack-sm">
                <div className="row">
                  <Avatar profile={profileOf(state, me)} size="sm" />
                  <div className="bold small">Tú</div>
                </div>
                <div className="pre">{mine.text}</div>
              </Card>

              <Card className="stack-sm">
                <div className="row">
                  <Avatar profile={profileOf(state, other)} size="sm" />
                  <div className="bold small">{profileOf(state, other).name}</div>
                </div>
                {theirs ? (
                  <div className="pre">{theirs.text}</div>
                ) : (
                  <div className="muted small">
                    Todavía no ha respondido. Cuando lo haga, aparecerá aquí. 💗
                  </div>
                )}
              </Card>

              {theirs && (
                <Card className="soft center small">
                  ✨ Los dos habéis respondido. ¿Habláis un rato de ello?
                </Card>
              )}
            </>
          )}
        </>
      )}

      {tab === 'historial' && (
        <div className="stack">
          {history.length === 0 && (
            <Card className="center muted small">Aún no hay respuestas guardadas.</Card>
          )}
          {history.map((h) => (
            <Card key={h.id} className="stack-sm">
              <div className="tiny muted">{fmtDate(h.id)}</div>
              <div className="display" style={{ fontSize: 16 }}>
                {QUESTIONS[h.qid] ?? 'Pregunta'}
              </div>
              {(['a', 'b'] as const).map((w) =>
                h[w] ? (
                  <div key={w} className="row" style={{ alignItems: 'flex-start' }}>
                    <Avatar profile={profileOf(state, w)} size="xs" />
                    <div className="small pre grow">{h[w]!.text}</div>
                  </div>
                ) : null,
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
