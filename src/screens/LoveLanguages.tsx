import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Bar, Button, Card, Head } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { LANGS, QUIZ, emptyScores, langInfo, topLang, type Lang } from '../data/lovelang'
import type { LoveLangScores } from '../types'

export default function LoveLanguages() {
  const { state, upsert, me, other, toast } = useStore()
  const { back } = useNav()
  const [quiz, setQuiz] = useState(false)
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState<LoveLangScores>(emptyScores)

  const mine = live(state.loveLangs).find((l) => l.id === me)
  const theirs = live(state.loveLangs).find((l) => l.id === other)

  const answer = (lang: Lang) => {
    const next = { ...scores, [lang]: scores[lang] + 1 }
    setScores(next)
    if (step + 1 >= QUIZ.length) {
      upsert('loveLangs', me, () => ({ author: me, scores: next, at: Date.now() }))
      setQuiz(false)
      setStep(0)
      setScores(emptyScores())
      toast('¡Test completado! 💞')
    } else {
      setStep(step + 1)
    }
  }

  const tips = useMemo(() => (theirs ? langInfo(topLang(theirs.scores)) : null), [theirs])

  if (quiz) {
    const q = QUIZ[step]
    return (
      <div className="page stack">
        <Head
          title="Test"
          sub={`Pregunta ${step + 1} de ${QUIZ.length}`}
          back={() => setQuiz(false)}
        />
        <Bar pct={((step + 1) / QUIZ.length) * 100} />
        <p className="muted small center" style={{ marginTop: 8 }}>
          ¿Qué te llena más?
        </p>
        <div className="stack" style={{ marginTop: 10 }}>
          <Card className="pressable" onClick={() => answer(q.la)}>
            <div className="display" style={{ fontSize: 17, lineHeight: 1.4 }}>
              {q.a}
            </div>
          </Card>
          <div className="center muted tiny">o</div>
          <Card className="pressable" onClick={() => answer(q.lb)}>
            <div className="display" style={{ fontSize: 17, lineHeight: 1.4 }}>
              {q.b}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page stack">
      <Head title="Lenguajes del amor" sub="Cómo damos y recibimos cariño" back={back} />

      <Card className="soft small">
        Cada persona siente el amor de una forma distinta. Saber cuál es la del otro evita muchos
        malentendidos: no es que no te quiera, es que te lo dice en otro idioma.
      </Card>

      {(['me', 'other'] as const).map((w) => {
        const who = w === 'me' ? me : other
        const res = w === 'me' ? mine : theirs
        const profile = profileOf(state, who)
        return (
          <Card key={w} className="stack-sm">
            <div className="row">
              <Avatar profile={profile} size="sm" />
              <div className="grow bold">{w === 'me' ? 'Tú' : profile.name}</div>
              {res && <span className="badge">{langInfo(topLang(res.scores)).emoji}</span>}
            </div>
            {res ? (
              <div className="stack-sm">
                {LANGS.map((l) => {
                  const total = Object.values(res.scores).reduce((a, b) => a + b, 0) || 1
                  const pct = (res.scores[l.id] / total) * 100
                  return (
                    <div key={l.id} className="stack-sm" style={{ gap: 4 }}>
                      <div className="row-between tiny">
                        <span>
                          {l.emoji} {l.name}
                        </span>
                        <span className="muted">{Math.round(pct)}%</span>
                      </div>
                      <Bar pct={pct} />
                    </div>
                  )
                })}
              </div>
            ) : w === 'me' ? (
              <Button block onClick={() => setQuiz(true)}>
                Hacer el test ({QUIZ.length} preguntas)
              </Button>
            ) : (
              <div className="muted small">
                {profile.name} todavía no ha hecho el test en su móvil.
              </div>
            )}
          </Card>
        )
      })}

      {mine && (
        <Card className="stack-sm">
          <div className="eyebrow">Tu lenguaje principal</div>
          <div className="display" style={{ fontSize: 20 }}>
            {langInfo(topLang(mine.scores)).emoji} {langInfo(topLang(mine.scores)).name}
          </div>
          <p className="small muted">{langInfo(topLang(mine.scores)).desc}</p>
          <Button variant="ghost" block onClick={() => setQuiz(true)}>
            Repetir el test
          </Button>
        </Card>
      )}

      {tips && (
        <Card className="stack-sm">
          <div className="eyebrow">Cómo querer mejor a {profileOf(state, other).name}</div>
          <div className="display" style={{ fontSize: 18 }}>
            {tips.emoji} {tips.name}
          </div>
          {tips.tips.map((t, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
              <span>💡</span>
              <span className="small grow">{t}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="stack-sm">
        <div className="eyebrow">Los cinco lenguajes</div>
        {LANGS.map((l) => (
          <Card key={l.id} className="tight">
            <div className="row">
              <span style={{ fontSize: 24 }}>{l.emoji}</span>
              <div className="grow">
                <div className="bold small">{l.name}</div>
                <div className="tiny muted">{l.desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
