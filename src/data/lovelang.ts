import type { LoveLangScores } from '../types'

export type Lang = keyof LoveLangScores

export const LANGS: { id: Lang; name: string; emoji: string; desc: string; tips: string[] }[] = [
  {
    id: 'palabras',
    name: 'Palabras de afirmación',
    emoji: '💬',
    desc: 'Te llenan las palabras bonitas, los "gracias" y los reconocimientos en voz alta.',
    tips: [
      'Manda un mensaje al azar diciendo algo concreto que admiras.',
      'Deja una nota escrita a mano donde la vaya a encontrar.',
      'Reconoce su esfuerzo delante de otras personas.',
      'Evita la ironía cuando esté vulnerable: le duele más de lo que parece.',
    ],
  },
  {
    id: 'tiempo',
    name: 'Tiempo de calidad',
    emoji: '⏳',
    desc: 'Necesitas atención plena: estar juntos de verdad, sin pantallas de por medio.',
    tips: [
      'Media hora sin móviles vale más que una tarde entera distraídos.',
      'Preguntad y escuchad sin interrumpir ni resolver.',
      'Cread un ritual diario, aunque sea el café de la mañana.',
      'Planea una cita fija a la semana y protégela.',
    ],
  },
  {
    id: 'regalos',
    name: 'Regalos',
    emoji: '🎁',
    desc: 'Valoras el detalle pensado: la prueba física de que alguien pensó en ti.',
    tips: [
      'El valor está en el "me acordé de ti", no en el precio.',
      'Guarda una lista de cosas que menciona de pasada.',
      'Trae algo pequeño cuando vuelvas de un viaje.',
      'Los regalos hechos a mano puntúan doble.',
    ],
  },
  {
    id: 'actos',
    name: 'Actos de servicio',
    emoji: '🧺',
    desc: 'Te sientes querido/a cuando alguien te quita peso de encima sin que lo pidas.',
    tips: [
      'Haz esa tarea que sabes que odia, sin anunciarlo.',
      'Ofrece ayuda concreta: "yo hago la cena", no "dime si necesitas algo".',
      'Anticípate a lo que ya sabes que le agobia.',
      'Cumplir lo que prometes también es un acto de servicio.',
    ],
  },
  {
    id: 'contacto',
    name: 'Contacto físico',
    emoji: '🤗',
    desc: 'La cercanía física te reconforta más que cualquier discurso.',
    tips: [
      'Abrazos largos: los de más de 20 segundos calman de verdad.',
      'Buscad contacto en lo cotidiano: la mano al andar, el pie en el sofá.',
      'Un masaje sin segundas intenciones es un regalo enorme.',
      'Después de discutir, el contacto reconecta antes que las palabras.',
    ],
  },
]

/** 25 pares: elegir A o B. Cada opción suma a un lenguaje. */
export const QUIZ: { a: string; b: string; la: Lang; lb: Lang }[] = [
  { a: 'Me encanta que me digas que estás orgulloso/a de mí', b: 'Me encanta que me abraces sin motivo', la: 'palabras', lb: 'contacto' },
  { a: 'Prefiero una tarde entera para nosotros dos', b: 'Prefiero que me traigas un detalle sorpresa', la: 'tiempo', lb: 'regalos' },
  { a: 'Me llega que me ayudes con mis tareas', b: 'Me llega que me escribas algo bonito', la: 'actos', lb: 'palabras' },
  { a: 'Un masaje después de un día duro', b: 'Que te encargues tú de la cena', la: 'contacto', lb: 'actos' },
  { a: 'Que me guardes un regalito de tu viaje', b: 'Que me dediques la noche entera al volver', la: 'regalos', lb: 'tiempo' },
  { a: 'Que elogies algo que hice bien', b: 'Que te sientes conmigo a hablar sin prisa', la: 'palabras', lb: 'tiempo' },
  { a: 'Ir de la mano por la calle', b: 'Que me hagas un regalo hecho por ti', la: 'contacto', lb: 'regalos' },
  { a: 'Que me resuelvas un recado pesado', b: 'Que me abraces por detrás mientras cocino', la: 'actos', lb: 'contacto' },
  { a: 'Un "te quiero" inesperado a media mañana', b: 'Que te ocupes de algo que me agobiaba', la: 'palabras', lb: 'actos' },
  { a: 'Un finde solos sin planes', b: 'Que me des un beso largo al llegar', la: 'tiempo', lb: 'contacto' },
  { a: 'Que te acuerdes de comprarme eso que mencioné', b: 'Que me digas lo que significo para ti', la: 'regalos', lb: 'palabras' },
  { a: 'Que apagues el móvil cuando hablamos', b: 'Que me prepares el desayuno', la: 'tiempo', lb: 'actos' },
  { a: 'Dormir abrazados', b: 'Que me escribas una carta', la: 'contacto', lb: 'palabras' },
  { a: 'Flores porque sí', b: 'Ver una peli juntos sin distracciones', la: 'regalos', lb: 'tiempo' },
  { a: 'Que hagas la colada sin que la pida', b: 'Que me traigas mi dulce favorito', la: 'actos', lb: 'regalos' },
  { a: 'Que me presumas delante de tus amigos', b: 'Que me busques la mano en el cine', la: 'palabras', lb: 'contacto' },
  { a: 'Una escapada de un día los dos', b: 'Que me dejes una nota en la nevera', la: 'tiempo', lb: 'palabras' },
  { a: 'Que me des un abrazo cuando estoy mal', b: 'Que me organices el día para que descanse', la: 'contacto', lb: 'actos' },
  { a: 'Que me sorprendas con una entrada para algo', b: 'Que me digas cada día algo que te gusta de mí', la: 'regalos', lb: 'palabras' },
  { a: 'Que planeemos algo juntos con tiempo', b: 'Que me arropes o me cuides cuando estoy enfermo/a', la: 'tiempo', lb: 'actos' },
  { a: 'Caricias mientras vemos la tele', b: 'Un souvenir pequeño de donde has estado', la: 'contacto', lb: 'regalos' },
  { a: 'Que reconozcas mi esfuerzo en voz alta', b: 'Que me lleves el desayuno a la cama', la: 'palabras', lb: 'actos' },
  { a: 'Una cena solo para los dos', b: 'Que me regales algo que llevaba tiempo queriendo', la: 'tiempo', lb: 'regalos' },
  { a: 'Un abrazo de 20 segundos', b: 'Una tarde entera hablando', la: 'contacto', lb: 'tiempo' },
  { a: 'Que arregles eso que llevo meses posponiendo', b: 'Que me digas que soy lo mejor que te ha pasado', la: 'actos', lb: 'palabras' },
]

export const emptyScores = (): LoveLangScores => ({
  palabras: 0,
  tiempo: 0,
  regalos: 0,
  actos: 0,
  contacto: 0,
})

export function topLang(scores: LoveLangScores): Lang {
  return (Object.entries(scores) as [Lang, number][]).sort((a, b) => b[1] - a[1])[0][0]
}

export const langInfo = (id: Lang) => LANGS.find((l) => l.id === id)!
