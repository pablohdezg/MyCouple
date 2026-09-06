/** Utilidades de fecha en español, sin dependencias de zona horaria raras. */

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
export const MESES_CORTOS = MESES.map((m) => m.slice(0, 3))
export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** YYYY-MM-DD en hora local. */
export function iso(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const today = () => iso()

/**
 * La "fecha de esta noche". Igual que hoy, salvo entre las 00:00 y las 05:00,
 * que todavía cuenta como la noche anterior.
 *
 * Si no, uno que se despide a las 23:50 y otro a las 00:10 quedan apuntados en
 * días distintos: la racha no cuenta esa noche y encima el botón vuelve a
 * aparecer a medianoche como si no te hubieras despedido.
 */
export function nightKey(at: Date = new Date()): string {
  const d = new Date(at)
  if (d.getHours() < 5) d.setDate(d.getDate() - 1)
  return iso(d)
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function daysBetween(a: string, b: string): number {
  const ms = parse(b).getTime() - parse(a).getTime()
  return Math.round(ms / 86400000)
}

export function fmtDate(s: string, opts: { year?: boolean; weekday?: boolean } = {}): string {
  if (!s) return ''
  const d = parse(s)
  const wd = opts.weekday ? `${DIAS[(d.getDay() + 6) % 7]}, ` : ''
  const yr = opts.year === false ? '' : ` de ${d.getFullYear()}`
  return `${wd}${d.getDate()} de ${MESES[d.getMonth()]}${yr}`
}

export function fmtShort(s: string): string {
  if (!s) return ''
  const d = parse(s)
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "hace 3 min", "ayer", "12 mar" */
export function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'ahora mismo'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  return fmtShort(iso(new Date(ts)))
}

/** Lunes de la semana de la fecha dada. */
export function mondayOf(s: string = today()): string {
  const d = parse(s)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return iso(d)
}

/** Próxima ocurrencia anual (cumpleaños, aniversario) desde hoy. */
export function nextYearly(dateStr: string, from: string = today()): string {
  const d = parse(dateStr)
  const f = parse(from)
  const cand = new Date(f.getFullYear(), d.getMonth(), d.getDate())
  if (cand.getTime() < f.getTime()) cand.setFullYear(cand.getFullYear() + 1)
  return iso(cand)
}

export function yearsSince(dateStr: string, at: string = today()): number {
  const d = parse(dateStr)
  const a = parse(at)
  let y = a.getFullYear() - d.getFullYear()
  const m = a.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && a.getDate() < d.getDate())) y--
  return y
}

/** Desglose bonito: "2 años, 3 meses y 5 días". */
export function humanDuration(fromStr: string, toStr: string = today()): string {
  const from = parse(fromStr)
  const to = parse(toStr)
  if (to < from) return '—'
  let years = to.getFullYear() - from.getFullYear()
  let months = to.getMonth() - from.getMonth()
  let days = to.getDate() - from.getDate()
  if (days < 0) {
    months--
    days += new Date(to.getFullYear(), to.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }
  const parts: string[] = []
  if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
  if (months) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
  if (days || !parts.length) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

/** Matriz de 6 semanas para el calendario mensual. */
export function monthMatrix(year: number, month: number): string[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const out: string[] = []
  for (let i = 0; i < 42; i++) {
    out.push(iso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)))
  }
  return out
}

export function monthName(year: number, month: number): string {
  return `${MESES[month]} ${year}`
}
