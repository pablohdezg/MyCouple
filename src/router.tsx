import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/** Router mínimo basado en el hash (funciona igual en web y dentro del APK). */

interface RouterApi {
  path: string
  go: (path: string) => void
  back: () => void
}

const Ctx = createContext<RouterApi | null>(null)

const read = () => window.location.hash.replace(/^#\/?/, '') || 'inicio'

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(read)

  useEffect(() => {
    const onHash = () => setPath(read())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '#/inicio'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((p: string) => {
    window.location.hash = `#/${p.replace(/^\/+/, '')}`
    window.scrollTo({ top: 0 })
  }, [])

  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back()
    else go('inicio')
  }, [go])

  return <Ctx.Provider value={{ path, go, back }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNav(): RouterApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNav fuera del RouterProvider')
  return ctx
}
