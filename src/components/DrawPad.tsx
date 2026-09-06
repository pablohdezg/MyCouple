import { useEffect, useRef, useState } from 'react'
import { Button, Chip } from './ui'
import { haptic } from '../lib/native'

/** Pizarra para dibujarle algo a mano y mandárselo. */

const COLORS = ['#d94e77', '#f4845f', '#7454cf', '#128572', '#3767cf', '#3a1f2b', '#f7b267']
const SIZES = [3, 7, 14]

export default function DrawPad({
  onDone,
  onCancel,
}: {
  onDone: (dataUrl: string) => void
  onCancel: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(SIZES[1])
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = cv.clientWidth
    const h = cv.clientHeight
    cv.width = w * dpr
    cv.height = h * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#fffdfc'
    ctx.fillRect(0, 0, w, h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const down = (e: React.PointerEvent) => {
    drawing.current = true
    last.current = pos(e)
    setTouched(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const p = pos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  const up = () => {
    drawing.current = false
  }

  const clear = () => {
    const cv = canvas.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#fffdfc'
    ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.restore()
    setTouched(false)
    void haptic('light')
  }

  return (
    <div className="stack">
      <canvas
        ref={canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          width: '100%',
          height: 300,
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--sh-1)',
          touchAction: 'none',
          background: '#fffdfc',
        }}
      />
      <div className="row-between">
        <div className="chips">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c,
                border: color === c ? '3px solid var(--surface)' : '1px solid var(--line)',
                boxShadow: color === c ? '0 0 0 2px var(--accent)' : 'var(--sh-1)',
              }}
            />
          ))}
        </div>
        <div className="chips">
          {SIZES.map((s) => (
            <Chip key={s} on={width === s} onClick={() => setWidth(s)}>
              <span
                style={{
                  width: s + 4,
                  height: s + 4,
                  borderRadius: '50%',
                  background: 'currentColor',
                  display: 'inline-block',
                }}
              />
            </Chip>
          ))}
        </div>
      </div>
      <div className="row">
        <Button variant="ghost" onClick={clear}>
          Limpiar
        </Button>
        <Button variant="plain" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          block
          disabled={!touched}
          onClick={() => onDone(canvas.current!.toDataURL('image/png'))}
        >
          Enviar dibujo
        </Button>
      </div>
    </div>
  )
}
