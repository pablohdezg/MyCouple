import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLon } from '../lib/geo'

/**
 * Mapa real, con Leaflet y teselas de OpenStreetMap.
 *
 * No hace falta ninguna clave de API ni cuenta: OpenStreetMap es libre y
 * cubre el mundo entero. La librería va empotrada en la app (no se descarga
 * de ningún CDN), así que dentro del APK funciona igual.
 */

export interface MapMarker extends LatLon {
  id: string
  label: string
  emoji: string
  kind: 'persona' | 'lugar' | 'recuerdo'
  mine?: boolean
  sub?: string
}

export type MapStyle = 'calle' | 'satelite' | 'noche'

const LAYERS: Record<MapStyle, { url: string; attr: string; max: number }> = {
  calle: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '© OpenStreetMap',
    max: 19,
  },
  satelite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '© Esri, Maxar, Earthstar Geographics',
    max: 18,
  },
  noche: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '© OpenStreetMap · CARTO',
    max: 19,
  },
}

/** Alternativas si el proveedor principal no responde. */
const FALLBACKS: Record<MapStyle, string[]> = {
  calle: [
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  ],
  satelite: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  noche: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
}

function pinIcon(m: MapMarker): L.DivIcon {
  const size = m.kind === 'persona' ? 46 : 32
  const cls = `map-pin map-pin--${m.kind}${m.mine ? ' map-pin--mine' : ''}`
  return L.divIcon({
    className: 'map-pin-wrap',
    html: `<div class="${cls}"><span>${m.emoji}</span></div>${
      m.kind === 'persona' ? `<b class="map-pin-label">${escapeHtml(m.label)}</b>` : ''
    }`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export default function LiveMap({
  markers,
  height = 340,
  style = 'calle',
  onStyleChange,
  interactive = true,
}: {
  markers: MapMarker[]
  height?: number
  style?: MapStyle
  onStyleChange?: (s: MapStyle) => void
  /** false = vista previa: sin arrastrar, sin zoom, sin popups ni controles. */
  interactive?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.TileLayer | null>(null)
  const group = useRef<L.LayerGroup | null>(null)
  const line = useRef<L.Polyline | null>(null)
  const follow = useRef(true)
  const tries = useRef(0)
  const [offline, setOffline] = useState(false)

  /* ---- crear el mapa una sola vez ---- */
  useEffect(() => {
    if (!host.current || map.current) return
    const m = L.map(host.current, {
      zoomControl: false,
      attributionControl: interactive,
      preferCanvas: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
    }).setView([40.4168, -3.7038], 3)
    if (interactive) L.control.zoom({ position: 'bottomright' }).addTo(m)
    m.attributionControl?.setPrefix('')
    group.current = L.layerGroup().addTo(m)
    map.current = m
    // Si el usuario mueve el mapa, deja de seguirle automáticamente
    m.on('dragstart zoomstart', () => {
      follow.current = false
    })
    // El contenedor puede terminar de dimensionarse después del montaje:
    // sin esto Leaflet calcula mal cuántas teselas pedir.
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(host.current)
    const t1 = setTimeout(() => m.invalidateSize(), 80)
    const t2 = setTimeout(() => m.invalidateSize(), 400)
    return () => {
      ro.disconnect()
      clearTimeout(t1)
      clearTimeout(t2)
      m.remove()
      map.current = null
    }
  }, [])

  /* ---- capa de teselas (con alternativas si falla) ---- */
  useEffect(() => {
    const m = map.current
    if (!m) return
    tries.current = 0
    setOffline(false)

    const build = (url: string) => {
      const cfg = LAYERS[style]
      const tl = L.tileLayer(url, {
        maxZoom: cfg.max,
        attribution: cfg.attr,
        crossOrigin: false,
      })
      let ok = false
      let errors = 0
      tl.on('tileload', () => {
        ok = true
        setOffline(false)
      })
      tl.on('tileerror', () => {
        errors++
        if (ok || errors < 4) return
        const next = FALLBACKS[style][tries.current]
        tries.current++
        if (next) {
          m.removeLayer(tl)
          layer.current = build(next)
        } else {
          setOffline(true)
        }
      })
      tl.addTo(m)
      tl.bringToBack()
      return tl
    }

    if (layer.current) m.removeLayer(layer.current)
    layer.current = build(LAYERS[style].url)
  }, [style])

  /* ---- marcadores ---- */
  useEffect(() => {
    const m = map.current
    const g = group.current
    if (!m || !g) return
    g.clearLayers()

    for (const mk of markers) {
      const marker = L.marker([mk.lat, mk.lon], {
        icon: pinIcon(mk),
        title: mk.label,
        zIndexOffset: mk.kind === 'persona' ? 1000 : 0,
        interactive,
      })
      if (interactive) {
        marker.bindPopup(
          `<b>${escapeHtml(mk.label)}</b>${mk.sub ? `<br>${escapeHtml(mk.sub)}` : ''}`,
        )
      }
      marker.addTo(g)
    }

    const people = markers.filter((x) => x.kind === 'persona')
    if (line.current) {
      m.removeLayer(line.current)
      line.current = null
    }
    if (people.length === 2) {
      line.current = L.polyline(
        people.map((p) => [p.lat, p.lon] as [number, number]),
        {
          color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() ||
            '#e8567c',
          weight: 3,
          opacity: 0.85,
          dashArray: '2 8',
          lineCap: 'round',
        },
      ).addTo(m)
    }

    if (follow.current) {
      const focus = people.length ? people : markers
      if (focus.length === 1) {
        m.setView([focus[0].lat, focus[0].lon], Math.max(m.getZoom(), 15))
      } else if (focus.length > 1) {
        m.fitBounds(
          L.latLngBounds(focus.map((p) => [p.lat, p.lon] as [number, number])).pad(0.35),
          { maxZoom: 16 },
        )
      }
    }
  }, [markers])

  const recentre = () => {
    follow.current = true
    const m = map.current
    if (!m) return
    const people = markers.filter((x) => x.kind === 'persona')
    const focus = people.length ? people : markers
    if (focus.length === 1) m.setView([focus[0].lat, focus[0].lon], 16)
    else if (focus.length > 1)
      m.fitBounds(L.latLngBounds(focus.map((p) => [p.lat, p.lon] as [number, number])).pad(0.35), {
        maxZoom: 16,
      })
  }

  return (
    <div className="mapwrap" style={{ height }}>
      <div ref={host} style={{ width: '100%', height: '100%' }} />

      {onStyleChange && (
        <div className="map-styles">
          {(
            [
              ['calle', '🗺️', 'Mapa'],
              ['satelite', '🛰️', 'Satélite'],
              ['noche', '🌙', 'Noche'],
            ] as const
          ).map(([id, emoji, label]) => (
            <button
              key={id}
              className={style === id ? 'on' : ''}
              onClick={() => onStyleChange(id)}
              aria-label={label}
              title={label}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {interactive && (
        <button className="map-recentre" onClick={recentre} aria-label="Centrar en nosotros">
          🎯
        </button>
      )}

      {offline && interactive && (
        <div className="map-offline">
          📡 Sin conexión: el mapa se verá al recuperar internet
        </div>
      )}
    </div>
  )
}
