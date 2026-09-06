import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { Avatar, Chip, Confirm, Empty, Sheet, Toggle } from '../components/ui'
import DrawPad from '../components/DrawPad'
import { deleteMedia } from '../lib/media'
import { deleteRemoteMedia, loadMediaSynced, saveMediaSynced } from '../lib/storage'
import { VoiceRecorder, fmtDuration, micErrorMessage } from '../lib/audio'
import { uid } from '../lib/utils'
import type { Message } from '../types'
import { live, profileOf } from '../store/derive'
import { fmtDate, fmtTime, iso } from '../lib/dates'
import { NUDGES } from '../data/misc'
import { haptic } from '../lib/native'

const STICKERS = ['❤️', '😘', '🥰', '🤗', '😂', '🥺', '😴', '🍕', '☕', '🌙', '✨', '🌹', '🐻', '💐']

/** Tamaño máximo de un vídeo antes de convertirlo: los móviles graban
 * clips pesados y guardarlos en base64 los infla aún más. */
const MAX_VIDEO_MB = 25

export default function Chat() {
  const { state, add, patch, remove, update, me, other, toast } = useStore()
  const [text, setText] = useState('')
  const [panel, setPanel] = useState<'no' | 'stickers' | 'dibujo' | 'adjuntar'>('no')
  const [recSecs, setRecSecs] = useState<number | null>(null)
  const [onceMode, setOnceMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toDelete, setToDelete] = useState<Message | null>(null)
  const [viewing, setViewing] = useState<Message | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const recorder = useRef(new VoiceRecorder())
  const timer = useRef<number | undefined>(undefined)
  const fileInput = useRef<HTMLInputElement>(null)
  const pickKind = useRef<'foto' | 'video'>('foto')

  const cfg = state.settings.sync
  const msgs = useMemo(
    () => live(state.messages).sort((a, b) => a.createdAt - b.createdAt),
    [state.messages],
  )
  const otherP = profileOf(state, other)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  /**
   * Marca de una sola vez los avisos vistos y el doble check de los mensajes
   * que llegan del otro.
   *
   * Antes se hacía uno a uno: con muchos mensajes sin leer eran decenas de
   * actualizaciones seguidas del estado entero, y el chat se quedaba pillado
   * al abrirlo en móviles justitos.
   */
  const pendingNudges = state.nudges.filter((n) => !n.deleted && n.from !== me && !n.seen).length
  const pendingSeen = state.messages.filter((m) => !m.deleted && m.author !== me && !m.seenAt).length
  useEffect(() => {
    if (!pendingNudges && !pendingSeen) return
    const at = Date.now()
    update((s) => ({
      ...s,
      nudges: pendingNudges
        ? s.nudges.map((n) =>
            !n.deleted && n.from !== me && !n.seen ? { ...n, seen: true, updatedAt: at } : n,
          )
        : s.nudges,
      messages: pendingSeen
        ? s.messages.map((m) =>
            !m.deleted && m.author !== me && !m.seenAt ? { ...m, seenAt: at, updatedAt: at } : m,
          )
        : s.messages,
      updatedAt: at,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNudges, pendingSeen])

  useEffect(() => () => window.clearInterval(timer.current), [])

  /** Doble toque en una burbuja: reacción rápida con ❤️ (una por persona, se quita si repites). */
  const toggleReaction = (m: Message) => {
    const mine = me === 'a' ? m.reactions?.a : m.reactions?.b
    const next = { ...m.reactions, [me]: mine ? undefined : '❤️' }
    patch('messages', m.id, { reactions: next })
    void haptic('light')
  }

  const send = (t: string, kind: Message['kind'] = 'texto') => {
    const v = t.trim()
    if (!v) return
    add('messages', { author: me, text: v, createdAt: Date.now(), kind })
    setText('')
    void haptic('light')
  }

  const startRec = async () => {
    try {
      await recorder.current.start()
      setRecSecs(0)
      void haptic('medium')
      timer.current = window.setInterval(() => setRecSecs((x) => (x ?? 0) + 1), 1000)
    } catch (e) {
      toast(micErrorMessage(e))
    }
  }

  const stopRec = async (keep: boolean) => {
    window.clearInterval(timer.current)
    if (!keep) {
      recorder.current.cancel()
      setRecSecs(null)
      return
    }
    try {
      const { dataUrl, seconds } = await recorder.current.stop()
      const id = uid()
      await saveMediaSynced(id, dataUrl, cfg)
      add('messages', {
        author: me,
        text: `Nota de voz · ${fmtDuration(seconds)}`,
        createdAt: Date.now(),
        kind: 'voz',
        mediaId: id,
        dur: seconds,
      })
      void haptic('medium')
    } catch (e) {
      toast(micErrorMessage(e))
    }
    setRecSecs(null)
  }

  const sendDrawing = async (dataUrl: string) => {
    const id = uid()
    await saveMediaSynced(id, dataUrl, cfg)
    add('messages', {
      author: me,
      text: 'Un dibujo para ti',
      createdAt: Date.now(),
      kind: 'dibujo',
      mediaId: id,
    })
    setPanel('no')
    toast('Dibujo enviado 🎨')
  }

  const openPicker = (kind: 'foto' | 'video') => {
    pickKind.current = kind
    setPanel('no')
    fileInput.current?.click()
  }

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const kind = pickKind.current
    const isPhoto = kind === 'foto'
    if (!isPhoto && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast(`Ese vídeo pesa demasiado (máx. ${MAX_VIDEO_MB} MB). Prueba con uno más corto.`)
      return
    }
    setBusy(true)
    try {
      const dataUrl = await readAsDataUrl(file)
      const id = uid()
      await saveMediaSynced(id, dataUrl, cfg)
      add('messages', {
        author: me,
        text: isPhoto ? '📷 Foto' : '🎥 Vídeo',
        createdAt: Date.now(),
        kind: isPhoto ? 'foto' : 'video',
        mediaId: id,
        once: onceMode,
      })
      void haptic('medium')
      toast(onceMode ? 'Enviado para ver una vez' : isPhoto ? 'Foto enviada' : 'Vídeo enviado')
    } catch {
      toast('No se pudo enviar el archivo')
    }
    setOnceMode(false)
    setBusy(false)
  }

  /** Al abrir un "ver una vez", se consume: se borra el archivo para siempre. */
  const consumeOnce = async (m: Message) => {
    setViewing(m)
    if (m.viewedAt || !m.mediaId) return
    patch('messages', m.id, { viewedAt: Date.now() })
    const id = m.mediaId
    setTimeout(() => {
      void deleteMedia(id)
      void deleteRemoteMedia(cfg, id)
    }, 4000) // deja un respiro para que se termine de ver antes de borrarlo
  }

  const confirmDelete = () => {
    if (!toDelete) return
    if (toDelete.mediaId) {
      void deleteMedia(toDelete.mediaId)
      void deleteRemoteMedia(cfg, toDelete.mediaId)
    }
    remove('messages', toDelete.id)
    setToDelete(null)
    toast('Mensaje borrado')
  }

  let lastDay = ''

  return (
    <div className="page stack" style={{ paddingBottom: 'calc(var(--nav-h) + 92px)' }}>
      <input
        ref={fileInput}
        type="file"
        accept={pickKind.current === 'foto' ? 'image/*' : 'video/*'}
        style={{ display: 'none' }}
        onChange={(e) => void onFilePicked(e)}
      />

      <div className="row" style={{ marginBottom: 8 }}>
        <Avatar profile={otherP} size="sm" />
        <div className="grow">
          <div className="bold">{otherP.name}</div>
          <div className="tiny muted">Vuestro chat privado</div>
        </div>
      </div>

      {msgs.length === 0 && (
        <Empty
          emoji="💬"
          title="Aquí empieza la conversación"
          desc="Este chat vive en vuestros móviles. Si activáis la sincronización, os llegan los mensajes del otro."
        />
      )}

      <div className="bubbles">
        {msgs.map((m) => {
          const day = iso(new Date(m.createdAt))
          const showDay = day !== lastDay
          lastDay = day
          const mine = m.author === me
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              {showDay && (
                <div className="center tiny muted" style={{ margin: '10px 0 2px' }}>
                  {fmtDate(day, { weekday: true })}
                </div>
              )}
              <div
                className={`row ${mine ? '' : ''}`}
                style={{ justifyContent: mine ? 'flex-end' : 'flex-start', gap: 4 }}
              >
                {mine && (
                  <button
                    className="tiny muted"
                    aria-label="Borrar mensaje"
                    style={{ alignSelf: 'center', opacity: 0.5, padding: 4 }}
                    onClick={() => setToDelete(m)}
                  >
                    🗑️
                  </button>
                )}
                <div className="bubble-wrap" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  <div
                    className={`bubble ${mine ? 'me' : 'you'}`}
                    onDoubleClick={() => toggleReaction(m)}
                  >
                    {m.kind === 'sticker' ? (
                      <div style={{ fontSize: 42, lineHeight: 1.1, textAlign: 'center' }}>{m.text}</div>
                    ) : m.kind === 'voz' ? (
                      <VoiceBubble id={m.mediaId} seconds={m.dur ?? 0} mine={mine} cfg={cfg} />
                    ) : m.kind === 'dibujo' ? (
                      <MediaBubble id={m.mediaId} cfg={cfg} kind="foto" />
                    ) : m.kind === 'foto' || m.kind === 'video' ? (
                      <OnceAwareMedia m={m} cfg={cfg} onOpen={() => void consumeOnce(m)} />
                    ) : (
                      <div>{m.text}</div>
                    )}
                    <div className="bubble-meta">
                      {fmtTime(m.createdAt)}
                      {mine && <span style={{ marginLeft: 4 }}>{m.seenAt ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                  {(m.reactions?.a || m.reactions?.b) && (
                    <div
                      className="tiny"
                      style={{
                        position: 'absolute',
                        bottom: -10,
                        [mine ? 'left' : 'right']: 6,
                        background: 'var(--card)',
                        borderRadius: 10,
                        padding: '1px 5px',
                        boxShadow: '0 1px 4px rgba(0,0,0,.12)',
                      }}
                    >
                      {m.reactions?.a}
                      {m.reactions?.b}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      <div className="composer">
        <div className="row" style={{ maxWidth: 720, margin: '0 auto' }}>
          {recSecs === null ? (
            <>
              <button className="icon-btn" onClick={() => setPanel('stickers')} aria-label="Stickers">
                😊
              </button>
              <input
                className="input"
                value={text}
                placeholder="Escribe algo…"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(text)}
              />
              {text.trim() ? (
                <button
                  className="icon-btn"
                  aria-label="Enviar"
                  style={{ background: 'var(--grad)', color: '#fff', borderColor: 'transparent' }}
                  onClick={() => send(text)}
                >
                  ➤
                </button>
              ) : (
                <>
                  <button
                    className="icon-btn"
                    aria-label="Adjuntar"
                    onClick={() => setPanel('adjuntar')}
                    disabled={busy}
                  >
                    {busy ? '⏳' : '📎'}
                  </button>
                  <button className="icon-btn" aria-label="Nota de voz" onClick={() => void startRec()}>
                    🎙️
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <span className="beat" style={{ fontSize: 22 }}>
                🔴
              </span>
              <div className="grow">
                <div className="bold small">Grabando…</div>
                <div className="tiny muted">{fmtDuration(recSecs)}</div>
              </div>
              <button className="btn ghost sm" onClick={() => void stopRec(false)}>
                Cancelar
              </button>
              <button className="btn sm" onClick={() => void stopRec(true)}>
                Enviar
              </button>
            </>
          )}
        </div>
      </div>

      <Sheet open={panel === 'stickers'} onClose={() => setPanel('no')} title="Detalles rápidos">
        <div className="stack">
          <div className="eyebrow">Stickers</div>
          <div className="chips">
            {STICKERS.map((s) => (
              <Chip
                key={s}
                onClick={() => {
                  send(s, 'sticker')
                  setPanel('no')
                }}
              >
                <span style={{ fontSize: 22 }}>{s}</span>
              </Chip>
            ))}
          </div>
          <div className="eyebrow" style={{ marginTop: 10 }}>
            Mensajes rápidos
          </div>
          <div className="chips">
            {NUDGES.map((n) => (
              <Chip
                key={n.label}
                onClick={() => {
                  send(`${n.emoji} ${n.label}`)
                  setPanel('no')
                }}
              >
                {n.emoji} {n.label}
              </Chip>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={panel === 'dibujo'} onClose={() => setPanel('no')} title="Dibújale algo 🎨">
        <DrawPad onDone={(d) => void sendDrawing(d)} onCancel={() => setPanel('no')} />
      </Sheet>

      <Sheet open={panel === 'adjuntar'} onClose={() => setPanel('no')} title="Adjuntar">
        <div className="stack">
          <div className="grid-3">
            <button className="tile" onClick={() => openPicker('foto')}>
              <span className="ico">📷</span>
              <span className="t">Foto</span>
            </button>
            <button className="tile" onClick={() => openPicker('video')}>
              <span className="ico">🎥</span>
              <span className="t">Vídeo</span>
            </button>
            <button
              className="tile"
              onClick={() => {
                setPanel('dibujo')
              }}
            >
              <span className="ico">🎨</span>
              <span className="t">Dibujo</span>
            </button>
          </div>
          <Toggle
            on={onceMode}
            onChange={setOnceMode}
            label="Ver una vez"
            desc="La foto o el vídeo se borra en cuanto se abre, para siempre"
          />
        </div>
      </Sheet>

      <Confirm
        open={!!toDelete}
        title="¿Borrar este mensaje?"
        desc="Desaparece para los dos. No se puede deshacer."
        confirmLabel="Borrar"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title={viewing?.once ? 'Ver una vez' : undefined}>
        {viewing && <FullMedia m={viewing} cfg={cfg} />}
      </Sheet>
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

/* ---------- Burbujas especiales ---------- */

function VoiceBubble({
  id,
  seconds,
  mine,
  cfg,
}: {
  id?: string
  seconds: number
  mine: boolean
  cfg: { url: string; key: string; code: string }
}) {
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  const toggle = async () => {
    if (!id) return
    if (!audio.current) {
      const src = await loadMediaSynced(id, cfg)
      if (!src) return
      audio.current = new Audio(src)
      audio.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audio.current.pause()
      setPlaying(false)
    } else {
      void audio.current.play()
      setPlaying(true)
    }
  }

  const bars = useMemo(
    () => Array.from({ length: 22 }, (_, i) => 6 + ((Math.sin(i * 1.7 + seconds) + 1) / 2) * 16),
    [seconds],
  )

  return (
    <button
      className="row"
      style={{ gap: 10, minWidth: 190, color: 'inherit' }}
      onClick={() => void toggle()}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: mine ? 'rgba(255,255,255,.25)' : 'var(--accent-soft)',
          color: mine ? '#fff' : 'var(--accent)',
          flex: '0 0 auto',
          fontSize: 13,
        }}
      >
        {playing ? '❚❚' : '▶'}
      </span>
      <span className="row" style={{ gap: 2, flex: 1, height: 24, alignItems: 'center' }}>
        {bars.map((h, i) => (
          <i
            key={i}
            style={{
              display: 'block',
              width: 2.5,
              height: h,
              borderRadius: 2,
              background: 'currentColor',
              opacity: playing ? 0.9 : 0.45,
            }}
          />
        ))}
      </span>
      <span className="tiny" style={{ opacity: 0.8 }}>
        {fmtDuration(seconds)}
      </span>
    </button>
  )
}

function MediaBubble({
  id,
  cfg,
  kind,
}: {
  id?: string
  cfg: { url: string; key: string; code: string }
  kind: 'foto' | 'video'
}) {
  const [src, setSrc] = useState<string | undefined>()
  useEffect(() => {
    if (id) void loadMediaSynced(id, cfg).then(setSrc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  return (
    <div style={{ width: 210, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
      {!src ? (
        <div className="shimmer" style={{ height: 190 }} />
      ) : kind === 'video' ? (
        <video src={src} controls style={{ width: '100%', display: 'block' }} />
      ) : (
        <img src={src} alt="" style={{ width: '100%', display: 'block' }} />
      )}
    </div>
  )
}

/** Miniatura de foto/vídeo normal, o placeholder bloqueado si es "ver una vez". */
function OnceAwareMedia({
  m,
  cfg,
  onOpen,
}: {
  m: Message
  cfg: { url: string; key: string; code: string }
  onOpen: () => void
}) {
  if (!m.once) return <MediaBubble id={m.mediaId} cfg={cfg} kind={m.kind === 'video' ? 'video' : 'foto'} />
  if (m.viewedAt) {
    return (
      <div className="row" style={{ gap: 8, padding: '6px 2px', opacity: 0.7 }}>
        <span style={{ fontSize: 18 }}>👁️</span>
        <span className="small">Ya se vio · no se puede volver a abrir</span>
      </div>
    )
  }
  return (
    <button className="row" style={{ gap: 8, padding: '4px 2px' }} onClick={onOpen}>
      <span style={{ fontSize: 22 }}>{m.kind === 'video' ? '🎥' : '📷'}</span>
      <span className="small bold">Toca para ver una vez</span>
    </button>
  )
}

function FullMedia({ m, cfg }: { m: Message; cfg: { url: string; key: string; code: string } }) {
  const [src, setSrc] = useState<string | undefined>()
  useEffect(() => {
    if (m.mediaId) void loadMediaSynced(m.mediaId, cfg).then(setSrc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.mediaId])
  if (!src) return <div className="shimmer" style={{ height: 260, borderRadius: 16 }} />
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000' }}>
      {m.kind === 'video' ? (
        <video src={src} controls autoPlay style={{ width: '100%', display: 'block' }} />
      ) : (
        <img src={src} alt="" style={{ width: '100%', display: 'block' }} />
      )}
    </div>
  )
}
