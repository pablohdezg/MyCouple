import { useState } from 'react'
import { useStore } from '../store/store'
import { Avatar, Button, Card, Chip, Field, Input } from '../components/ui'
import { fileToDataUrl, pickImage, saveMedia } from '../lib/media'
import { uid } from '../lib/utils'
import { ensureNotificationPermission } from '../lib/native'
import { AVATAR_EMOJIS, THEMES } from '../data/misc'
import { humanDuration, today } from '../lib/dates'
import type { Who } from '../types'

const STEPS = 5

export default function Onboarding() {
  const { state, update } = useStore()
  const [step, setStep] = useState(0)
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [emojiA, setEmojiA] = useState('💗')
  const [emojiB, setEmojiB] = useState('💙')
  const [photoA, setPhotoA] = useState<string | undefined>()
  const [photoB, setPhotoB] = useState<string | undefined>()
  const [anniversary, setAnniversary] = useState(today())
  const [me, setMe] = useState<Who>('a')
  const [theme, setTheme] = useState('rubor')
  const [title, setTitle] = useState('MyCouple')
  const [ld, setLd] = useState(false)

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const prev = () => setStep((s) => Math.max(0, s - 1))

  const finish = async () => {
    // El único momento en que tiene sentido pedir el permiso de notificaciones
    // es aquí, al terminar de configurar la app: es cuando la persona espera
    // que le pregunten algo. Pedirlo en cualquier otro momento (o nunca)
    // deja el permiso denegado por defecto en Android y los avisos no suenan.
    const notifOk = await ensureNotificationPermission()
    update((s) => ({
      ...s,
      onboarded: true,
      me,
      couple: {
        a: { name: nameA.trim() || 'Yo', emoji: emojiA, photoId: photoA },
        b: { name: nameB.trim() || 'Tú', emoji: emojiB, photoId: photoB },
        anniversary,
        longDistance: ld,
        title: title.trim() || 'MyCouple',
      },
      settings: { ...s.settings, theme, notifications: notifOk },
    }))
  }

  /** Elige una foto del móvil, la encoge y la guarda. */
  const choosePhoto = async (set: (id: string) => void) => {
    const file = await pickImage()
    if (!file) return
    const data = await fileToDataUrl(file, 600, 0.85)
    const id = uid()
    await saveMedia(id, data)
    set(id)
  }

  const canNext =
    (step === 0) ||
    (step === 1 && nameA.trim().length > 0 && nameB.trim().length > 0) ||
    step === 2 ||
    step === 3 ||
    step === 4

  return (
    <div className="app">
      <div className="page no-nav" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="row" style={{ gap: 6, marginBottom: 22 }}>
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                background: i <= step ? 'var(--accent)' : 'var(--line)',
                transition: 'background .3s',
              }}
            />
          ))}
        </div>

        <div className="stack grow" style={{ justifyContent: 'center' }}>
          {step === 0 && (
            <div className="stack center" style={{ gap: 18 }}>
              <div style={{ fontSize: 64 }} className="beat">
                💞
              </div>
              <h1 className="display">Vuestro rincón privado</h1>
              <p className="muted">
                Un sitio solo para los dos: recuerdos, planes, preguntas, juegos y todo lo que os
                hace pareja. Sin cuentas, sin anuncios y sin que nadie más lo lea.
              </p>
              <Button size="lg" block onClick={next}>
                Empezar 💗
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <h1>¿Quiénes sois?</h1>
              <p className="muted small">Escribid vuestros nombres y elegid un símbolo.</p>
              <Card className="stack">
                <div className="row">
                  <button
                    className="avatar-edit"
                    onClick={() => void choosePhoto(setPhotoA)}
                    aria-label="Poner foto"
                  >
                    <Avatar profile={{ name: nameA, emoji: emojiA, photoId: photoA }} size="lg" />
                    <span className="cam">📷</span>
                  </button>
                  <Field label="Nombre de la primera persona">
                    <Input value={nameA} onChange={setNameA} placeholder="Ana" maxLength={20} />
                  </Field>
                </div>
                <div className="tiny muted">
                  Toca la foto para elegir una del móvil, o escoge un símbolo:
                </div>
                <div className="chips">
                  {AVATAR_EMOJIS.map((e) => (
                    <Chip
                      key={e}
                      on={emojiA === e && !photoA}
                      onClick={() => {
                        setEmojiA(e)
                        setPhotoA(undefined)
                      }}
                    >
                      {e}
                    </Chip>
                  ))}
                </div>
              </Card>
              <Card className="stack">
                <div className="row">
                  <button
                    className="avatar-edit"
                    onClick={() => void choosePhoto(setPhotoB)}
                    aria-label="Poner foto"
                  >
                    <Avatar profile={{ name: nameB, emoji: emojiB, photoId: photoB }} size="lg" />
                    <span className="cam">📷</span>
                  </button>
                  <Field label="Nombre de la segunda persona">
                    <Input value={nameB} onChange={setNameB} placeholder="Leo" maxLength={20} />
                  </Field>
                </div>
                <div className="tiny muted">
                  Toca la foto para elegir una del móvil, o escoge un símbolo:
                </div>
                <div className="chips">
                  {AVATAR_EMOJIS.map((e) => (
                    <Chip
                      key={e}
                      on={emojiB === e && !photoB}
                      onClick={() => {
                        setEmojiB(e)
                        setPhotoB(undefined)
                      }}
                    >
                      {e}
                    </Chip>
                  ))}
                </div>
              </Card>
              <Field label="¿Quién usa este móvil?">
                <div className="row">
                  <Chip on={me === 'a'} onClick={() => setMe('a')}>
                    {emojiA} {nameA || 'Primera'}
                  </Chip>
                  <Chip on={me === 'b'} onClick={() => setMe('b')}>
                    {emojiB} {nameB || 'Segunda'}
                  </Chip>
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <h1>¿Desde cuándo?</h1>
              <p className="muted small">
                La fecha en la que empezó todo. Se usará para contar los días y celebrar hitos.
              </p>
              <Card className="stack">
                <Field label="Nuestra fecha">
                  <input
                    className="input"
                    type="date"
                    value={anniversary}
                    max={today()}
                    onChange={(e) => setAnniversary(e.target.value)}
                  />
                </Field>
                <div className="center" style={{ padding: '8px 0' }}>
                  <div className="eyebrow">Lleváis juntos</div>
                  <div className="display big accent" style={{ fontSize: 22, marginTop: 4 }}>
                    {humanDuration(anniversary)}
                  </div>
                </div>
              </Card>
              <Card>
                <div
                  className="row-between"
                  onClick={() => setLd(!ld)}
                >
                  <div className="grow">
                    <div className="bold">Relación a distancia</div>
                    <div className="tiny muted">Activa cuentas atrás y planes para veros</div>
                  </div>
                  <div className={`switch ${ld ? 'on' : ''}`} />
                </div>
              </Card>
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <h1>Vuestro estilo</h1>
              <p className="muted small">Podéis cambiarlo cuando queráis desde Ajustes.</p>
              <Field label="Nombre de vuestro espacio">
                <Input value={title} onChange={setTitle} maxLength={28} />
              </Field>
              <div className="grid-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className="card pressable"
                    style={{
                      borderColor: theme === t.id ? t.color : undefined,
                      borderWidth: theme === t.id ? 2 : 1,
                      textAlign: 'left',
                    }}
                    onClick={() => setTheme(t.id)}
                  >
                    <div
                      style={{
                        height: 44,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${t.color}aa, ${t.color})`,
                        marginBottom: 8,
                      }}
                    />
                    <div className="bold small">{t.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="stack center" style={{ gap: 16 }}>
              <div style={{ fontSize: 58 }}>🎀</div>
              <h1>Todo listo</h1>
              <Card className="soft stack">
                <div className="display" style={{ fontSize: 20 }}>
                  {emojiA} {nameA || 'Yo'} &nbsp;💞&nbsp; {emojiB} {nameB || 'Tú'}
                </div>
                <div className="muted small">{humanDuration(anniversary)} juntos</div>
              </Card>
              <p className="muted small">
                Todo se guarda en este móvil. Si queréis que los dos veáis lo mismo, activad la
                sincronización en Ajustes (es opcional y gratuita).
              </p>
              <Button size="lg" block onClick={finish}>
                Entrar en {title || 'MyCouple'} 💗
              </Button>
            </div>
          )}
        </div>

        {step > 0 && step < 4 && (
          <div className="row" style={{ marginTop: 20 }}>
            <Button variant="ghost" block onClick={prev}>
              Atrás
            </Button>
            <Button block disabled={!canNext} onClick={next}>
              Siguiente
            </Button>
          </div>
        )}
        {state.onboarded && null}
      </div>
    </div>
  )
}
