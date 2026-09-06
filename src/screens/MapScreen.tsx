import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useNav } from '../router'
import { Avatar, Button, Card, Chip, Confirm, Field, Head, Input, Sheet, Toggle } from '../components/ui'
import LiveMap, { type MapMarker, type MapStyle } from '../components/LiveMap'
import { live, profileOf } from '../store/derive'
import {
  bearing,
  compass,
  distanceKm,
  distanceMood,
  fmtDistance,
  geoErrorMessage,
  getPosition,
  localTimeAt,
  travelTime,
} from '../lib/geo'
import { ago } from '../lib/dates'
import { haptic } from '../lib/native'
import { batteryExemptionStatus, requestBatteryExemption } from '../lib/background'
import type { Who } from '../types'

const PLACE_EMOJIS = ['🏡', '💼', '🏋️', '🎓', '☕', '🍽️', '🌳', '🏥', '🛒', '✈️', '🏖️', '🎬']

export default function MapScreen() {
  const { state, upsert, add, remove, update, me, other, toast } = useStore()
  const { back } = useNav()
  const [busy, setBusy] = useState(false)
  const [showMemories, setShowMemories] = useState(true)
  const [showPlaces, setShowPlaces] = useState(true)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [askShare, setAskShare] = useState(false)
  const [battery, setBattery] = useState({ exempt: true, needed: false })

  useEffect(() => {
    void batteryExemptionStatus().then(setBattery)
  }, [state.settings.shareLocation])
  const [placeName, setPlaceName] = useState('')
  const [placeEmoji, setPlaceEmoji] = useState('🏡')
  const [mapStyle, setMapStyle] = useState<MapStyle>(state.settings.dark ? 'noche' : 'calle')

  const mine = live(state.locations).find((l) => l.id === me)
  const theirs = live(state.locations).find((l) => l.id === other)
  const places = live(state.places)
  const otherP = profileOf(state, other)

  const km = mine && theirs ? distanceKm(mine, theirs) : null
  const dir = mine && theirs ? bearing(mine, theirs) : null

  const placeOf = (p?: { lat: number; lon: number }) =>
    p ? places.find((pl) => distanceKm(p, pl) * 1000 <= pl.radius) : undefined

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = []
    for (const who of [me, other] as Who[]) {
      const ping = who === me ? mine : theirs
      if (!ping) continue
      const p = profileOf(state, who)
      out.push({
        id: `p-${who}`,
        lat: ping.lat,
        lon: ping.lon,
        label: who === me ? 'Tú' : p.name,
        emoji: p.emoji,
        kind: 'persona',
        mine: who === me,
        sub: `Hace ${ago(ping.at).replace('hace ', '')}`,
      })
    }
    if (showPlaces) {
      for (const pl of places) {
        out.push({
          id: `l-${pl.id}`,
          lat: pl.lat,
          lon: pl.lon,
          label: pl.name,
          emoji: pl.emoji,
          kind: 'lugar',
        })
      }
    }
    if (showMemories) {
      for (const m of live(state.memories)) {
        if (m.lat != null && m.lon != null) {
          out.push({
            id: `r-${m.id}`,
            lat: m.lat,
            lon: m.lon,
            label: m.caption || 'Recuerdo',
            emoji: '📸',
            kind: 'recuerdo',
            sub: m.place,
          })
        }
      }
    }
    return out
  }, [state, me, other, mine, theirs, places, showMemories, showPlaces])

  const shareNow = async () => {
    setBusy(true)
    try {
      const pos = await getPosition()
      const { latitude, longitude, accuracy } = pos.coords
      const here = placeOf({ lat: latitude, lon: longitude })
      upsert('locations', me, () => ({
        who: me,
        lat: latitude,
        lon: longitude,
        accuracy,
        at: Date.now(),
        placeId: here?.id,
      }))
      void haptic('medium')
      toast(here ? `Compartido · estás en ${here.name}` : 'Ubicación compartida 📍')
    } catch (e) {
      toast(geoErrorMessage(e))
    }
    setBusy(false)
  }

  const savePlace = async () => {
    if (!placeName.trim()) return
    setBusy(true)
    try {
      const pos = await getPosition()
      add('places', {
        name: placeName.trim(),
        emoji: placeEmoji,
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        radius: 180,
      })
      setPlaceName('')
      setPlaceOpen(false)
      toast('Lugar guardado 📍')
    } catch (e) {
      toast(geoErrorMessage(e))
    }
    setBusy(false)
  }

  const stopSharing = () => {
    update((s) => ({ ...s, settings: { ...s.settings, shareLocation: false } }))
    remove('locations', me)
    toast('Has dejado de compartir tu ubicación')
  }

  const openInMaps = (lat: number, lon: number, label: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
    window.open(url, '_blank', 'noopener')
    toast(`Abriendo ${label} en Google Maps`)
  }

  const myPlace = placeOf(mine)
  const theirPlace = placeOf(theirs)

  return (
    <div className="page stack">
      <Head
        title="Dónde estamos 🗺️"
        sub={state.couple.longDistance ? 'Aunque estemos lejos' : 'Vuestro mapa en tiempo real'}
        back={back}
        right={
          <button className="icon-btn" onClick={() => setPlaceOpen(true)} aria-label="Guardar lugar">
            📍
          </button>
        }
      />

      {!mine && !theirs ? (
        <Card className="soft center stack">
          <div style={{ fontSize: 46 }}>🗺️</div>
          <h2>Vuestro mapa privado</h2>
          <p className="small muted">
            Comparte tu posición cuando quieras y veréis dónde está cada uno en un mapa de verdad, a
            qué distancia estáis y cuánto se tarda en llegar. Sin claves ni cuentas: usa
            OpenStreetMap, que es libre.
          </p>
          <Button block onClick={() => setAskShare(true)}>
            🧭 Compartir mi ubicación
          </Button>
        </Card>
      ) : (
        <LiveMap markers={markers} height={340} style={mapStyle} onStyleChange={setMapStyle} />
      )}

      {km !== null && (
        <div className="hero">
          <div className="tiny" style={{ opacity: 0.85, letterSpacing: '.12em', fontWeight: 700 }}>
            OS SEPARAN
          </div>
          <div className="display" style={{ fontSize: 44, lineHeight: 1.05, marginTop: 4 }}>
            {fmtDistance(km)}
          </div>
          <div style={{ opacity: 0.94, fontSize: 14 }}>{distanceMood(km)}</div>
          <div
            style={{
              height: 1,
              background: 'rgba(255,255,255,.3)',
              margin: '14px 0 10px',
            }}
          />
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ opacity: 0.92 }}>
              {km > 0.05 ? travelTime(km) : 'Ya no hay nada que recorrer 💗'}
            </span>
            {dir !== null && km > 0.2 && (
              <span style={{ opacity: 0.92 }}>
                {otherP.name} está al {compass(dir)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Estado de cada uno */}
      <div className="list">
        {([me, other] as Who[]).map((who) => {
          const ping = who === me ? mine : theirs
          const place = who === me ? myPlace : theirPlace
          const p = profileOf(state, who)
          return (
            <div key={who} className="list-item">
              <Avatar profile={p} size="sm" />
              <div className="grow">
                <div className="bold small">{who === me ? `${p.name} (tú)` : p.name}</div>
                <div className="tiny muted">
                  {ping
                    ? `${place ? `En ${place.emoji} ${place.name}` : 'Compartiendo'} · ${ago(ping.at)}`
                    : who === me
                      ? 'No estás compartiendo'
                      : 'Todavía no comparte su ubicación'}
                </div>
                {ping?.battery != null && (
                  <div
                    className="tiny"
                    style={{ color: ping.battery <= 15 ? 'var(--accent)' : 'var(--muted)' }}
                  >
                    {ping.battery <= 15 ? '🪫' : '🔋'} {ping.battery}%
                    {ping.battery <= 15 && who !== me ? ' · se está quedando sin batería' : ''}
                  </div>
                )}
              </div>
              {ping && (
                <>
                  <span className="badge">{localTimeAt(ping.lon, ping.at)}</span>
                  <button
                    className="icon-btn"
                    aria-label="Abrir en Google Maps"
                    onClick={() => openInMaps(ping.lat, ping.lon, p.name)}
                  >
                    ➤
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      <Button block onClick={() => void shareNow()} disabled={busy}>
        🧭 {busy ? 'Buscando señal…' : 'Actualizar mi posición'}
      </Button>

      <Card className="stack-sm">
        <Toggle
          on={state.settings.shareLocation}
          onChange={(v) => (v ? setAskShare(true) : stopSharing())}
          label="Compartir siempre mi ubicación"
          desc="Se actualiza sola cada pocos minutos, aunque cierres la app"
        />
        {state.settings.shareLocation && (
          <div className="tiny muted" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
            Verás una notificación fija de MyCouple mientras esté activo: Android la obliga y es lo
            que impide que el móvil cierre el seguimiento. Sólo avisa si te mueves más de 50 metros,
            así que apenas gasta batería.
          </div>
        )}
      </Card>

      {/* Lo que hace falta para que funcione de verdad con la app cerrada */}
      {state.settings.shareLocation && battery.needed && !battery.exempt && (
        <Card className="stack-sm" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="bold small">🔋 Falta un permiso para que no se corte</div>
          <div className="tiny muted">
            Tu móvil tiene permiso para cerrar MyCouple cuando lleva un rato sin usarse, y ahí deja
            de compartir la ubicación. Quitando esa "optimización de batería" sigue funcionando
            siempre, aunque la app esté cerrada del todo.
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await requestBatteryExemption()
              setBattery(await batteryExemptionStatus())
            }}
          >
            Arreglarlo ahora
          </Button>
        </Card>
      )}

      {state.settings.shareLocation && battery.needed && battery.exempt && (
        <div className="tiny muted center">
          ✅ Configurado para funcionar con la app cerrada y tras reiniciar el móvil
        </div>
      )}

      {/* Filtros */}
      <div className="chips">
        <Chip on={showPlaces} onClick={() => setShowPlaces(!showPlaces)}>
          📍 Nuestros lugares
        </Chip>
        <Chip on={showMemories} onClick={() => setShowMemories(!showMemories)}>
          📸 Recuerdos
        </Chip>
      </div>

      {/* Lugares */}
      <div className="stack-sm">
        <div className="row-between">
          <span className="eyebrow">Nuestros lugares</span>
          <button className="tiny accent bold" onClick={() => setPlaceOpen(true)}>
            Guardar dónde estoy
          </button>
        </div>
        {places.length === 0 ? (
          <Card className="tight small muted center">
            Guarda casa, el trabajo o vuestro bar de siempre y la app dirá «está en casa» en lugar
            de unas coordenadas.
          </Card>
        ) : (
          <div className="list">
            {places.map((pl) => {
              const quien = ([me, other] as Who[]).filter((w) => {
                const ping = w === me ? mine : theirs
                return ping && distanceKm(ping, pl) * 1000 <= pl.radius
              })
              return (
                <div key={pl.id} className="list-item">
                  <span style={{ fontSize: 22 }}>{pl.emoji}</span>
                  <div className="grow">
                    <div className="bold small">{pl.name}</div>
                    <div className="tiny muted">
                      {quien.length
                        ? `${quien.map((w) => profileOf(state, w).name).join(' y ')} ${
                            quien.length > 1 ? 'están' : 'está'
                          } aquí`
                        : 'Nadie ahora mismo'}
                    </div>
                  </div>
                  <button className="tiny muted" onClick={() => remove('places', pl.id)}>
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {state.settings.shareLocation && !state.settings.sync.enabled && (
        <Card className="tight" style={{ borderColor: 'var(--accent)' }}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div className="grow">
              <div className="bold small">Falta conectar los dos móviles</div>
              <div className="tiny muted">
                Estás compartiendo tu ubicación, pero sin la sincronización activada se queda
                guardada solo en este móvil y {otherP.name} no la verá. Actívala en Ajustes →
                Sincronización.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="tight">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <p className="tiny muted grow">
            Tu ubicación sólo se guarda en vuestros móviles y, si tenéis la sincronización activada,
            en vuestro propio servidor. Los mapas vienen de OpenStreetMap, que no sabe quién eres.
            Puedes dejar de compartirla cuando quieras y se borra.
          </p>
        </div>
      </Card>

      <Sheet open={placeOpen} onClose={() => setPlaceOpen(false)} title="Guardar este lugar">
        <div className="stack">
          <p className="small muted">
            Se guarda la posición en la que estás ahora mismo con el nombre que le pongas.
          </p>
          <Field label="Nombre">
            <Input value={placeName} onChange={setPlaceName} placeholder="Casa" />
          </Field>
          <Field label="Icono">
            <div className="chips">
              {PLACE_EMOJIS.map((e) => (
                <Chip key={e} on={placeEmoji === e} onClick={() => setPlaceEmoji(e)}>
                  <span style={{ fontSize: 17 }}>{e}</span>
                </Chip>
              ))}
            </div>
          </Field>
          <Button block onClick={() => void savePlace()} disabled={!placeName.trim() || busy}>
            {busy ? 'Localizando…' : 'Guardar lugar'}
          </Button>
        </div>
      </Sheet>

      <Confirm
        open={askShare}
        title="¿Compartir tu ubicación?"
        desc={`${otherP.name} podrá ver dónde estás mientras lo tengas activado, incluso con la app cerrada. Android mostrará una notificación fija mientras dure (es obligatorio). No se envía a ningún servicio externo y puedes apagarlo cuando quieras.`}
        confirmLabel="Sí, compartir"
        onCancel={() => setAskShare(false)}
        onConfirm={() => {
          update((s) => ({ ...s, settings: { ...s.settings, shareLocation: true } }))
          setAskShare(false)
          void shareNow()
        }}
      />
    </div>
  )
}
