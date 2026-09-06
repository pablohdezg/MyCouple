import { DICTIONARY, WORDLE_SOLUTIONS } from '../data/dictionary'

export const WORD_LEN = 5
export const MAX_GUESSES = 6

const GUESS_WORDS = new Set(DICTIONARY.filter((w) => w.length === WORD_LEN))
// Las soluciones también son adivinanzas válidas.
for (const w of WORDLE_SOLUTIONS) GUESS_WORDS.add(w)

/** Palabra del día: la misma para los dos, calculada a partir de la fecha. */
export function wordOfDay(date: string): string {
  let hash = 0
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) | 0
  const idx = Math.abs(hash) % WORDLE_SOLUTIONS.length
  return WORDLE_SOLUTIONS[idx]
}

export function isValidGuess(word: string): boolean {
  return GUESS_WORDS.has(word.toLowerCase())
}

export type LetterState = 'correct' | 'present' | 'absent'

/** Evalúa un intento contra la solución, con el mismo criterio que el Wordle
 * original para letras repetidas (primero se marcan las correctas). */
export function evaluateGuess(guess: string, solution: string): LetterState[] {
  const g = guess.toLowerCase().split('')
  const s = solution.toLowerCase().split('')
  const result: LetterState[] = g.map(() => 'absent')
  const remaining: (string | null)[] = [...s]

  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) {
      result[i] = 'correct'
      remaining[i] = null
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue
    const j = remaining.indexOf(g[i])
    if (j !== -1) {
      result[i] = 'present'
      remaining[j] = null
    }
  }
  return result
}
