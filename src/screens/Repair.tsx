import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Chip, Head, Sheet, TextArea } from '../components/ui'
import { live, profileOf } from '../store/derive'
import { ago } from '../lib/dates'
import { haptic } from '../lib/native'

/**
 * Modo reconciliación: una guía corta para después de una discusión.
 * Está basado en la idea de los "intentos de reparación": lo que salva a
 * una pareja no es no discutir, sino cómo vuelven a acercarse.
 */

const FEELINGS = [
  'dolido/a',
  'ignorado/a',
  'agobiado/a',
  'triste',
  'con miedo',
  'frustrado/a',
  'cansado/a',
  'solo/a',
  'incomprendido/a',
  'culpable',
  'enfadado/a',
  'inseguro/a',
]

const NEEDS = [
  'que me escuches sin interrumpir',
  'un abrazo',
  'un rato a solas y luego hablar',
  'que me digas que seguimos bien',
  'que reconozcas tu parte',
  'hablarlo con calma esta noche',
  'que bajemos el tono',
  'saber que esto no cambia lo nuestro',
]

const FRASES = [
  'No quiero ganar, quiero entenderte.',
  '¿Podemos empezar otra vez esta conversación?',
  'Necesito un minuto, no me estoy yendo.',
  'Tienes razón en una parte de esto.',
  'Me importa más cómo estás tú que quién tiene razón.',
  'Cuéntamelo otra vez, ahora te escucho de verdad.',
  '¿Qué necesitas de mí ahora mismo?',
  'Perdón por cómo te lo he dicho.',
]

const PASOS = [
  {
    t: 'Primero, parad',
    d: 'Cuando el cuerpo está acelerado no se razona. Veinte minutos separados no es huir: es dejar que baje la tensión.',
    emoji: '⏸️',
  },
  {
    t: 'Hablad de vosotros, no del otro',
    d: '«Me sentí solo cuando…» abre la puerta. «Tú siempre…» la cierra.',
    emoji: '💬',
  },
  {
    t: 'Reconoced la parte propia',
    d: 'No hace falta darle la razón en todo. Basta con encontrar el 10 % en el que la tiene.',
    emoji: '💗',
  },
  {
    t: 'Pedid algo concreto',
    d: '«Quiero que me escuches diez minutos sin móvil» se puede cumplir. «Quiero que cambies» no.',
    emoji: '🎯',
  },
]

export default function Repair() {
  const { state, add, patch, me, other, toast } = useStore()
  const { back } = useNav()
  const [open, setOpen] = useState(false)
  const [feelings, setFeelings] = useState<string[]>([])
  const [need, setNeed] = useState('')
  const [sorry, setSorry] = useState('')

  const openOnes = useMemo(
    () => live(state.repairs).filter((r) => !r.closed).sort((a, b) => b.at - a.at),
    [state.repairs],
  )
  const mine = openOnes.find((r) => r.author === me)
  const theirs = openOnes.find((r) => r.author === other)
  const otherP = profileOf(state, other)

  const send = () => {
    if (!feelings.length && !need.trim() && !sorry.trim()) return
    add('repairs', {
      author: me,
      at: Date.now(),
      feeling: feelings.join(', '),
      need: need.trim(),
      sorry: sorry.trim(),
      closed: false,
    })
    setFeelings([])
    setNeed('')
    setSorry('')
    setOpen(false)
    void haptic('medium')
    toast('Enviado. Respira, ya has dado el paso 💗')
  }

  const closeAll = () => {
    openOnes.forEach((r) => patch('repairs', r.id, { closed: true }))
    void haptic('heavy')
    toast('Hechas las paces ✨')
  }

  const toggle = (f: string) =>
    setFeelings((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]))

  return (
    <div className="page stack">
      <Head title="Hacer las paces" sub="Para después de una discusión" back={back} />

      <Card className="soft stack-sm">
        <div className="row">
          <span className="stamp lg grad">
            🕊️
          </span>
          <p className="small dim2 grow">
            Discutir no rompe una pareja; quedarse lejos, sí. Esto no es para tener razón: es para
            volver.
          </p>
        </div>
      </Card>

      {(mine || theirs) && (
        <div className="stack">
          <div className="rule">Lo que os habéis dicho</div>
          {[mine, theirs].map(
            (r) =>
              r && (
                <Card key={r.id} className="stack-sm marked">
                  <div className="row">
                    <Avatar profile={profileOf(state, r.author)} size="sm" />
                    <div className="grow">
                      <div className="bold small">
                        {r.author === me ? 'Tú' : profileOf(state, r.author).name}
                      </div>
                      <div className="tiny muted">{ago(r.at)}</div>
                    </div>
                  </div>
                  {r.feeling && (
                    <div className="small">
                      <span className="eyebrow">Me siento</span>
                      <div className="dim2">{r.feeling}</div>
                    </div>
                  )}
                  {r.need && (
                    <div className="small">
                      <span className="eyebrow">Necesito</span>
                      <div className="dim2 pre">{r.need}</div>
                    </div>
                  )}
                  {r.sorry && (
                    <div className="small">
                      <span className="eyebrow">Mi parte</span>
                      <div className="dim2 pre">{r.sorry}</div>
                    </div>
                  )}
                </Card>
              ),
          )}
          {mine && theirs && (
            <Card className="soft center stack-sm">
              <div className="display" style={{ fontSize: 18 }}>
                Los dos habéis hablado 💗
              </div>
              <p className="small dim2">
                Ahora lo difícil ya está hecho. Un abrazo largo cierra esto mejor que otra frase.
              </p>
              <Button block onClick={closeAll}>
                Hemos hecho las paces
              </Button>
            </Card>
          )}
          {mine && !theirs && (
            <p className="tiny muted center">
              Esperando a que {otherP.name} escriba su parte.
            </p>
          )}
        </div>
      )}

      {!mine && (
        <Button size="lg" block onClick={() => setOpen(true)}>
          🕊️ Quiero acercarme
        </Button>
      )}

      <div className="stack-sm">
        <div className="eyebrow">Cuatro cosas que ayudan</div>
        <div className="panel">
          {PASOS.map((p, i) => (
            <div key={p.t} className="list-item" style={{ alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>{p.emoji}</span>
              <div className="grow">
                <div className="bold small">
                  {i + 1}. {p.t}
                </div>
                <div className="tiny muted">{p.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <div className="eyebrow">Frases que desarman</div>
        <div className="chips">
          {FRASES.map((f) => (
            <Chip
              key={f}
              onClick={() => {
                void navigator.clipboard?.writeText(f).catch(() => {})
                toast('Copiada. Díselo con tu voz mejor 💗')
              }}
            >
              «{f}»
            </Chip>
          ))}
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Cómo estoy">
        <div className="stack">
          <div className="field">
            <span className="label">Me siento…</span>
            <div className="chips">
              {FEELINGS.map((f) => (
                <Chip key={f} on={feelings.includes(f)} onClick={() => toggle(f)}>
                  {f}
                </Chip>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label">Lo que necesito</span>
            <div className="chips" style={{ marginBottom: 8 }}>
              {NEEDS.map((n) => (
                <Chip key={n} on={need === n} onClick={() => setNeed(n)}>
                  {n}
                </Chip>
              ))}
            </div>
            <TextArea value={need} onChange={setNeed} rows={2} placeholder="Necesito que…" />
          </div>

          <div className="field">
            <span className="label">Mi parte en esto</span>
            <TextArea
              value={sorry}
              onChange={setSorry}
              rows={3}
              placeholder="Reconozco que… / Siento haber…"
            />
          </div>

          <Button block onClick={send} disabled={!feelings.length && !need.trim() && !sorry.trim()}>
            Enviárselo a {otherP.name}
          </Button>
          <p className="tiny muted center">
            Sólo lo veréis vosotros dos. Si prefieres decirlo en persona, esto sirve igual como
            ensayo.
          </p>
        </div>
      </Sheet>
    </div>
  )
}
