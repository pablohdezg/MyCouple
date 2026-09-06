import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Avatar, Button, Card, Empty, Head, Photo, Sheet, TextArea } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { ago } from '../lib/dates'
import { fileToDataUrl, pickImage } from '../lib/media'
import { saveMediaSynced } from '../lib/storage'
import { uid } from '../lib/utils'
import { haptic } from '../lib/native'
import type { Post } from '../types'

const REACTIONS = ['❤️', '😂', '🥹', '😍', '🔥', '👏']

export default function Wall() {
  const { state, add, patch, remove, me, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [photoId, setPhotoId] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [commentOn, setCommentOn] = useState<Post | null>(null)
  const [comment, setComment] = useState('')

  const posts = useMemo(
    () => live(state.posts).sort((a, b) => b.createdAt - a.createdAt),
    [state.posts],
  )

  const attach = async () => {
    const file = await pickImage()
    if (!file) return
    setBusy(true)
    const data = await fileToDataUrl(file)
    const id = uid()
    await saveMediaSynced(id, data, state.settings.sync)
    setPhotoId(id)
    setBusy(false)
  }

  const publish = () => {
    if (!text.trim() && !photoId) return
    add('posts', {
      author: me,
      text: text.trim(),
      photoId,
      createdAt: Date.now(),
      reactions: {},
      comments: [],
    })
    setText('')
    setPhotoId(undefined)
    setOpen(false)
    toast('Publicado en vuestro muro 💗')
  }

  const react = (p: Post, emoji: string) => {
    void haptic('light')
    const current = p.reactions[me]
    patch('posts', p.id, {
      reactions: { ...p.reactions, [me]: current === emoji ? undefined : emoji },
    })
  }

  const sendComment = () => {
    if (!commentOn || !comment.trim()) return
    patch('posts', commentOn.id, {
      comments: [
        ...commentOn.comments,
        { id: uid(), author: me, text: comment.trim(), createdAt: Date.now() },
      ],
    })
    setComment('')
    setCommentOn(null)
  }

  return (
    <div className="page stack">
      <Head
        title="Nuestro muro"
        sub="Lo que os pasa, contado a dos voces"
        right={
          <button className="icon-btn" onClick={() => setOpen(true)}>
            ✏️
          </button>
        }
      />

      {posts.length === 0 && (
        <Empty
          emoji="📔"
          title="Aún no hay nada escrito"
          desc="Escribid el primer momento: una tontería del día, una foto, una frase que os hizo reír."
          action={<Button onClick={() => setOpen(true)}>Escribir el primero</Button>}
        />
      )}

      <div className="stack">
        {posts.map((p) => {
          const author = profileOf(state, p.author)
          const mine = p.author === me
          return (
            <Card key={p.id} className="stack-sm">
              <div className="row">
                <Avatar profile={author} size="sm" />
                <div className="grow">
                  <div className="bold small">{author.name}</div>
                  <div className="tiny muted">{ago(p.createdAt)}</div>
                </div>
                {mine && (
                  <button
                    className="tiny muted"
                    onClick={() => {
                      remove('posts', p.id)
                      toast('Publicación borrada')
                    }}
                  >
                    Borrar
                  </button>
                )}
              </div>

              {p.photoId && (
                <div
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: 'var(--surface-2)',
                    minHeight: 120,
                  }}
                >
                  <Photo id={p.photoId} />
                </div>
              )}

              {p.text && <div className="pre">{p.text}</div>}

              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {REACTIONS.map((r) => {
                  const chosen = p.reactions[me] === r
                  const otherChose = Object.entries(p.reactions).some(
                    ([k, v]) => k !== me && v === r,
                  )
                  return (
                    <button
                      key={r}
                      className={`chip ${chosen ? 'on' : ''}`}
                      style={{ padding: '5px 9px' }}
                      onClick={() => react(p, r)}
                    >
                      {r}
                      {otherChose && <span className="tiny">·</span>}
                    </button>
                  )
                })}
                <button
                  className="chip"
                  style={{ padding: '5px 11px', marginLeft: 'auto' }}
                  onClick={() => setCommentOn(p)}
                >
                  💬 {p.comments.length || ''}
                </button>
              </div>

              {p.comments.length > 0 && (
                <div className="stack-sm" style={{ paddingTop: 4 }}>
                  {p.comments.map((c) => (
                    <div key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
                      <Avatar profile={profileOf(state, c.author)} size="xs" />
                      <div className="grow small">
                        <span className="bold">{profileOf(state, c.author).name} </span>
                        <span className="pre">{c.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <button className="fab" onClick={() => setOpen(true)}>
        ＋
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo momento">
        <div className="stack">
          <TextArea
            value={text}
            onChange={setText}
            placeholder="¿Qué ha pasado hoy? ¿Qué quieres recordar?"
            rows={5}
          />
          {photoId && (
            <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <Photo id={photoId} />
              <button
                className="icon-btn"
                style={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => setPhotoId(undefined)}
              >
                ✕
              </button>
            </div>
          )}
          <div className="row">
            <Button variant="ghost" block onClick={() => void attach()} disabled={busy}>
              {busy ? 'Cargando…' : '📷 Añadir foto'}
            </Button>
            <Button block onClick={publish} disabled={!text.trim() && !photoId}>
              Publicar
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={!!commentOn} onClose={() => setCommentOn(null)} title="Comentar">
        <div className="stack">
          <TextArea value={comment} onChange={setComment} placeholder="Escribe algo bonito…" rows={3} />
          <Button block onClick={sendComment} disabled={!comment.trim()}>
            Enviar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
