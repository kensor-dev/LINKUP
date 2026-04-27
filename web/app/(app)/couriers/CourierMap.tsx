'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LiveCourier {
  courierId: string
  name: string
  isOnline: boolean
  lat: number | null
  lng: number | null
}

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const onlineIcon = new L.DivIcon({
  html: `<div style="
    width:32px;height:32px;border-radius:50%;
    background:#22C55E;border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
})

function FitBounds({ couriers }: { couriers: LiveCourier[] }) {
  const map = useMap()
  useEffect(() => {
    const points = couriers
      .filter((c) => c.lat !== null && c.lng !== null)
      .map((c) => [c.lat!, c.lng!] as [number, number])
    if (points.length === 1) {
      map.setView(points[0], 14)
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
    }
  }, [couriers, map])
  return null
}

export default function CourierMap({ couriers }: { couriers: LiveCourier[] }) {
  const online = couriers.filter((c) => c.isOnline && c.lat !== null && c.lng !== null)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Курьеры на карте</h2>
        <span className="text-xs text-slate-500">
          {online.length > 0
            ? `${online.length} онлайн с геопозицией`
            : 'Нет курьеров онлайн с геопозицией'}
        </span>
      </div>

      {online.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-slate-400 text-sm">
          <div className="text-center space-y-2">
            <div className="text-3xl">📍</div>
            <p>Нет курьеров онлайн с включённой геолокацией</p>
          </div>
        </div>
      ) : (
        <div className="h-96">
          <MapContainer
            center={[55.7558, 37.6176]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds couriers={online} />
            {online.map((c) => (
              <Marker
                key={c.courierId}
                position={[c.lat!, c.lng!]}
                icon={onlineIcon}
              >
                <Popup>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-green-600 mt-0.5">Онлайн</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {c.lat!.toFixed(5)}, {c.lng!.toFixed(5)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
