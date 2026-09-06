/** Modelo de datos de la app. Todo local-first, con merge por marca de tiempo. */

export type ID = string
export type Who = 'a' | 'b'
export type WhoAll = Who | 'ambos'

/** Todo objeto sincronizable lleva id + updatedAt (+ deleted para tumbas). */
export interface Syncable {
  id: ID
  updatedAt: number
  deleted?: boolean
}

export interface Profile {
  name: string
  emoji: string
  photoId?: string
  birthday?: string
  city?: string
}

export interface Reaction {
  a?: string
  b?: string
}

export interface Comment {
  id: ID
  author: Who
  text: string
  createdAt: number
}

export interface Post extends Syncable {
  author: Who
  text: string
  photoId?: string
  audioId?: string
  createdAt: number
  reactions: Reaction
  comments: Comment[]
  pinned?: boolean
}

export interface Message extends Syncable {
  author: Who
  text: string
  createdAt: number
  kind?: 'texto' | 'nudge' | 'sticker' | 'voz' | 'dibujo' | 'foto' | 'video'
  /** Foto, vídeo, nota de voz o dibujo guardados en IndexedDB. */
  mediaId?: string
  /** Duración en segundos de la nota de voz o el vídeo. */
  dur?: number
  /**
   * "Ver una vez": el archivo se borra de IndexedDB en cuanto el
   * destinatario lo abre. `viewedAt` marca que ya se consumió (o que el
   * propio autor ya vio la confirmación).
   */
  once?: boolean
  viewedAt?: number
  /** Reacción rápida con doble toque (una por persona). */
  reactions?: Reaction
  /** Cuándo lo abrió el destinatario: para el doble check azul. */
  seenAt?: number
}

export type EventKind = 'evento' | 'aniversario' | 'cumple' | 'viaje' | 'cita' | 'recordatorio'

export interface EventItem extends Syncable {
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:mm
  kind: EventKind
  notes?: string
  repeatYearly?: boolean
  remindDaysBefore?: number
  author: Who
}

export interface Memory extends Syncable {
  mediaId?: string
  mediaKind?: 'foto' | 'video'
  caption: string
  date: string
  album?: string
  favorite?: boolean
  author: Who
  place?: string
  lat?: number
  lon?: number
  comments?: Comment[]
}

/* ---------- Mapa ---------- */

export interface LocationPing extends Syncable {
  /** id === 'a' | 'b': cada persona tiene una única posición actual. */
  who: Who
  lat: number
  lon: number
  accuracy?: number
  at: number
  /** Nombre del lugar guardado en el que se encuentra, si coincide con alguno. */
  placeId?: string
  battery?: number
}

export interface Place extends Syncable {
  name: string
  emoji: string
  lat: number
  lon: number
  /** Radio en metros para dar por hecho que alguien "está" aquí. */
  radius: number
}

/* ---------- Vales de amor ---------- */

export interface Coupon extends Syncable {
  title: string
  emoji: string
  note?: string
  from: Who
  redeemed: boolean
  redeemedAt?: number
  expiresOn?: string
}

/* ---------- Ritual de buenas noches ---------- */

export interface NightCheck extends Syncable {
  /** id === `${fecha}:${autor}` */
  date: string
  author: Who
  at: number
  message?: string
}

/* ---------- Nota para el otro ---------- */

export interface LoveNote extends Syncable {
  author: Who
  text: string
  at: number
}

/* ---------- Reconciliación ---------- */

export interface Repair extends Syncable {
  author: Who
  at: number
  feeling: string
  need: string
  sorry: string
  closed: boolean
}

export interface Album extends Syncable {
  name: string
  emoji: string
}

export interface Answer {
  text: string
  at: number
}

export interface DailyAnswer extends Syncable {
  /** id === fecha YYYY-MM-DD */
  qid: number
  a?: Answer
  b?: Answer
}

export type BucketCategory =
  | 'viajes'
  | 'aventura'
  | 'hogar'
  | 'gastronomia'
  | 'romantico'
  | 'crecer'
  | 'futuro'

export interface BucketItem extends Syncable {
  title: string
  category: BucketCategory
  done: boolean
  doneAt?: number
  photoId?: string
  note?: string
  author: Who
}

export interface DatePlan extends Syncable {
  title: string
  emoji: string
  date?: string
  done: boolean
  rating?: number
  note?: string
  tags: string[]
  /** Cita "sorpresa": quien la guarda oculta el plan al otro hasta el día. */
  secret?: boolean
  plannedBy?: Who
}

export type ListKind =
  | 'compra'
  | 'peliculas'
  | 'series'
  | 'libros'
  | 'restaurantes'
  | 'canciones'
  | 'viajes'
  | 'regalos'
  | 'recetas'

export interface ListItem extends Syncable {
  list: ListKind
  title: string
  note?: string
  done: boolean
  rating?: number
  addedBy: Who
  forWho?: WhoAll
  /**
   * Sólo para la lista de regalos: quién lo ha reservado en secreto para
   * comprarlo. Se oculta a quien añadió el deseo, para que siga siendo
   * sorpresa.
   */
  reservedBy?: Who
}

export interface Chore extends Syncable {
  title: string
  emoji: string
  assignee: WhoAll
  repeat: 'ninguna' | 'diaria' | 'semanal' | 'mensual'
  done: boolean
  lastDoneAt?: number
  points: number
}

export interface Expense extends Syncable {
  title: string
  amount: number
  paidBy: Who
  shareA: number // 0..100, parte que le corresponde a A
  date: string
  category: string
  settled: boolean
}

export interface MoodEntry extends Syncable {
  /** id === `${fecha}:${autor}` */
  date: string
  author: Who
  mood: number // 1..5
  energy: number // 1..5
  tags: string[]
  note?: string
}

export interface CheckInSide {
  connection: number
  communication: number
  intimacy: number
  appreciation: string
  need: string
  at: number
}

export interface CheckIn extends Syncable {
  /** id === lunes de la semana YYYY-MM-DD */
  weekOf: string
  a?: CheckInSide
  b?: CheckInSide
}

export interface LoveLangScores {
  palabras: number
  tiempo: number
  regalos: number
  actos: number
  contacto: number
}

export interface LoveLangResult extends Syncable {
  /** id === autor */
  author: Who
  scores: LoveLangScores
  at: number
}

export interface Letter extends Syncable {
  author: Who
  title: string
  body: string
  openAt: string // YYYY-MM-DD
  opened: boolean
  createdAt: number
}

export interface Gratitude extends Syncable {
  author: Who
  text: string
  date: string
}

export interface Countdown extends Syncable {
  title: string
  emoji: string
  date: string
}

export interface Nudge extends Syncable {
  from: Who
  emoji: string
  label: string
  at: number
  seen: boolean
}

/** Un "sello" de que alguien abrió la app ese día, para la racha de pareja. */
export interface AppVisit extends Syncable {
  date: string
  author: Who
}

export interface GameLog extends Syncable {
  deck: string
  cardId: string
  at: number
}

export interface CustomCard extends Syncable {
  deck: string
  text: string
  author: Who
}

/** Un intento de la palabra del día, uno por persona. */
export interface WordleSide {
  guesses: string[]
  won: boolean
  finishedAt: number
}

export interface WordleResult extends Syncable {
  /** id === fecha YYYY-MM-DD */
  date: string
  word: string
  a?: WordleSide
  b?: WordleSide
}

/** Una partida de "Enlaza letras": misma cuadrícula para los dos, cada uno
 * busca palabras por su cuenta y luego se comparan. */
export interface WordGameSide {
  words: string[]
  finishedAt: number
}

export interface WordGame extends Syncable {
  size: number
  seconds: number
  /** Letras de la cuadrícula, en orden de fila. */
  grid: string
  startedBy: Who
  createdAt: number
  /** Los dos tienen que unirse antes de que nadie pueda jugar. */
  joinedA?: boolean
  joinedB?: boolean
  /** Momento exacto (reloj real) en que empieza la partida para los dos.
   * Se fija con unos segundos de margen para que dé tiempo a que llegue al
   * otro móvil, y así los dos empiezan y terminan a la vez. */
  startAt?: number
  a?: WordGameSide
  b?: WordGameSide
}

export interface Settings {
  theme: string
  dark: boolean
  pin?: string
  spicy: boolean
  notifications: boolean
  currency: string
  /** Compartir la ubicación con la otra persona (siempre voluntario). */
  shareLocation: boolean
  sync: {
    enabled: boolean
    url: string
    key: string
    code: string
    lastSync?: number
  }
}

export interface Couple {
  a: Profile
  b: Profile
  anniversary: string // YYYY-MM-DD
  metOn?: string
  longDistance: boolean
  title: string
}

export interface AppState {
  version: number
  onboarded: boolean
  me: Who
  couple: Couple
  settings: Settings
  posts: Post[]
  messages: Message[]
  events: EventItem[]
  memories: Memory[]
  albums: Album[]
  dailyAnswers: DailyAnswer[]
  bucket: BucketItem[]
  dates: DatePlan[]
  lists: ListItem[]
  chores: Chore[]
  expenses: Expense[]
  moods: MoodEntry[]
  checkins: CheckIn[]
  loveLangs: LoveLangResult[]
  letters: Letter[]
  gratitudes: Gratitude[]
  countdowns: Countdown[]
  nudges: Nudge[]
  gameLog: GameLog[]
  customCards: CustomCard[]
  wordleResults: WordleResult[]
  wordGames: WordGame[]
  visits: AppVisit[]
  locations: LocationPing[]
  places: Place[]
  coupons: Coupon[]
  notes: LoveNote[]
  nights: NightCheck[]
  repairs: Repair[]
  achievements: { id: string; at: number }[]
  seenQuestions: number[]
  /** Años de los que ya se ha avisado de que su "Nuestro año" está listo. */
  wrappedYearsNotified: number[]
  updatedAt: number
}

/** Claves de colección sincronizables (arrays de Syncable). */
export type CollectionKey =
  | 'posts'
  | 'messages'
  | 'events'
  | 'memories'
  | 'albums'
  | 'dailyAnswers'
  | 'bucket'
  | 'dates'
  | 'lists'
  | 'chores'
  | 'expenses'
  | 'moods'
  | 'checkins'
  | 'loveLangs'
  | 'letters'
  | 'gratitudes'
  | 'countdowns'
  | 'nudges'
  | 'gameLog'
  | 'customCards'
  | 'wordleResults'
  | 'wordGames'
  | 'visits'
  | 'locations'
  | 'places'
  | 'coupons'
  | 'notes'
  | 'nights'
  | 'repairs'

export const COLLECTIONS: CollectionKey[] = [
  'posts',
  'messages',
  'events',
  'memories',
  'albums',
  'dailyAnswers',
  'bucket',
  'dates',
  'lists',
  'chores',
  'expenses',
  'moods',
  'checkins',
  'loveLangs',
  'letters',
  'gratitudes',
  'countdowns',
  'nudges',
  'gameLog',
  'customCards',
  'wordleResults',
  'wordGames',
  'visits',
  'locations',
  'places',
  'coupons',
  'notes',
  'nights',
  'repairs',
]
