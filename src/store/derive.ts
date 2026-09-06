import type { AppState, Syncable, Who } from '../types'
import { addDays, daysBetween, iso, nextYearly, parse, today, nightKey } from '../lib/dates'
import { MILESTONE_DAYS, milestoneLabel } from '../data/misc'
import { QUESTIONS } from '../data/questions'
import { seededIndex } from '../lib/utils'

export const live = <T extends Syncable>(list: T[]): T[] => list.filter((x) => !x.deleted)

export const profileOf = (s: AppState, who: Who) => (who === 'a' ? s.couple.a : s.couple.b)

export function daysTogether(s: AppState): number {
  return Math.max(0, daysBetween(s.couple.anniversary, today()))
}

export function nextMilestone(s: AppState): { days: number; label: string; date: string; left: number } | null {
  const d = daysTogether(s)
  const next = MILESTONE_DAYS.find((m) => m > d)
  if (!next) return null
  return {
    days: next,
    label: milestoneLabel(next),
    date: addDays(s.couple.anniversary, next),
    left: next - d,
  }
}

/**
 * Cuántos meses completos lleváis, contando desde el día del mes del
 * aniversario. Si el aniversario cae a final de mes (29/30/31) y el mes en
 * curso es más corto, se cuenta cumplido en el último día de ese mes.
 */
export function monthsTogether(s: AppState, at = today()): number {
  const start = parse(s.couple.anniversary)
  const now = parse(at)
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const targetDay = Math.min(start.getDate(), lastDayOfMonth(now.getFullYear(), now.getMonth()))
  if (now.getDate() < targetDay) months--
  return Math.max(0, months)
}

/** Próxima fecha en la que cumplís mes redondo, y cuántos días faltan. */
export function nextMonthiversary(
  s: AppState,
  at = today(),
): { date: string; months: number; left: number } {
  const start = parse(s.couple.anniversary)
  const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

  const dateFor = (monthsAhead: number) => {
    const totalMonth = start.getMonth() + monthsAhead
    const y = start.getFullYear() + Math.floor(totalMonth / 12)
    const m = ((totalMonth % 12) + 12) % 12
    const day = Math.min(start.getDate(), lastDayOfMonth(y, m))
    return iso(new Date(y, m, day))
  }

  const current = monthsTogether(s, at) + 1
  let date = dateFor(current)
  let months = current
  // Puede coincidir con "hoy": en ese caso ya se cuenta y buscamos el siguiente.
  if (daysBetween(at, date) <= 0) {
    months = current + 1
    date = dateFor(months)
  }
  return { date, months, left: daysBetween(at, date) }
}

/** ¿Hoy es exactamente el día en que cumplís un mes redondo? */
export function isMonthiversaryToday(s: AppState, at = today()): boolean {
  const n = monthsTogether(s, at)
  if (n <= 0) return false
  const start = parse(s.couple.anniversary)
  const now = parse(at)
  const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const targetDay = Math.min(start.getDate(), lastDayOfMonth(now.getFullYear(), now.getMonth()))
  return now.getDate() === targetDay
}

/** Pregunta del día: estable por fecha, evitando repetir hasta agotar. */
export function questionOfDay(s: AppState, date = today()): { qid: number; text: string } {
  // Si ya se respondió hoy, la pregunta queda fijada para siempre a ese día.
  const existing = live(s.dailyAnswers).find((a) => a.id === date)
  if (existing && QUESTIONS[existing.qid]) {
    return { qid: existing.qid, text: QUESTIONS[existing.qid] }
  }
  // La de hoy no cuenta como "vista" hasta que alguien responde.
  const seen = new Set(s.seenQuestions)
  const pool = QUESTIONS.map((_, i) => i).filter((i) => !seen.has(i))
  const list = pool.length ? pool : QUESTIONS.map((_, i) => i)
  const qid = list[seededIndex(date + s.couple.anniversary, list.length)]
  return { qid, text: QUESTIONS[qid] }
}

export interface AgendaEntry {
  id: string
  date: string
  title: string
  emoji: string
  kind: string
  daysLeft: number
}

const KIND_EMOJI: Record<string, string> = {
  evento: '📌',
  aniversario: '💞',
  cumple: '🎂',
  viaje: '✈️',
  cita: '🌹',
  recordatorio: '⏰',
}

/** Todo lo que viene: eventos, cumpleaños, aniversario, hitos y cuentas atrás. */
export function agenda(s: AppState, days = 400): AgendaEntry[] {
  const t = today()
  const out: AgendaEntry[] = []

  for (const e of live(s.events)) {
    const date = e.repeatYearly ? nextYearly(e.date, t) : e.date
    const left = daysBetween(t, date)
    if (left >= 0 && left <= days)
      out.push({ id: e.id, date, title: e.title, emoji: KIND_EMOJI[e.kind] ?? '📌', kind: e.kind, daysLeft: left })
  }

  for (const c of live(s.countdowns)) {
    const left = daysBetween(t, c.date)
    if (left >= 0 && left <= days)
      out.push({ id: c.id, date: c.date, title: c.title, emoji: c.emoji || '⏳', kind: 'cuenta', daysLeft: left })
  }

  const anniv = nextYearly(s.couple.anniversary, t)
  const annLeft = daysBetween(t, anniv)
  if (annLeft <= days) {
    const years = new Date(anniv).getFullYear() - Number(s.couple.anniversary.slice(0, 4))
    out.push({
      id: 'aniversario',
      date: anniv,
      title: `Aniversario · ${years} ${years === 1 ? 'año' : 'años'}`,
      emoji: '💞',
      kind: 'aniversario',
      daysLeft: annLeft,
    })
  }

  for (const who of ['a', 'b'] as Who[]) {
    const p = profileOf(s, who)
    if (p.birthday) {
      const d = nextYearly(p.birthday, t)
      const left = daysBetween(t, d)
      if (left <= days)
        out.push({ id: `cumple-${who}`, date: d, title: `Cumpleaños de ${p.name}`, emoji: '🎂', kind: 'cumple', daysLeft: left })
    }
  }

  const ms = nextMilestone(s)
  if (ms && ms.left <= days)
    out.push({ id: 'hito', date: ms.date, title: ms.label, emoji: '✨', kind: 'hito', daysLeft: ms.left })

  return out.sort((x, y) => x.date.localeCompare(y.date))
}

/** Eventos de un día concreto (para el calendario). */
export function entriesOn(s: AppState, date: string): AgendaEntry[] {
  return agenda(s, 800).filter((e) => e.date === date)
}

/** Racha de días seguidos en que los dos han respondido la pregunta. */
export function questionStreak(s: AppState): number {
  const done = new Set(live(s.dailyAnswers).filter((a) => a.a && a.b).map((a) => a.id))
  let streak = 0
  let cursor = today()
  if (!done.has(cursor)) cursor = addDays(cursor, -1)
  while (done.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Racha de noches seguidas en que los dos se han dado las buenas noches. */
export function nightStreak(s: AppState): number {
  const byDate = new Map<string, Set<Who>>()
  for (const n of live(s.nights)) {
    const set = byDate.get(n.date) ?? new Set<Who>()
    set.add(n.author)
    byDate.set(n.date, set)
  }
  const done = new Set([...byDate].filter(([, whos]) => whos.size === 2).map(([date]) => date))
  let streak = 0
  // La noche en curso cuenta como la de ayer hasta las 5 de la mañana.
  let cursor = nightKey()
  if (!done.has(cursor)) cursor = addDays(cursor, -1)
  while (done.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Racha de días seguidos en que los dos habéis abierto la app. */
export function appStreak(s: AppState): number {
  const byDate = new Map<string, Set<Who>>()
  for (const v of live(s.visits)) {
    const set = byDate.get(v.date) ?? new Set<Who>()
    set.add(v.author)
    byDate.set(v.date, set)
  }
  const done = new Set([...byDate].filter(([, whos]) => whos.size === 2).map(([date]) => date))
  let streak = 0
  let cursor = today()
  if (!done.has(cursor)) cursor = addDays(cursor, -1)
  while (done.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface OnThisDay {
  yearsAgo: number
  memories: AppState['memories']
  posts: AppState['posts']
}

/** «Hoy hace un año»: recuerdos y momentos del mismo día de años pasados. */
export function onThisDay(s: AppState, date = today()): OnThisDay[] {
  const md = date.slice(5)
  const year = Number(date.slice(0, 4))
  const groups = new Map<number, OnThisDay>()

  const put = (y: number, key: 'memories' | 'posts', item: never) => {
    const yearsAgo = year - y
    if (yearsAgo <= 0) return
    const g = groups.get(yearsAgo) ?? { yearsAgo, memories: [], posts: [] }
    ;(g[key] as unknown[]).push(item)
    groups.set(yearsAgo, g)
  }

  for (const m of live(s.memories)) {
    if (m.date.slice(5) === md) put(Number(m.date.slice(0, 4)), 'memories', m as never)
  }
  for (const p of live(s.posts)) {
    const d = iso(new Date(p.createdAt))
    if (d.slice(5) === md) put(Number(d.slice(0, 4)), 'posts', p as never)
  }
  return [...groups.values()].sort((a, b) => a.yearsAgo - b.yearsAgo)
}

export function moodToday(s: AppState, who: Who) {
  return live(s.moods).find((m) => m.date === today() && m.author === who)
}

/** Balance de gastos: positivo => B le debe a A. */
export function balance(s: AppState): number {
  let net = 0
  for (const e of live(s.expenses)) {
    if (e.settled) continue
    const shareA = (e.amount * e.shareA) / 100
    const shareB = e.amount - shareA
    if (e.paidBy === 'a') net += shareB
    else net -= shareA
  }
  return net
}

export function unlockedAchievements(s: AppState): Set<string> {
  return new Set(s.achievements.map((a) => a.id))
}

export function unseenNudges(s: AppState) {
  return live(s.nudges).filter((n) => n.from !== s.me && !n.seen)
}

export function todayIso(): string {
  return iso()
}
