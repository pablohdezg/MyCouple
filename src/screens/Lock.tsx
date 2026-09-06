import { useEffect, useState } from 'react'
import { useStore } from '../store/store'
import { haptic } from '../lib/native'

export default function Lock({ onOk }: { onOk: () => void }) {
  const { state } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (code.length < 4) return
    if (code === state.settings.pin) {
      void haptic('medium')
      onOk()
    } else {
      void haptic('heavy')
      setError(true)
      setTimeout(() => {
        setCode('')
        setError(false)
      }, 500)
    }
  }, [code, state.settings.pin, onOk])

  const press = (n: string) => {
    void haptic('light')
    if (n === 'del') setCode((c) => c.slice(0, -1))
    else setCode((c) => (c.length < 4 ? c + n : c))
  }

  return (
    <div className="app">
      <div
        className="page no-nav"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}
      >
        <div className="center stack" style={{ gap: 10 }}>
          <div style={{ fontSize: 46 }} className="beat">
            🔒
          </div>
          <h1>{state.couple.title}</h1>
          <p className="muted small">Introduce vuestro código</p>
        </div>

        <div
          className="row"
          style={{
            justifyContent: 'center',
            gap: 14,
            transform: error ? 'translateX(0)' : undefined,
            animation: error ? 'beat .3s' : undefined,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 15,
                height: 15,
                borderRadius: '50%',
                background: error
                  ? '#e05353'
                  : i < code.length
                    ? 'var(--accent)'
                    : 'var(--line)',
                transition: 'background .2s',
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            maxWidth: 300,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
            k === '' ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() => press(k)}
                className="card"
                style={{
                  aspectRatio: '1.5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: k === 'del' ? 20 : 24,
                  fontWeight: 600,
                  borderRadius: 20,
                }}
              >
                {k === 'del' ? '⌫' : k}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
