import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Button, Chip, Empty, Field, Head, Input, Media, Sheet } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { fmtDate, fmtTime, today } from '../lib/dates'
import { deleteMedia } from '../lib/media'
import { deleteRemoteMedia, saveMediaSynced } from '../lib/storage'
import { uid } from '../lib/utils'
import { geoErrorMessage, getPosition } from '../lib/geo'
import type { Memory } from '../types'

/** Los vídeos de recuerdos se guardan en base64: mejor no pasarnos de tamaño. */
const MAX_VIDEO_MB = 25

export default function Memories() {
  const { state, add, patch, remove, me, toast } = useStore()
  const { back } = useNav()
  const cfg = state.settings.sync
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Memory | null>(null)
  const [filter, setFilter] = useState<string>('todos')
  const [comment, setComment] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const pickKind = useRef<'foto' | 'video'>('foto')

  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(today())
  const [place, setPlace] = useState('')
  const [album, setAlbum] = useState('')
  const [mediaId, setMediaId] = useState<string | undefined>()
  const [mediaKind, setMediaKind] = useState<'foto' | 'video'>('foto')
  const [busy, setBusy] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | undefined>()

  const items = useMemo(
    () => live(state.memories).sort((a, b) => b.date.localeCompare(a.date)),
    [state.memories],
  )
  const albums = useMemo(
    () => [...new Set(items.map((m) => m.album).filter(Boolean) as string[])],
    [items],
  )
  const shown = items.filter((m) =>
    filter === 'todos' ? true : filter === '★' ? m.favorite : m.album === filter,
  )

  const openPicker = (kind: 'foto' | 'video') => {
    pickKind.current = kind
    fileInput.current?.click()
  }

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const kind = pickKind.current
    if (kind === 'video' && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast(`Ese vídeo pesa demasiado (máx. ${MAX_VIDEO_MB} MB). Prueba con uno más corto.`)
      return
    }
    setBusy(true)
    try {
      const data = await readAsDataUrl(file)
      const id = uid()
      await saveMediaSynced(id, data, cfg)
      setMediaId(id)
      setMediaKind(kind)
    } catch {
      toast('No se pudo cargar el archivo')
    }
    setBusy(false)
  }

  const save = () => {
    if (!mediaId && !caption.trim()) return
    add('memories', {
      mediaId,
      mediaKind: mediaId ? mediaKind : undefined,
      caption: caption.trim(),
      date,
      place: place.trim() || undefined,
      album: album.trim() || undefined,
      favorite: false,
      author: me,
      lat: coords?.lat,
      lon: coords?.lon,
      comments: [],
    })
    setCaption('')
    setPlace('')
    setAlbum('')
    setMediaId(undefined)
    setCoords(undefined)
    setOpen(false)
    toast('Recuerdo guardado 📸')
  }

  const sendComment = () => {
    if (!view || !comment.trim()) return
    const c = { id: uid(), author: me, text: comment.trim(), createdAt: Date.now() }
    const next = [...(view.comments ?? []), c]
    patch('memories', view.id, { comments: next })
    setView({ ...view, comments: next })
    setComment('')
  }

  return (
    <div className="page stack">
      <input
        ref={fileInput}
        type="file"
        accept={pickKind.current === 'foto' ? 'image/*' : 'video/*'}
        style={{ display: 'none' }}
        onChange={(e) => void onFilePicked(e)}
      />

      <Head
        title="Recuerdos"
        sub={`${items.length} momentos guardados`}
        back={back}
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ＋
          </button>
        }
      />

      {albums.length > 0 && (
        <div className="chips scroll">
          <Chip on={filter === 'todos'} onClick={() => setFilter('todos')}>
            Todos
          </Chip>
          <Chip on={filter === '★'} onClick={() => setFilter('★')}>
            ⭐ Favoritos
          </Chip>
          {albums.map((a) => (
            <Chip key={a} on={filter === a} onClick={() => setFilter(a)}>
              {a}
            </Chip>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <Empty
          emoji="📸"
          title="Vuestro álbum está vacío"
          desc="Guardad esa foto o vídeo que os hace sonreír. Con fecha, lugar y una frase que lo explique."
          action={<Button onClick={() => setOpen(true)}>Añadir recuerdo</Button>}
        />
      ) : (
        <div className="gallery">
          {shown.map((m) => (
            <button key={m.id} className="ph" onClick={() => setView(m)}>
              {m.mediaId ? (
                <Media id={m.mediaId} kind={m.mediaKind ?? 'foto'} controls={false} style={{ pointerEvents: 'none' }} />
              ) : (
                <div
                  className="center small"
                  style={{
                    padding: 8,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--grad-soft)',
                  }}
                >
                  {m.caption.slice(0, 40)}
                </div>
              )}
              {m.mediaKind === 'video' && <span className="fav" style={{ left: 6, right: 'auto' }}>🎥</span>}
              {m.favorite && <span className="fav">⭐</span>}
              {(m.comments?.length ?? 0) > 0 && (
                <span className="fav" style={{ bottom: 6, top: 'auto' }}>💬 {m.comments!.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setOpen(true)}>
        ＋
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo recuerdo">
        <div className="stack">
          {mediaId ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <Media id={mediaId} kind={mediaKind} />
              <button
                className="icon-btn"
                style={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => setMediaId(undefined)}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="grid-2">
              <Button variant="ghost" block onClick={() => openPicker('foto')} disabled={busy}>
                {busy ? 'Cargando…' : '📷 Foto'}
              </Button>
              <Button variant="ghost" block onClick={() => openPicker('video')} disabled={busy}>
                {busy ? 'Cargando…' : '🎥 Vídeo'}
              </Button>
            </div>
          )}
          <Field label="¿Qué pasó?">
            <Input value={caption} onChange={setCaption} placeholder="Nuestro primer viaje juntos" />
          </Field>
          <div className="grid-2">
            <Field label="Fecha">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Lugar">
              <Input value={place} onChange={setPlace} placeholder="Lisboa" />
            </Field>
          </div>
          <Field label="Álbum (opcional)" hint="Por ejemplo: Verano 2026, Viajes, Casa">
            <Input value={album} onChange={setAlbum} placeholder="Viajes" />
          </Field>
          <Button
            variant={coords ? 'soft' : 'ghost'}
            block
            onClick={async () => {
              try {
                const pos = await getPosition()
                setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
                toast('Se guardará en el mapa 📍')
              } catch (e) {
                toast(geoErrorMessage(e))
              }
            }}
          >
            📍 {coords ? 'Guardado con este sitio' : 'Marcar en el mapa dónde fue'}
          </Button>
          <Button block onClick={save} disabled={!mediaId && !caption.trim()}>
            Guardar recuerdo
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!view} onClose={() => setView(null)}>
        {view && (
          <div className="stack">
            {view.mediaId && (
              <div style={{ borderRadius: 18, overflow: 'hidden' }}>
                <Media id={view.mediaId} kind={view.mediaKind ?? 'foto'} />
              </div>
            )}
            <h2>{view.caption || 'Recuerdo'}</h2>
            <div className="muted small">
              {fmtDate(view.date)}
              {view.place ? ` · ${view.place}` : ''}
              {view.album ? ` · ${view.album}` : ''}
            </div>
            <div className="row">
              <Button
                variant="ghost"
                block
                onClick={() => {
                  patch('memories', view.id, { favorite: !view.favorite })
                  setView({ ...view, favorite: !view.favorite })
                }}
              >
                {view.favorite ? '⭐ Quitar favorito' : '☆ Favorito'}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (view.mediaId) {
                    void deleteMedia(view.mediaId)
                    void deleteRemoteMedia(cfg, view.mediaId)
                  }
                  remove('memories', view.id)
                  setView(null)
                  toast('Recuerdo borrado')
                }}
              >
                Borrar
              </Button>
            </div>

            <div className="eyebrow" style={{ marginTop: 6 }}>
              Comentarios
            </div>
            <div className="stack-sm">
              {(view.comments ?? []).length === 0 && (
                <div className="tiny muted">Sed los primeros en comentar este recuerdo</div>
              )}
              {(view.comments ?? []).map((c) => {
                const p = profileOf(state, c.author)
                return (
                  <div key={c.id} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18 }}>{p.emoji}</span>
                    <div className="grow">
                      <div className="tiny bold">{p.name}</div>
                      <div className="small">{c.text}</div>
                    </div>
                    <span className="tiny muted">{fmtTime(c.createdAt)}</span>
                  </div>
                )
              })}
            </div>
            <div className="row">
              <Input value={comment} onChange={setComment} placeholder="Escribe un comentario…" />
              <Button onClick={sendComment} disabled={!comment.trim()}>
                Enviar
              </Button>
            </div>
          </div>
        )}
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
