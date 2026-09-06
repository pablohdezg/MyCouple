import {
  useEffect,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { loadMediaSynced } from '../lib/storage'
import { haptic } from '../lib/native'
import { useStore } from '../store/store'
import type { Profile } from '../types'

/* ---------------- Botón ---------------- */
export function Button({
  children,
  onClick,
  variant = 'primary',
  size,
  block,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'soft' | 'plain' | 'danger'
  size?: 'sm' | 'lg'
  block?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const cls = ['btn']
  if (variant !== 'primary') cls.push(variant)
  if (size) cls.push(size)
  if (block) cls.push('block')
  return (
    <button
      type={type}
      className={cls.join(' ')}
      disabled={disabled}
      onClick={
        onClick
          ? () => {
              void haptic('light')
              onClick()
            }
          : undefined
      }
    >
      {children}
    </button>
  )
}

/* ---------------- Card ---------------- */
export function Card({
  children,
  className = '',
  onClick,
  style,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <div
      className={`card ${onClick ? 'pressable' : ''} ${className}`}
      style={style}
      onClick={
        onClick
          ? () => {
              void haptic('light')
              onClick()
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

/* ---------------- Cabecera de pantalla ---------------- */
export function Head({
  title,
  sub,
  right,
  back,
}: {
  title: string
  sub?: string
  right?: ReactNode
  back?: () => void
}) {
  return (
    <div>
      {back && (
        <button className="back" onClick={back}>
          ← Volver
        </button>
      )}
      <div className="head">
        <div className="grow">
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="stack">
      <div className="row-between">
        <div className="eyebrow">{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ---------------- Hoja inferior ---------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {title && (
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/* ---------------- Campos ---------------- */
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="tiny muted">{hint}</span>}
    </label>
  )
}

export function Input(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'decimal'
}) {
  const { onChange, ...rest } = props
  return (
    <input
      className="input"
      {...rest}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  )
}

export function TextArea(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const { onChange, ...rest } = props
  return (
    <textarea
      className="textarea"
      {...rest}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  on,
  onChange,
  label,
  desc,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  desc?: string
}) {
  return (
    <div
      className="row-between"
      onClick={() => {
        void haptic('light')
        onChange(!on)
      }}
    >
      <div className="grow">
        <div className="bold">{label}</div>
        {desc && <div className="tiny muted">{desc}</div>}
      </div>
      <div className={`switch ${on ? 'on' : ''}`} />
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 5,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <input
      className="range"
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

/* ---------------- Chips ---------------- */
export function Chip({
  children,
  on,
  onClick,
  solid,
}: {
  children: ReactNode
  on?: boolean
  onClick?: () => void
  solid?: boolean
}) {
  return (
    <button
      className={`chip ${on ? 'on' : ''} ${solid ? 'solid' : ''}`}
      onClick={
        onClick
          ? () => {
              void haptic('light')
              onClick()
            }
          : undefined
      }
    >
      {children}
    </button>
  )
}

/* ---------------- Avatares ---------------- */
export function Avatar({
  profile,
  size = 'md',
}: {
  profile: Profile
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}) {
  const cls = `avatar ${size === 'md' ? '' : size}`
  if (profile.photoId) {
    return (
      <span className={cls}>
        <Photo id={profile.photoId} alt={profile.name} />
      </span>
    )
  }
  return <span className={cls}>{profile.emoji}</span>
}

/** Imagen guardada en IndexedDB. */
export function Photo({
  id,
  alt = '',
  style,
}: {
  id?: string
  alt?: string
  style?: CSSProperties
}) {
  const { state } = useStore()
  const [src, setSrc] = useState<string | undefined>()
  useEffect(() => {
    let ok = true
    if (!id) return setSrc(undefined)
    void loadMediaSynced(id, state.settings.sync).then((d) => ok && setSrc(d))
    return () => {
      ok = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!src) return <span className="shimmer" style={{ width: '100%', height: '100%', ...style }} />
  return <img src={src} alt={alt} style={style} />
}

/** Como Photo, pero admite también vídeo (recuerdos, mensajes...). */
export function Media({
  id,
  kind = 'foto',
  alt = '',
  style,
  controls = true,
}: {
  id?: string
  kind?: 'foto' | 'video'
  alt?: string
  style?: CSSProperties
  controls?: boolean
}) {
  const { state } = useStore()
  const [src, setSrc] = useState<string | undefined>()
  useEffect(() => {
    let ok = true
    if (!id) return setSrc(undefined)
    void loadMediaSynced(id, state.settings.sync).then((d) => ok && setSrc(d))
    return () => {
      ok = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!src) return <span className="shimmer" style={{ width: '100%', height: '100%', ...style }} />
  if (kind === 'video') return <video src={src} style={style} controls={controls} playsInline />
  return <img src={src} alt={alt} style={style} />
}

/* ---------------- Varios ---------------- */
export function Empty({
  emoji,
  title,
  desc,
  action,
}: {
  emoji: string
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="e">{emoji}</div>
      <div className="bold" style={{ color: 'var(--text)' }}>
        {title}
      </div>
      {desc && (
        <div className="small" style={{ marginTop: 4, maxWidth: 320, marginInline: 'auto' }}>
          {desc}
        </div>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

export function Stars({
  value,
  onChange,
  size = 20,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  return (
    <div className="row" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{ fontSize: size, opacity: n <= value ? 1 : 0.25, cursor: onChange ? 'pointer' : undefined }}
          onClick={() => {
            if (onChange) {
              void haptic('light')
              onChange(n === value ? 0 : n)
            }
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  )
}

export function Bar({ pct }: { pct: number }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

/** Lluvia de corazones al conseguir algo bonito. */
export function Hearts({ show, emoji = '❤️' }: { show: boolean; emoji?: string }) {
  const [items, setItems] = useState<{ id: number; left: number; delay: number; e: string }[]>([])
  useEffect(() => {
    if (!show) return
    const pool = [emoji, '💖', '💕', '✨', '💗']
    const list = Array.from({ length: 16 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      e: pool[Math.floor(Math.random() * pool.length)],
    }))
    setItems(list)
    const t = setTimeout(() => setItems([]), 3400)
    return () => clearTimeout(t)
  }, [show, emoji])
  if (!items.length) return null
  return (
    <div className="float-hearts">
      {items.map((i) => (
        <span key={i.id} style={{ left: `${i.left}%`, animationDelay: `${i.delay}s` }}>
          {i.e}
        </span>
      ))}
    </div>
  )
}

export function Confirm({
  open,
  title,
  desc,
  onCancel,
  onConfirm,
  confirmLabel = 'Sí, seguro',
  danger,
}: {
  open: boolean
  title: string
  desc?: string
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <Sheet open={open} onClose={onCancel}>
      <div className="stack" style={{ paddingTop: 6 }}>
        <h2>{title}</h2>
        {desc && <p className="muted small">{desc}</p>}
        <div className="row" style={{ marginTop: 6 }}>
          <Button variant="ghost" block onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
