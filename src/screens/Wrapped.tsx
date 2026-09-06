import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Card, Chip, Head, Photo } from '../components/ui'
import { live } from '../store/derive'
import { MESES, daysBetween, fmtDate, iso } from '../lib/dates'
import { money } from '../lib/utils'
import { share } from '../lib/native'

/** "Nuestro año en resumen": las cifras de la pareja, contadas bonito. */

export default function Wrapped() {
  const { state, toast } = useStore()
  const { back } = useNav()
  const thisYear = new Date().getFullYear()
  const isJanuary = new Date().getMonth() === 0
  const [year, setYear] = useState(isJanuary ? thisYear - 1 : thisYear)

  const years = useMemo(() => {
    const start = Number(state.couple.anniversary.slice(0, 4))
    return Array.from({ length: thisYear - start + 1 }, (_, i) => thisYear - i)
  }, [state.couple.anniversary, thisYear])

  const inYear = (d: string) => d.startsWith(String(year))
  const tsInYear = (t: number) => new Date(t).getFullYear() === year

  const d = useMemo(() => {
    const messages = live(state.messages).filter((m) => tsInYear(m.createdAt))
    const posts = live(state.posts).filter((p) => tsInYear(p.createdAt))
    const memories = live(state.memories).filter((m) => inYear(m.date))
    const answers = live(state.dailyAnswers).filter((a) => inYear(a.id) && a.a && a.b)
    const dates = live(state.dates).filter((x) => x.done && (!x.date || inYear(x.date)))
    const wishes = live(state.bucket).filter((b) => b.done && b.doneAt && tsInYear(b.doneAt))
    const chores = live(state.chores).filter((c) => c.lastDoneAt && tsInYear(c.lastDoneAt))
    const expenses = live(state.expenses).filter((e) => inYear(e.date))
    const gratitudes = live(state.gratitudes).filter((g) => inYear(g.date))
    const moods = live(state.moods).filter((m) => inYear(m.date))
    const coupons = live(state.coupons).filter((c) => c.redeemedAt && tsInYear(c.redeemedAt))
    const nights = live(state.nights).filter((n) => inYear(n.date))

    const words = messages.reduce((s, m) => s + (m.kind === 'texto' ? m.text.split(/\s+/).length : 0), 0)

    // Mes con más actividad
    const perMonth = new Array(12).fill(0)
    for (const m of messages) perMonth[new Date(m.createdAt).getMonth()]++
    for (const m of memories) perMonth[Number(m.date.slice(5, 7)) - 1] += 4
    for (const p of posts) perMonth[new Date(p.createdAt).getMonth()] += 3
    const bestMonth = perMonth.indexOf(Math.max(...perMonth))

    // Día más feliz (media de ánimo de los dos)
    const byDay = new Map<string, number[]>()
    for (const m of moods) byDay.set(m.date, [...(byDay.get(m.date) ?? []), m.mood])
    let happiest: { date: string; avg: number } | null = null
    for (const [date, list] of byDay) {
      const avg = list.reduce((a, b) => a + b, 0) / list.length
      if (!happiest || avg > happiest.avg) happiest = { date, avg }
    }

    // Emoji más usado en reacciones
    const reactions = new Map<string, number>()
    for (const p of posts) {
      for (const r of Object.values(p.reactions)) {
        if (r) reactions.set(r, (reactions.get(r) ?? 0) + 1)
      }
    }
    const topReaction = [...reactions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    const bestDate = dates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
    const favPhoto = memories.find((m) => m.favorite && m.mediaId) ?? memories.find((m) => m.mediaId)
    const spent = expenses.reduce((s, e) => s + e.amount, 0)

    return {
      messages: messages.length,
      words,
      posts: posts.length,
      memories: memories.length,
      answers: answers.length,
      dates: dates.length,
      wishes,
      chores: chores.length,
      spent,
      gratitudes: gratitudes.length,
      coupons: coupons.length,
      nights: nights.length,
      perMonth,
      bestMonth,
      happiest,
      topReaction,
      bestDate,
      favPhoto,
      voice: messages.filter((m) => m.kind === 'voz').length,
      drawings: messages.filter((m) => m.kind === 'dibujo').length,
    }
  }, [state, year])

  const daysThisYear =
    year === thisYear
      ? daysBetween(`${year}-01-01`, iso()) + 1
      : daysBetween(`${year}-01-01`, `${year}-12-31`) + 1

  const compartir = () => {
    const t = `Nuestro ${year} 💞
${d.messages} mensajes · ${d.memories} recuerdos · ${d.answers} preguntas respondidas
${d.dates} citas · ${d.wishes.length} deseos cumplidos
El mes más nuestro: ${MESES[d.bestMonth]}`
    void share(t, `Nuestro ${year}`)
    toast('Resumen listo para compartir')
  }

  const empty =
    d.messages + d.memories + d.answers + d.posts + d.dates + d.gratitudes === 0

  return (
    <div className="page stack">
      <Head title={`Nuestro ${year}`} sub="Vuestro año, en números" back={back} />

      {years.length > 1 && (
        <div className="chips scroll">
          {years.map((y) => (
            <Chip key={y} on={y === year} onClick={() => setYear(y)}>
              {y}
            </Chip>
          ))}
        </div>
      )}

      {empty ? (
        <Card className="soft center stack">
          <div className="stamp lg grad" style={{ margin: '0 auto' }}>
            📊
          </div>
          <h2>Aún no hay nada que contar de {year}</h2>
          <p className="small dim2">
            Id usando la app y este resumen se irá llenando solo. Vuelve en unas semanas.
          </p>
        </Card>
      ) : (
        <>
          <div className="hero">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,.82)' }}>
              {daysThisYear} días de {year}
            </div>
            <div className="display" style={{ fontSize: 30, marginTop: 8, lineHeight: 1.2 }}>
              {state.couple.a.name} y {state.couple.b.name}
            </div>
            <div className="hero-rule" />
            <div className="row" style={{ gap: 22 }}>
              {[
                [d.messages, 'mensajes'],
                [d.memories, 'recuerdos'],
                [d.answers, 'preguntas'],
              ].map(([n, l]) => (
                <div key={String(l)}>
                  <div className="display num" style={{ fontSize: 27 }}>
                    {Number(n).toLocaleString('es-ES')}
                  </div>
                  <div className="micro" style={{ opacity: 0.85 }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mes más nuestro */}
          <Card className="stack-sm">
            <span className="eyebrow">El mes más vuestro</span>
            <div className="display" style={{ fontSize: 22, textTransform: 'capitalize' }}>
              {MESES[d.bestMonth]}
            </div>
            <div
              className="row"
              style={{ gap: 3, alignItems: 'flex-end', height: 64, marginTop: 6 }}
            >
              {d.perMonth.map((v, i) => {
                const max = Math.max(1, ...d.perMonth)
                return (
                  <div key={i} className="grow" style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        height: Math.max(3, (v / max) * 52),
                        borderRadius: 4,
                        background: i === d.bestMonth ? 'var(--grad)' : 'var(--accent-soft)',
                        transition: 'height .6s var(--ease)',
                      }}
                    />
                    <div className="micro muted" style={{ fontSize: 8.5, marginTop: 4 }}>
                      {MESES[i][0].toUpperCase()}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div className="grid-2">
            <Stat emoji="💬" value={d.words.toLocaleString('es-ES')} label="palabras escritas" />
            <Stat emoji="📔" value={d.posts} label="momentos en el muro" />
            <Stat emoji="💗" value={d.dates} label="citas hechas" />
            <Stat emoji="⭐" value={d.wishes.length} label="deseos cumplidos" />
            <Stat emoji="🎙️" value={d.voice} label="notas de voz" />
            <Stat emoji="🎨" value={d.drawings} label="dibujos" />
            <Stat emoji="🎟️" value={d.coupons} label="vales canjeados" />
            <Stat emoji="🙏" value={d.gratitudes} label="gracias por escrito" />
            <Stat emoji="🌙" value={d.nights} label="buenas noches" />
            <Stat emoji="🧺" value={d.chores} label="tareas hechas" />
          </div>

          {d.happiest && (
            <Card className="soft stack-sm">
              <span className="eyebrow">Vuestro día más feliz</span>
              <div className="display" style={{ fontSize: 20 }}>
                {fmtDate(d.happiest.date, { weekday: true })}
              </div>
              <div className="small dim2">
                Los dos registrasteis el mejor ánimo del año ese día.
              </div>
            </Card>
          )}

          {d.bestDate && (d.bestDate.rating ?? 0) > 0 && (
            <Card className="stack-sm">
              <span className="eyebrow">La mejor cita del año</span>
              <div className="row">
                <span className="stamp lg" style={{ fontSize: 22 }}>
                  {d.bestDate.emoji}
                </span>
                <div className="grow">
                  <div className="display" style={{ fontSize: 18 }}>
                    {d.bestDate.title}
                  </div>
                  <div className="tiny muted">{'⭐'.repeat(d.bestDate.rating ?? 0)}</div>
                </div>
              </div>
              {d.bestDate.note && <div className="small pre dim2">{d.bestDate.note}</div>}
            </Card>
          )}

          {d.favPhoto?.mediaId && (
            <Card className="stack-sm">
              <span className="eyebrow">La foto del año</span>
              <div style={{ borderRadius: 16, overflow: 'hidden' }}>
                <Photo id={d.favPhoto.mediaId} />
              </div>
              <div className="small dim2">
                {d.favPhoto.caption || 'Sin título'} · {fmtDate(d.favPhoto.date)}
              </div>
            </Card>
          )}

          {d.topReaction && (
            <Card className="tight row">
              <span style={{ fontSize: 30 }}>{d.topReaction}</span>
              <div className="grow small">
                <span className="bold">Vuestra reacción favorita</span>
                <div className="tiny muted">La que más habéis usado este año</div>
              </div>
            </Card>
          )}

          {d.spent > 0 && (
            <Card className="tight row">
              <span className="stamp">
                💶
              </span>
              <div className="grow small">
                <span className="bold num">{money(d.spent, state.settings.currency)}</span>
                <div className="tiny muted">gastados juntos en {year}</div>
              </div>
            </Card>
          )}

          <Button variant="ghost" block onClick={compartir}>
            📤 Compartir el resumen
          </Button>
        </>
      )}
    </div>
  )
}

function Stat({
  emoji,
  value,
  label,
}: {
  emoji: string
  value: number | string
  label: string
}) {
  return (
    <div className="card tight">
      <span className="stamp">{emoji}</span>
      <div className="display num" style={{ fontSize: 25, marginTop: 8, lineHeight: 1 }}>
        {value}
      </div>
      <div className="tiny muted" style={{ marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}
