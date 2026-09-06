import type { AppState } from '../types'

/* ---------- Notas de "pensando en ti" ---------- */
export const NUDGES: { emoji: string; label: string }[] = [
  { emoji: '💭', label: 'Pensando en ti' },
  { emoji: '🤗', label: 'Necesito un abrazo' },
  { emoji: '😘', label: 'Un beso' },
  { emoji: '☕', label: '¿Nos tomamos algo?' },
  { emoji: '🥺', label: 'Te echo de menos' },
  { emoji: '🎉', label: '¡Tengo buenas noticias!' },
  { emoji: '🫂', label: 'Día difícil' },
  { emoji: '🍕', label: 'Tengo hambre' },
  { emoji: '📞', label: 'Llámame cuando puedas' },
  { emoji: '❤️', label: 'Te quiero' },
  { emoji: '🚗', label: 'Voy de camino' },
  { emoji: '🌙', label: 'Buenas noches' },
]

/* ---------- Frases para la nota del día ---------- */
export const LOVE_LINES: string[] = [
  'Contigo hasta lo aburrido merece la pena.',
  'Elegirte no fue un momento: es algo que hago cada día.',
  'Eres mi sitio favorito para volver.',
  'Me gusta la vida en la que tú apareces.',
  'Gracias por la paciencia que tienes conmigo.',
  'Todo es más fácil cuando te lo puedo contar.',
  'Nuestra rutina es mi plan favorito.',
  'Me sigue haciendo ilusión verte llegar.',
  'Eres la mejor decisión que he tomado sin pensarlo mucho.',
  'Contigo aprendí que querer también es quedarse.',
  'Si algo sale mal, prefiero que salga mal contigo.',
  'Me encanta cómo te ríes cuando nadie te mira.',
  'Aún se me acelera algo cuando entras por la puerta.',
  'Eres mi lugar seguro y mi mejor aventura a la vez.',
  'Prometo seguir eligiéndote en los días normales.',
  'Cada día contigo suma, ninguno resta.',
  'Contigo el tiempo pasa raro: rápido y a la vez suficiente.',
  'No necesito más plan que este.',
  'Te quiero también en los días grises.',
  'Gracias por cuidarme sin que tenga que pedirlo.',
]

/* ---------- Hitos de días juntos ---------- */
export const MILESTONE_DAYS = [
  50, 100, 200, 300, 365, 500, 730, 1000, 1095, 1500, 1825, 2000, 2555, 3000, 3650, 4000, 5000,
  7300, 10000,
]

export function milestoneLabel(days: number): string {
  if (days === 365) return '¡1 año juntos!'
  if (days === 730) return '¡2 años juntos!'
  if (days === 1095) return '¡3 años juntos!'
  if (days === 1825) return '¡5 años juntos!'
  if (days === 3650) return '¡10 años juntos!'
  return `¡${days.toLocaleString('es-ES')} días juntos!`
}

/* ---------- Logros ---------- */
export interface Achievement {
  id: string
  name: string
  emoji: string
  desc: string
  check: (s: AppState) => boolean
}

const alive = <T extends { deleted?: boolean }>(a: T[]) => a.filter((x) => !x.deleted)

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primer-paso',
    name: 'Primer paso',
    emoji: '🌱',
    desc: 'Creasteis vuestro rincón',
    check: (s) => s.onboarded,
  },
  {
    id: 'primer-recuerdo',
    name: 'Primer recuerdo',
    emoji: '📸',
    desc: 'Guardad vuestra primera foto',
    check: (s) => alive(s.memories).length >= 1,
  },
  {
    id: 'album-lleno',
    name: 'Álbum lleno',
    emoji: '🖼️',
    desc: '25 recuerdos guardados',
    check: (s) => alive(s.memories).length >= 25,
  },
  {
    id: 'curiosos',
    name: 'Curiosos',
    emoji: '❓',
    desc: 'Responded 10 preguntas del día',
    check: (s) => alive(s.dailyAnswers).filter((a) => a.a && a.b).length >= 10,
  },
  {
    id: 'inseparables',
    name: 'Inseparables',
    emoji: '🔗',
    desc: '50 preguntas del día respondidas por los dos',
    check: (s) => alive(s.dailyAnswers).filter((a) => a.a && a.b).length >= 50,
  },
  {
    id: 'sonadores',
    name: 'Soñadores',
    emoji: '⭐',
    desc: '10 deseos en la lista',
    check: (s) => alive(s.bucket).length >= 10,
  },
  {
    id: 'cumplidores',
    name: 'Cumplidores',
    emoji: '🏅',
    desc: 'Tachad 5 deseos de la lista',
    check: (s) => alive(s.bucket).filter((b) => b.done).length >= 5,
  },
  {
    id: 'cita-perfecta',
    name: 'Cita perfecta',
    emoji: '🌹',
    desc: 'Puntuad una cita con 5 estrellas',
    check: (s) => alive(s.dates).some((d) => (d.rating ?? 0) >= 5),
  },
  {
    id: 'planazo',
    name: 'Planazo',
    emoji: '🗓️',
    desc: '10 citas completadas',
    check: (s) => alive(s.dates).filter((d) => d.done).length >= 10,
  },
  {
    id: 'agradecidos',
    name: 'Agradecidos',
    emoji: '🙏',
    desc: '20 notas de gratitud',
    check: (s) => alive(s.gratitudes).length >= 20,
  },
  {
    id: 'equipo',
    name: 'Buen equipo',
    emoji: '🤝',
    desc: 'Completad 20 tareas del hogar',
    check: (s) => alive(s.chores).filter((c) => c.lastDoneAt).length >= 20,
  },
  {
    id: 'sinceros',
    name: 'Sinceros',
    emoji: '🕯️',
    desc: 'Haced 4 check-ins semanales',
    check: (s) => alive(s.checkins).filter((c) => c.a && c.b).length >= 4,
  },
  {
    id: 'lenguajes',
    name: 'Nos entendemos',
    emoji: '💞',
    desc: 'Los dos hicisteis el test de lenguajes del amor',
    check: (s) => alive(s.loveLangs).length >= 2,
  },
  {
    id: 'carteros',
    name: 'Carteros del futuro',
    emoji: '💌',
    desc: 'Escribid una carta para el futuro',
    check: (s) => alive(s.letters).length >= 1,
  },
  {
    id: 'cronistas',
    name: 'Cronistas',
    emoji: '📔',
    desc: '25 publicaciones en el muro',
    check: (s) => alive(s.posts).length >= 25,
  },
  {
    id: 'jugones',
    name: 'Jugones',
    emoji: '🎲',
    desc: 'Jugad 30 cartas',
    check: (s) => alive(s.gameLog).length >= 30,
  },
  {
    id: 'cien-dias',
    name: '100 días',
    emoji: '💯',
    desc: 'Cien días juntos',
    check: (s) => daysTogether(s) >= 100,
  },
  {
    id: 'un-ano',
    name: 'Un año',
    emoji: '🎂',
    desc: 'Un año juntos',
    check: (s) => daysTogether(s) >= 365,
  },
  {
    id: 'cinco-anos',
    name: 'Cinco años',
    emoji: '🏆',
    desc: 'Cinco años juntos',
    check: (s) => daysTogether(s) >= 1825,
  },
  {
    id: 'exploradores',
    name: 'Exploradores',
    emoji: '🗺️',
    desc: 'Compartid vuestra ubicación por primera vez',
    check: (s) => alive(s.locations).length >= 2,
  },
  {
    id: 'nuestros-sitios',
    name: 'Nuestros sitios',
    emoji: '📍',
    desc: 'Guardad 3 lugares en el mapa',
    check: (s) => alive(s.places).length >= 3,
  },
  {
    id: 'generosos',
    name: 'Generosos',
    emoji: '🎟️',
    desc: 'Canjead 5 vales de amor',
    check: (s) => alive(s.coupons).filter((c) => c.redeemed).length >= 5,
  },
  {
    id: 'buenas-noches',
    name: 'Buenas noches',
    emoji: '🌙',
    desc: '30 noches despidiéndoos',
    check: (s) => alive(s.nights).length >= 30,
  },
  {
    id: 'voz',
    name: 'Tu voz',
    emoji: '🎙️',
    desc: 'Enviad 10 notas de voz',
    check: (s) => alive(s.messages).filter((m) => m.kind === 'voz').length >= 10,
  },
  {
    id: 'notitas',
    name: 'Notitas',
    emoji: '💌',
    desc: 'Dejaos 10 notas en la portada',
    check: (s) => alive(s.notes).length >= 10,
  },
  {
    id: 'reconciliados',
    name: 'Sabemos volver',
    emoji: '🕊️',
    desc: 'Haced las paces usando el modo reconciliación',
    check: (s) => alive(s.repairs).some((r) => r.closed),
  },
]

/* ---------- Ritual de buenas noches ---------- */
export const NIGHT_LINES = [
  'Que descanses. Mañana seguimos.',
  'Buenas noches, lo mejor de mi día.',
  'Duerme bien, que te quiero.',
  'Hasta mañana, corazón.',
  'Ojalá estuvieras aquí para dormir abrazados.',
  'Gracias por hoy. Buenas noches.',
  'Sueña algo bonito y me lo cuentas.',
  'Descansa, que mañana te veo.',
]

function daysTogether(s: AppState): number {
  const [y, m, d] = s.couple.anniversary.split('-').map(Number)
  if (!y) return 0
  const start = new Date(y, m - 1, d).getTime()
  return Math.floor((Date.now() - start) / 86400000)
}

/* ---------- Etiquetas de estado de ánimo ---------- */
export const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄']
export const MOOD_LABEL = ['Fatal', 'Regular', 'Normal', 'Bien', 'Genial']
export const MOOD_TAGS = [
  'cansado',
  'estresado',
  'feliz',
  'tranquilo',
  'agobiado',
  'motivado',
  'triste',
  'con ganas de mimos',
  'necesito espacio',
  'ilusionado',
  'enfadado',
  'agradecido',
]

/* ---------- Listas ---------- */
export const LIST_META: Record<string, { name: string; emoji: string; verb: string }> = {
  compra: { name: 'La compra', emoji: '🛒', verb: 'Comprado' },
  peliculas: { name: 'Películas', emoji: '🎬', verb: 'Vista' },
  series: { name: 'Series', emoji: '📺', verb: 'Vista' },
  libros: { name: 'Libros', emoji: '📚', verb: 'Leído' },
  restaurantes: { name: 'Restaurantes', emoji: '🍽️', verb: 'Probado' },
  canciones: { name: 'Canciones', emoji: '🎵', verb: 'Escuchada' },
  viajes: { name: 'Viajes', emoji: '✈️', verb: 'Hecho' },
  regalos: { name: 'Regalos', emoji: '🎁', verb: 'Regalado' },
  recetas: { name: 'Recetas', emoji: '🍲', verb: 'Cocinada' },
}

export const BUCKET_META: Record<string, { name: string; emoji: string }> = {
  viajes: { name: 'Viajes', emoji: '✈️' },
  aventura: { name: 'Aventuras', emoji: '🧗' },
  hogar: { name: 'Hogar', emoji: '🏡' },
  gastronomia: { name: 'Comer', emoji: '🍜' },
  romantico: { name: 'Romántico', emoji: '🌹' },
  crecer: { name: 'Crecer', emoji: '🌱' },
  futuro: { name: 'Futuro', emoji: '🔮' },
}

export const CHORE_SUGGESTIONS = [
  { title: 'Fregar los platos', emoji: '🍽️' },
  { title: 'Poner la lavadora', emoji: '🧺' },
  { title: 'Sacar la basura', emoji: '🗑️' },
  { title: 'Hacer la compra', emoji: '🛒' },
  { title: 'Limpiar el baño', emoji: '🚿' },
  { title: 'Pasar la aspiradora', emoji: '🧹' },
  { title: 'Cocinar', emoji: '👨‍🍳' },
  { title: 'Hacer la cama', emoji: '🛏️' },
  { title: 'Regar las plantas', emoji: '🪴' },
  { title: 'Planchar', emoji: '👔' },
]

export const EXPENSE_CATEGORIES = [
  'Casa',
  'Comida',
  'Ocio',
  'Viajes',
  'Regalos',
  'Salud',
  'Transporte',
  'Otros',
]

export const THEMES = [
  { id: 'rubor', name: 'Rubor', color: '#e8567c' },
  { id: 'atardecer', name: 'Atardecer', color: '#e2703a' },
  { id: 'lavanda', name: 'Lavanda', color: '#7c5cd6' },
  { id: 'menta', name: 'Menta', color: '#14907a' },
  { id: 'cielo', name: 'Cielo', color: '#3d6fd6' },
]

export const AVATAR_EMOJIS = [
  '💗','💙','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐧','🦉','🐝','🦋','🌻','🌙','⭐','🍓','🍑','🌸','🔥','🐙','🦄','🐢','🍀',
]
