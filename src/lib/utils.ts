import type { Syncable } from '../types'

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9)

export const now = () => Date.now()

/** Sella un objeto nuevo con id + updatedAt. */
export function seal<T extends object>(obj: T): T & Syncable {
  return { id: uid(), updatedAt: now(), ...obj } as T & Syncable
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Elección estable a partir de una semilla (para "la pregunta de hoy"). */
export function seededIndex(seed: string, len: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % Math.max(1, len)
}

export const alive = <T extends Syncable>(x: T) => !x.deleted

export function sortByDateDesc<T extends { createdAt?: number; updatedAt: number }>(
  arr: T[],
): T[] {
  return [...arr].sort((x, y) => (y.createdAt ?? y.updatedAt) - (x.createdAt ?? x.updatedAt))
}

export const money = (n: number, currency = '€') =>
  `${n.toFixed(2).replace(/\.00$/, '')} ${currency}`

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
