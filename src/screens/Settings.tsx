import { useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import {
  Avatar,
  Button,
  Card,
  Chip,
  Confirm,
  Field,
  Head,
  Input,
  Sheet,
  Toggle,
} from '../components/ui'
import { THEMES, AVATAR_EMOJIS } from '../data/misc'
import { profileOf } from '../store/derive'
import { ensureNotificationPermission, native, share } from '../lib/native'
import { configValid, testConnection } from '../lib/sync'
import { fileToDataUrl, pickImage } from '../lib/media'
import { saveMediaSynced } from '../lib/storage'
import { uid } from '../lib/utils'
import { ago, humanDuration } from '../lib/dates'
import type { AppState, Who } from '../types'

export default function Settings() {
  const { state, update, resetAll, importState, syncNow, syncState, syncError, me, toast } =
    useStore()
  const { back } = useNav()
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [sqlOpen, setSqlOpen] = useState(false)
  const [editing, setEditing] = useState<Who | null>(null)
  const [testing, setTesting] = useState(false)

  const s = state.settings
  const setS = (patch: Partial<typeof s>) =>
    update((st) => ({ ...st, settings: { ...st.settings, ...patch } }))
  const setSync = (patch: Partial<typeof s.sync>) =>
    update((st) => ({ ...st, settings: { ...st.settings, sync: { ...st.settings.sync, ...patch } } }))

  /**
   * Dentro del APK (y en algunos navegadores embebidos) las descargas
   * directas no funcionan, así que ahí se comparte el texto y en el
   * navegador normal se descarga el archivo.
   */
  const exportData = async () => {
    const json = JSON.stringify(state, null, 2)
    if (native()) {
      await share(json, 'Copia de seguridad de MyCouple')
      toast('Copia lista para guardar donde quieras')
      return
    }
    try {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mycouple-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast('Copia de seguridad descargada')
    } catch {
      await share(json, 'Copia de seguridad')
      toast('Copia lista para guardar donde quieras')
    }
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) return
      try {
        const parsed = JSON.parse(await f.text()) as AppState
        if (!parsed.couple) throw new Error('formato')
        importState(parsed)
        toast('Datos importados y combinados ✨')
      } catch {
        toast('Ese archivo no parece una copia válida')
      }
    }
    input.click()
  }

  const changePhoto = async (who: Who) => {
    const file = await pickImage()
    if (!file) return
    const data = await fileToDataUrl(file, 600, 0.85)
    const id = uid()
    await saveMediaSynced(id, data, state.settings.sync)
    update((st) => ({
      ...st,
      couple: { ...st.couple, [who]: { ...st.couple[who], photoId: id } },
    }))
  }

  const setProfile = (who: Who, patch: Partial<AppState['couple']['a']>) =>
    update((st) => ({ ...st, couple: { ...st.couple, [who]: { ...st.couple[who], ...patch } } }))

  const test = async () => {
    setTesting(true)
    try {
      if (!configValid(s.sync)) throw new Error('Faltan datos de conexión')
      await testConnection(s.sync)
      toast('¡Conexión correcta! ✅')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Error de conexión')
    }
    setTesting(false)
  }

  return (
    <div className="page stack">
      <Head title="Ajustes" sub={state.couple.title} back={back} />

      {/* Pareja */}
      <div className="stack-sm">
        <div className="eyebrow">Nosotros</div>
        <Card className="stack">
          <Field label="Nombre de vuestro espacio">
            <Input
              value={state.couple.title}
              onChange={(v) => update((st) => ({ ...st, couple: { ...st.couple, title: v } }))}
              maxLength={28}
            />
          </Field>
          <Field label="Fecha de aniversario" hint={`${humanDuration(state.couple.anniversary)} juntos`}>
            <input
              className="input"
              type="date"
              value={state.couple.anniversary}
              onChange={(e) =>
                update((st) => ({ ...st, couple: { ...st.couple, anniversary: e.target.value } }))
              }
            />
          </Field>
          <Toggle
            on={state.couple.longDistance}
            onChange={(v) => update((st) => ({ ...st, couple: { ...st.couple, longDistance: v } }))}
            label="Relación a distancia"
          />
        </Card>

        {(['a', 'b'] as Who[]).map((w) => (
          <Card key={w}>
            <div className="row">
              <button
                className="avatar-edit"
                aria-label={`Cambiar la foto de ${profileOf(state, w).name}`}
                onClick={() => void changePhoto(w)}
              >
                <Avatar profile={profileOf(state, w)} size="lg" />
                <span className="cam">📷</span>
              </button>
              <button className="grow" style={{ textAlign: 'left' }} onClick={() => setEditing(w)}>
                <div className="bold">{profileOf(state, w).name}</div>
                <div className="tiny muted">
                  {me === w ? 'Este móvil' : 'La otra persona'}
                  {profileOf(state, w).birthday ? ` · cumple ${profileOf(state, w).birthday}` : ''}
                </div>
                <div className="tiny accent bold" style={{ marginTop: 4 }}>
                  Toca la foto para cambiarla · Editar perfil ›
                </div>
              </button>
            </div>
          </Card>
        ))}

        <Card className="tight">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            ¿Quién usa este móvil?
          </div>
          <div className="chips">
            {(['a', 'b'] as Who[]).map((w) => (
              <Chip key={w} on={me === w} onClick={() => update((st) => ({ ...st, me: w }))}>
                {profileOf(state, w).emoji} {profileOf(state, w).name}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      {/* Apariencia */}
      <div className="stack-sm">
        <div className="eyebrow">Apariencia</div>
        <Card className="stack">
          <div className="chips">
            {THEMES.map((t) => (
              <Chip key={t.id} on={s.theme === t.id} onClick={() => setS({ theme: t.id })}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 99,
                    background: t.color,
                    display: 'inline-block',
                  }}
                />
                {t.name}
              </Chip>
            ))}
          </div>
          <Toggle on={s.dark} onChange={(v) => setS({ dark: v })} label="Modo noche" />
        </Card>
      </div>

      {/* Privacidad */}
      <div className="stack-sm">
        <div className="eyebrow">Privacidad</div>
        <Card className="stack">
          <Toggle
            on={!!s.pin}
            onChange={(v) => (v ? setPinOpen(true) : setS({ pin: undefined }))}
            label="Bloquear con código"
            desc={s.pin ? 'Activado · toca para cambiarlo' : 'Pide un PIN de 4 cifras al abrir'}
          />
          {s.pin && (
            <Button variant="ghost" size="sm" onClick={() => setPinOpen(true)}>
              Cambiar código
            </Button>
          )}
          <div className="divider" />
          <Toggle
            on={s.spicy}
            onChange={(v) => setS({ spicy: v })}
            label="Mazo de cartas íntimas"
            desc="Preguntas sobre deseo y complicidad en la sección de juegos"
          />
          <div className="divider" />
          <Toggle
            on={s.shareLocation}
            onChange={(v) => {
              setS({ shareLocation: v })
              if (!v) toast('Has dejado de compartir tu ubicación')
            }}
            label="Compartir mi ubicación"
            desc="Aunque la app esté cerrada. Sale una notificación fija mientras dure"
          />
          <div className="divider" />
          <Toggle
            on={s.notifications}
            onChange={async (v) => {
              if (v) {
                const ok = await ensureNotificationPermission()
                if (!ok) return toast('No se han concedido permisos de notificación')
              }
              setS({ notifications: v })
            }}
            label="Notificaciones"
            desc="Cumpleaños, aniversarios, eventos y mensajes nuevos del chat"
          />
        </Card>
      </div>

      {/* Sincronización */}
      <div className="stack-sm">
        <div className="eyebrow">Sincronización entre los dos móviles</div>
        <Card className="stack">
          <div className="row-between">
            <div className="grow">
              <div className="bold">
                {s.sync.enabled
                  ? syncState === 'error'
                    ? '⚠️ Con errores'
                    : syncState === 'working'
                      ? '🔄 Sincronizando…'
                      : '✅ Activada'
                  : 'Desactivada'}
              </div>
              <div className="tiny muted">
                {s.sync.lastSync ? `Última vez ${ago(s.sync.lastSync)}` : 'Todo se queda en este móvil'}
              </div>
              {syncError && <div className="tiny" style={{ color: '#e05353' }}>{syncError}</div>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSyncOpen(true)}>
              Configurar
            </Button>
          </div>
          {s.sync.enabled && (
            <Button variant="soft" block onClick={() => void syncNow()}>
              🔄 Sincronizar ahora
            </Button>
          )}
        </Card>
      </div>

      {/* Datos */}
      <div className="stack-sm">
        <div className="eyebrow">Vuestros datos</div>
        <Card className="stack">
          <Button variant="ghost" block onClick={() => void exportData()}>
            ⬇️ Descargar copia de seguridad
          </Button>
          <Button variant="ghost" block onClick={importData}>
            ⬆️ Restaurar desde una copia
          </Button>
          <p className="tiny muted">
            La copia incluye todo menos las fotos, que se quedan guardadas en cada móvil por su
            tamaño.
          </p>
          <div className="divider" />
          <Button variant="danger" block onClick={() => setResetOpen(true)}>
            Borrar todo y empezar de cero
          </Button>
        </Card>
      </div>

      <div className="center tiny muted" style={{ marginTop: 6 }}>
        {state.couple.title} · hecho con 💗
      </div>

      {/* Editar perfil */}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Editar perfil">
        {editing && (
          <div className="stack">
            <div className="center">
              <Avatar profile={profileOf(state, editing)} size="xl" />
            </div>
            <Button variant="ghost" block onClick={() => void changePhoto(editing)}>
              📷 Cambiar foto
            </Button>
            {profileOf(state, editing).photoId && (
              <Button
                variant="plain"
                block
                onClick={() => setProfile(editing, { photoId: undefined })}
              >
                Quitar foto
              </Button>
            )}
            <Field label="Nombre">
              <Input
                value={profileOf(state, editing).name}
                onChange={(v) => setProfile(editing, { name: v })}
                maxLength={20}
              />
            </Field>
            <Field label="Símbolo">
              <div className="chips">
                {AVATAR_EMOJIS.map((e) => (
                  <Chip
                    key={e}
                    on={profileOf(state, editing).emoji === e}
                    onClick={() => setProfile(editing, { emoji: e })}
                  >
                    {e}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="Cumpleaños">
              <input
                className="input"
                type="date"
                value={profileOf(state, editing).birthday ?? ''}
                onChange={(e) => setProfile(editing, { birthday: e.target.value })}
              />
            </Field>
            <Field label="Ciudad (opcional)">
              <Input
                value={profileOf(state, editing).city ?? ''}
                onChange={(v) => setProfile(editing, { city: v })}
                placeholder="Madrid"
              />
            </Field>
            <Button block onClick={() => setEditing(null)}>
              Listo
            </Button>
          </div>
        )}
      </Sheet>

      {/* PIN */}
      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} title="Código de acceso">
        <div className="stack">
          <p className="small muted">
            Cuatro cifras. Si lo olvidáis, tendréis que borrar los datos de la app, así que
            elegid algo que recordéis los dos.
          </p>
          <Input
            value={pin}
            onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            inputMode="numeric"
            maxLength={4}
          />
          <Button
            block
            disabled={pin.length !== 4}
            onClick={() => {
              setS({ pin })
              setPin('')
              setPinOpen(false)
              toast('Código guardado 🔒')
            }}
          >
            Guardar código
          </Button>
        </div>
      </Sheet>

      {/* Sync */}
      <Sheet open={syncOpen} onClose={() => setSyncOpen(false)} title="Sincronización">
        <div className="stack">
          <Card className="soft small">
            Por defecto todo se guarda solo en este móvil. Si queréis ver lo mismo los dos,
            necesitáis un proyecto gratuito de Supabase (5 minutos) y pegar aquí los mismos datos
            en ambos móviles.
          </Card>
          <Button variant="ghost" block onClick={() => setSqlOpen(true)}>
            📋 Ver los pasos y el SQL
          </Button>
          <Field label="URL del proyecto">
            <Input
              value={s.sync.url}
              onChange={(v) => setSync({ url: v.trim() })}
              placeholder="https://xxxx.supabase.co"
            />
          </Field>
          <Field label="Clave pública" hint="Se llama «Publishable key» en el panel nuevo de Supabase (antes «anon public»)">
            <Input value={s.sync.key} onChange={(v) => setSync({ key: v.trim() })} placeholder="eyJhbGci…" />
          </Field>
          <Field
            label="Código de pareja"
            hint="La misma palabra secreta en los dos móviles. Cuanto más larga, mejor."
          >
            <Input
              value={s.sync.code}
              onChange={(v) => setSync({ code: v.trim() })}
              placeholder="ana-y-leo-2019-luna"
            />
          </Field>
          <Button variant="ghost" block onClick={() => void test()} disabled={testing}>
            {testing ? 'Probando…' : '🔌 Probar conexión'}
          </Button>
          <Toggle
            on={s.sync.enabled}
            onChange={(v) => {
              if (v && !configValid({ ...s.sync })) return toast('Faltan datos por rellenar')
              setSync({ enabled: v })
              if (v) void syncNow()
            }}
            label="Activar sincronización"
            desc="Se sincroniza cada 25 segundos y al abrir la app"
          />
          <Button block onClick={() => setSyncOpen(false)}>
            Listo
          </Button>
        </div>
      </Sheet>

      <Sheet open={sqlOpen} onClose={() => setSqlOpen(false)} title="Cómo activar la sincronización">
        <div className="stack small">
          <ol style={{ paddingLeft: 18, lineHeight: 1.75, margin: 0 }}>
            <li>
              Entrad en <b>supabase.com</b> y cread una cuenta gratuita.
            </li>
            <li>
              Crear proyecto → cuando esté listo, abrid el <b>SQL Editor</b>.
            </li>
            <li>Pegad y ejecutad este código:</li>
          </ol>
          <pre
            className="card tight"
            style={{ fontSize: 11, overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.5 }}
          >
{`create table if not exists pares (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table pares enable row level security;
create policy "acceso con codigo"
  on pares for all
  using (true) with check (true);`}
          </pre>
          <ol start={4} style={{ paddingLeft: 18, lineHeight: 1.75, margin: 0 }}>
            <li>
              En <b>Project Settings → API</b> copiad la <b>Project URL</b> y, en la sección
              <b>Publishable key</b> (a veces sigue llamándose <b>anon public</b> en paneles
              antiguos), el valor que empieza por <code>sb_publishable_...</code> o
              <code>eyJ...</code>. Las dos sirven igual.
            </li>
            <li>Pegadlas aquí en los dos móviles, con el mismo código de pareja.</li>
          </ol>
          <Card className="soft tiny">
            El código de pareja es vuestra contraseña: quien lo sepa podría leer los datos. Usad
            algo largo y que no sea fácil de adivinar.
          </Card>
          <Button
            variant="ghost"
            block
            onClick={() =>
              void share(
                `create table if not exists pares (code text primary key, data jsonb not null, updated_at timestamptz default now()); alter table pares enable row level security; create policy "acceso con codigo" on pares for all using (true) with check (true);`,
                'SQL para la sincronización',
              )
            }
          >
            Compartir el SQL
          </Button>
          <Button block onClick={() => setSqlOpen(false)}>
            Entendido
          </Button>
        </div>
      </Sheet>

      <Confirm
        open={resetOpen}
        danger
        title="¿Borrar todo?"
        desc="Se borrarán los recuerdos, mensajes, respuestas y ajustes de este móvil. No se puede deshacer. Descarga antes una copia de seguridad si quieres conservarlo."
        confirmLabel="Sí, borrar todo"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetAll()
          setResetOpen(false)
        }}
      />
    </div>
  )
}
