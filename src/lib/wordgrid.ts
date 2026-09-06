import { DICTIONARY } from '../data/dictionary'

export const GRID_SIZES = [4, 5, 6] as const
export const TIME_OPTIONS = [60, 90, 120, 180] as const

const WORDS = new Set(DICTIONARY.filter((w) => w.length >= 3))

export function isWord(word: string): boolean {
  return WORDS.has(word.toLowerCase())
}

/** Bolsa de letras con una frecuencia parecida a la del español, para que
 * salgan tableros jugables (ni todo vocales ni todo consonantes raras). */
const LETTER_BAG: [string, number][] = [
  ['a', 12], ['e', 12], ['o', 9], ['i', 6], ['u', 5],
  ['s', 6], ['n', 5], ['r', 5], ['l', 4], ['t', 4],
  ['d', 5], ['c', 4], ['m', 3], ['p', 3], ['b', 2],
  ['g', 2], ['v', 1], ['y', 1], ['q', 1], ['h', 2],
  ['f', 1], ['z', 1], ['j', 1], ['ñ', 1], ['x', 1],
]

const WEIGHTED_LETTERS = LETTER_BAG.flatMap(([letter, weight]) => Array(weight).fill(letter))

export function randomGrid(size: number): string {
  const letters: string[] = []
  for (let i = 0; i < size * size; i++) {
    letters.push(WEIGHTED_LETTERS[Math.floor(Math.random() * WEIGHTED_LETTERS.length)])
  }
  return letters.join('')
}

/** Índices de las celdas vecinas (las 8 direcciones) de una celda del tablero. */
export function neighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r >= 0 && r < size && c >= 0 && c < size) out.push(r * size + c)
    }
  }
  return out
}

export function areAdjacent(a: number, b: number, size: number): boolean {
  return neighbors(a, size).includes(b)
}

export function wordFromPath(grid: string, path: number[]): string {
  return path.map((i) => grid[i]).join('')
}
