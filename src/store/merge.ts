import type { AppState, Syncable } from '../types'
import { COLLECTIONS } from '../types'

/** Last-write-wins por elemento, respetando tumbas (deleted). */
function mergeList<T extends Syncable>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of local) map.set(item.id, item)
  for (const item of remote) {
    const mine = map.get(item.id)
    if (!mine || (item.updatedAt ?? 0) > (mine.updatedAt ?? 0)) map.set(item.id, item)
  }
  return [...map.values()]
}

/** Une dos estados completos. El más reciente gana en los campos escalares. */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)
  const out: AppState = {
    ...local,
    couple: remoteNewer ? remote.couple : local.couple,
    // Los ajustes son locales de cada dispositivo salvo el modo picante,
    // que se acuerda entre los dos.
    settings: {
      ...local.settings,
      spicy: local.settings.spicy || remote.settings?.spicy || false,
    },
    achievements: mergeAchievements(local.achievements, remote.achievements ?? []),
    seenQuestions: [...new Set([...local.seenQuestions, ...(remote.seenQuestions ?? [])])],
    wrappedYearsNotified: [
      ...new Set([...local.wrappedYearsNotified, ...(remote.wrappedYearsNotified ?? [])]),
    ],
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  }
  for (const key of COLLECTIONS) {
    ;(out as unknown as Record<string, unknown>)[key] = mergeList(
      (local[key] ?? []) as Syncable[],
      (remote[key] ?? []) as Syncable[],
    )
  }
  return out
}

function mergeAchievements(a: { id: string; at: number }[], b: { id: string; at: number }[]) {
  const map = new Map<string, { id: string; at: number }>()
  for (const x of [...a, ...b]) {
    const cur = map.get(x.id)
    if (!cur || x.at < cur.at) map.set(x.id, x)
  }
  return [...map.values()]
}
