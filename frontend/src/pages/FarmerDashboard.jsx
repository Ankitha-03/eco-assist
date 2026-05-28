import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Bell, WifiOff, X, Plus, LogOut } from 'lucide-react'
import api, { WS_BASE } from '../api'
import CornerBrackets from '../components/CornerBrackets'

const API_BASE = import.meta.env.VITE_API_URL || 'https://eco-assist-1.onrender.com'

/* ── Sparkline ────────────────────────────────────────────── */
function Sparkline({ data, color = '#22a855' }) {
  if (!data || data.length < 2) return <div style={{ width: 60, height: 28 }} />
  const W = 60, H = 28
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`)
    .join(' ')
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        opacity={0.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ── Health Gauge ─────────────────────────────────────────── */
function HealthGauge({ score }) {
  const r = 76, cx = 100, cy = 100
  const circ = Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 75 ? '#22a855' : score >= 40 ? '#e07c00' : '#d93025'
  const label = score >= 75 ? 'LOW RISK' : score >= 50 ? 'MEDIUM RISK' : score >= 25 ? 'HIGH RISK' : 'CRITICAL'
  const isCrit = score < 25

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="200" height="120" viewBox="0 0 200 120" style={{ overflow: 'visible' }}>
        {isCrit && (
          <path
            d={`M ${cx - r - 12} ${cy} A ${r + 12} ${r + 12} 0 0 1 ${cx + r + 12} ${cy}`}
            fill="none" stroke="rgba(217, 48, 37,0.15)" strokeWidth={8} strokeLinecap="round"
            style={{ animation: 'pulseCrit 1.8s ease-in-out infinite' }}
          />
        )}
        {/* Track */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(34, 139, 87, 0.12)" strokeWidth={14} strokeLinecap="round" />
        {/* Fill */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1), stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${color}80)`,
          }} />
        {/* Score */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
          fontSize="36" fontWeight="800" fontFamily="Space Grotesk"
          style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}>
          {score.toFixed(0)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#3d6b50"
          fontSize="9" fontFamily="Orbitron" letterSpacing="2">
          {label}
        </text>
      </svg>
      <div style={{ fontSize: '0.68rem', color: '#7a9e8a', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: -2 }}>
        Crop Health Score
      </div>
    </div>
  )
}

/* ── Sensor Card ──────────────────────────────────────────── */
function SensorCard({ label, value, unit, icon, color = '#1a2e22', danger, sparkData }) {
  const c = danger ? '#d93025' : color
  return (
    <div
      className={`glass-card${danger ? ' card-critical' : ''}`}
      style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}
    >
      <CornerBrackets color={c} size={10} opacity={0.45} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3d6b50', fontWeight: 600 }}>
          {label}
        </span>
        <span style={{ fontSize: '1.15rem' }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Space Grotesk', fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: c }}>
        {value != null ? value.toFixed(1) : '—'}
        <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#7a9e8a', marginLeft: 4 }}>{unit}</span>
      </div>
      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={sparkData} color={c} />
        </div>
      )}
    </div>
  )
}

/* ── Alert Item ───────────────────────────────────────────── */
function AlertItem({ alert, onRead }) {
  const isCrit = alert.severity === 'critical'
  return (
    <motion.div
      initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
        borderRadius: 10, marginBottom: 8,
        background: isCrit ? 'rgba(217, 48, 37,0.07)' : 'rgba(224, 124, 0,0.05)',
        border: `1px solid ${isCrit ? 'rgba(217, 48, 37,0.28)' : 'rgba(224, 124, 0,0.22)'}`,
        borderLeft: `3px solid ${isCrit ? '#d93025' : '#e07c00'}`,
        animation: isCrit && !alert.is_read ? 'pulseCrit 2s ease-in-out infinite' : 'none',
      }}>
      <span style={{ fontSize: '1rem', marginTop: 1 }}>{isCrit ? '🚨' : '⚠️'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1a2e22', lineHeight: 1.4 }}>{alert.message}</div>
        <div style={{ fontSize: '0.7rem', color: '#3d6b50', marginTop: 3 }}>
          {new Date(alert.created_at).toLocaleString()}
        </div>
      </div>
      {!alert.is_read && (
        <button
          style={{
            background: 'rgba(34, 139, 87,0.07)', border: '1px solid rgba(34, 139, 87,0.2)',
            color: '#22a855', borderRadius: 6, padding: '3px 9px',
            fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onClick={() => onRead(alert.id)}>
          Mark read
        </button>
      )}
    </motion.div>
  )
}

/* ── Custom Tooltip ───────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(34, 139, 87,0.25)',
      borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(20px)',
      fontFamily: 'Space Grotesk', fontSize: '0.8rem',
    }}>
      <div style={{ color: '#3d6b50', marginBottom: 4 }}>
        {label ? new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </div>
      <div style={{ color: val >= 75 ? '#22a855' : val >= 40 ? '#e07c00' : '#d93025', fontWeight: 700, fontSize: '1rem' }}>
        {val?.toFixed(1)} <span style={{ fontSize: '0.7rem', color: '#7a9e8a', fontWeight: 400 }}>health score</span>
      </div>
    </div>
  )
}

/* ── Listing Modal ────────────────────────────────────────── */
function ListingModal({ devices, onClose, onCreated }) {
  const [form, setForm] = useState({
    produce_name: '', quantity_kg: '', asking_price_per_kg: '',
    description: '', device_id: '', expires_at: '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      const payload = {
        ...form,
        quantity_kg: parseFloat(form.quantity_kg),
        asking_price_per_kg: parseFloat(form.asking_price_per_kg),
        device_id: form.device_id || null,
        expires_at: form.expires_at || null,
      }
      const { data } = await api.post('/farmer/listings', payload)
      onCreated(data)
      onClose()
    } catch (err) {
      setErr(err.response?.data?.detail || 'Failed to create listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal"
        initial={{ y: 48, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="modal-header">
          <h2>📦 List Produce for Sale</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        {err && (
          <div className="alert-banner alert-banner-critical mb-4">
            <span>⚠️</span> {err}
          </div>
        )}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Produce Name</label>
            <input name="produce_name" value={form.produce_name} onChange={handle}
              placeholder="e.g. Tomatoes" required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Quantity (kg)</label>
              <input name="quantity_kg" type="number" min="1" value={form.quantity_kg}
                onChange={handle} placeholder="500" required />
            </div>
            <div className="form-group">
              <label>Price / kg (₹)</label>
              <input name="asking_price_per_kg" type="number" min="0.01" step="0.01"
                value={form.asking_price_per_kg} onChange={handle} placeholder="45" required />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handle}
              rows={2} placeholder="Freshly harvested, stored at optimal conditions…" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Link Device</label>
              <select name="device_id" value={form.device_id} onChange={handle}>
                <option value="">— No device —</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.device_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Expires At</label>
              <input name="expires_at" type="datetime-local" value={form.expires_at} onChange={handle} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create Listing'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

const scoreColor = (s) => (s >= 75 ? '#22a855' : s >= 40 ? '#e07c00' : '#d93025')

/* ══════════════════════════════════════════════════════════ */
export default function FarmerDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const wsRef = useRef(null)

  const [connected, setConnected] = useState(false)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [telemetry, setTelemetry] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [alerts, setAlerts] = useState([])
  const [listings, setListings] = useState([])
  const [bids, setBids] = useState({})
  const [unreadCount, setUnreadCount] = useState(0)
  const [showListing, setShowListing] = useState(false)
  const [liveAlerts, setLiveAlerts] = useState([])
  const [showBidsFor, setShowBidsFor] = useState(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── Data loading (unchanged) ─────────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      const [devRes, alertRes, listRes] = await Promise.all([
        api.get('/farmer/devices'),
        api.get('/farmer/alerts'),
        api.get('/farmer/listings'),
      ])
      setDevices(devRes.data)
      setAlerts(alertRes.data)
      setListings(listRes.data)
      setUnreadCount(alertRes.data.filter((a) => !a.is_read).length)
      if (devRes.data.length && !selectedDevice) setSelectedDevice(devRes.data[0])
    } catch (e) { console.error(e) }
  }, [])

  const loadDeviceData = useCallback(async (deviceId) => {
    try {
      const [telRes, snapRes] = await Promise.all([
        api.get(`/farmer/telemetry/${deviceId}?limit=50`),
        api.get(`/farmer/snapshots/${deviceId}?limit=5`),
      ])
      setTelemetry(telRes.data.slice().reverse())
      setSnapshots(snapRes.data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (selectedDevice) loadDeviceData(selectedDevice.id)
    const interval = setInterval(() => {
      if (selectedDevice) loadDeviceData(selectedDevice.id)
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedDevice, loadDeviceData])

  /* ── WebSocket (unchanged) ────────────────────────────── */
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/${user.id}`)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'alert') {
          setLiveAlerts((prev) => [msg, ...prev].slice(0, 5))
          setUnreadCount((n) => n + 1)
          setAlerts((prev) => [msg, ...prev])
        }
        if (msg.type === 'telemetry' && selectedDevice && msg.device_id === selectedDevice.id) {
          setTelemetry((prev) => [...prev, msg].slice(-50))
        }
      } catch { }
    }
    return () => ws.close()
  }, [user.id, selectedDevice])

  /* ── Actions (unchanged) ─────────────────────────────── */
  const markRead = async (id) => {
    await api.post(`/farmer/alerts/${id}/read`)
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
    setUnreadCount((n) => Math.max(0, n - 1))
  }

  const loadBids = async (listingId) => {
    const { data } = await api.get(`/farmer/bids/${listingId}`)
    setBids((prev) => ({ ...prev, [listingId]: data }))
    setShowBidsFor(listingId)
  }

  const respondBid = async (bidId, action, counter = null) => {
    await api.post(`/farmer/bids/${bidId}/respond`, { action, counter_price: counter })
    if (showBidsFor) loadBids(showBidsFor)
    loadAll()
  }

  const logout = () => { localStorage.clear(); navigate('/') }

  /* ── Derived data ────────────────────────────────────── */
  const latest = telemetry[telemetry.length - 1]
  const latestSnap = snapshots[0]

  const sparkTemp = telemetry.slice(-20).map((t) => t.temperature).filter((v) => v != null)
  const sparkHumid = telemetry.slice(-20).map((t) => t.humidity).filter((v) => v != null)
  const sparkVoc = telemetry.slice(-20).map((t) => t.voc_level).filter((v) => v != null)
  const sparkAmm = telemetry.slice(-20).map((t) => t.ammonia_level).filter((v) => v != null)

  const healthColor = scoreColor(latest?.health_score ?? 80)

  const cardAnim = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  })

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="dashboard-layout">

      {/* ── SIDEBAR ───────────────────────────────────── */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(34, 139, 87,0.08)' }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 700, color: '#22a855', letterSpacing: '0.08em' }}>
            🌿 ECO-ASSIST
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: '0.68rem', color: connected ? '#22a855' : '#3d6b50', letterSpacing: '0.1em', fontFamily: 'Orbitron' }}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Farmer avatar */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(34, 139, 87,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34, 139, 87,0.2), rgba(33, 150, 168,0.1))',
              border: '2px solid rgba(34, 139, 87,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', color: '#22a855',
            }}>
              {(user.full_name || 'F')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a2e22' }}>{user.full_name || 'Farmer'}</div>
              <div style={{ fontSize: '0.72rem', color: '#3d6b50', marginTop: 2 }}>{user.location || 'Farmer Portal'}</div>
            </div>
          </div>
        </div>

        {/* Device selector */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7a9e8a', marginBottom: 10, fontFamily: 'Orbitron' }}>
            My Devices
          </div>
          {devices.map((d) => (
            <button key={d.id} onClick={() => setSelectedDevice(d)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 8, border: 'none',
                background: selectedDevice?.id === d.id ? 'rgba(34, 139, 87,0.08)' : 'transparent',
                color: selectedDevice?.id === d.id ? '#22a855' : '#3d6b50',
                cursor: 'pointer', marginBottom: 4, fontFamily: 'Inter',
                borderLeft: `3px solid ${selectedDevice?.id === d.id ? '#22a855' : 'transparent'}`,
                transition: 'all 0.2s ease',
              }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>📡 {d.device_name}</div>
              <div style={{ fontSize: '0.72rem', color: '#7a9e8a', marginTop: 2 }}>{d.location || d.mac_address}</div>
            </button>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(34, 139, 87,0.06)' }}>
          <button className="btn btn-ghost btn-sm w-full" onClick={logout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────── */}
      <main className="main-content">

        {/* Top bar */}
        <motion.div {...cardAnim(0)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 className="font-orbitron" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a2e22', letterSpacing: '0.05em' }}>
              FARMER DASHBOARD
            </h1>
            <div style={{ fontSize: '0.72rem', color: '#3d6b50', marginTop: 4, fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              {selectedDevice && ` · 📡 ${selectedDevice.device_name}`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-sm" style={{ position: 'relative' }}>
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#d93025', color: 'white', fontSize: '0.6rem',
                    borderRadius: '50%', width: 17, height: 17,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    animation: 'pulseBadge 1.5s ease infinite',
                  }}>{unreadCount}</span>
                )}
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowListing(true)}>
              <Plus size={14} /> Sell Produce
            </button>
          </div>
        </motion.div>

        {/* Live alert banners */}
        <AnimatePresence>
          {liveAlerts.slice(0, 2).map((a, i) => (
            <motion.div key={i}
              initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 10, marginBottom: 10,
                background: a.severity === 'critical' ? 'rgba(217, 48, 37,0.1)' : 'rgba(224, 124, 0,0.08)',
                border: `1px solid ${a.severity === 'critical' ? 'rgba(217, 48, 37,0.4)' : 'rgba(224, 124, 0,0.35)'}`,
                borderLeft: `4px solid ${a.severity === 'critical' ? '#d93025' : '#e07c00'}`,
              }}>
              <span>{a.severity === 'critical' ? '🚨' : '⚠️'}</span>
              <span style={{ flex: 1, fontSize: '0.875rem', color: '#1a2e22' }}>{a.message}</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d6b50' }}
                onClick={() => setLiveAlerts((p) => p.filter((_, idx) => idx !== i))}>
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {selectedDevice && (
          <>
            {/* ── ROW 1: Health Gauge + Sensors ──────── */}
            <motion.div {...cardAnim(0.08)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
              {/* Health gauge card */}
              <div className="glass-card" style={{ padding: '20px 16px', position: 'relative', gridColumn: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <CornerBrackets color={healthColor} size={12} opacity={0.6} />
                <HealthGauge score={latest?.health_score ?? 0} />
              </div>

              <SensorCard
                label="Temperature" value={latest?.temperature} unit="°C" icon="🌡️"
                color={latest?.temperature > 15 ? '#d93025' : '#22a855'}
                danger={latest?.temperature > 25}
                sparkData={sparkTemp}
              />
              <SensorCard
                label="Humidity" value={latest?.humidity} unit="%" icon="💧"
                color={latest?.humidity < 70 ? '#e07c00' : '#22a855'}
                sparkData={sparkHumid}
              />
              <SensorCard
                label="VOC Level" value={latest?.voc_level} unit="ppm" icon="🌫️"
                color={latest?.voc_level > 200 ? '#e07c00' : '#22a855'}
                danger={latest?.voc_level > 500}
                sparkData={sparkVoc}
              />
            </motion.div>

            {/* ── ROW 2: Ammonia + Pressure ──────────── */}
            <motion.div {...cardAnim(0.14)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <SensorCard
                label="Ammonia" value={latest?.ammonia_level} unit="ppm" icon="⚗️"
                color={latest?.ammonia_level > 25 ? '#d93025' : '#22a855'}
                danger={latest?.ammonia_level > 50}
                sparkData={sparkAmm}
              />
              <SensorCard
                label="Pressure" value={latest?.pressure} unit="hPa" icon="🔵"
                color="#2196a8"
              />
            </motion.div>

            {/* ── ROW 3: Area Chart ──────────────────── */}
            <motion.div {...cardAnim(0.2)} className="glass-card" style={{ padding: '22px 24px', marginBottom: 16, position: 'relative' }}>
              <CornerBrackets color={healthColor} size={12} opacity={0.5} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a2e22' }}>Health Score History</h3>
                  <div style={{ fontSize: '0.7rem', color: '#3d6b50', marginTop: 3 }}>Last {telemetry.length} readings</div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.68rem', color: '#7a9e8a' }}>
                  <span style={{ color: '#22a855' }}>── &gt;75 Healthy</span>
                  <span style={{ color: '#e07c00' }}>── &gt;50 Moderate</span>
                  <span style={{ color: '#d93025' }}>── &lt;25 Critical</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={telemetry} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={healthColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={healthColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="recorded_at"
                    tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    tick={{ fill: '#7a9e8a', fontSize: 10, fontFamily: 'Inter' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]}
                    tick={{ fill: '#7a9e8a', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={75} stroke="rgba(34, 139, 87,0.25)" strokeDasharray="4 4" />
                  <ReferenceLine y={50} stroke="rgba(224, 124, 0,0.25)" strokeDasharray="4 4" />
                  <ReferenceLine y={25} stroke="rgba(217, 48, 37,0.25)" strokeDasharray="4 4" />
                  <Area
                    type="monotone" dataKey="health_score"
                    stroke={healthColor} strokeWidth={2} fill="url(#healthGrad)"
                    dot={false} activeDot={{ r: 4, fill: healthColor, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* ── ROW 4: Camera + Alerts ─────────────── */}
            <motion.div {...cardAnim(0.26)} style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 14, marginBottom: 16 }}>
              {/* Camera */}
              <div className="glass-card" style={{ padding: 22, position: 'relative' }}>
                <CornerBrackets color="#2196a8" size={12} opacity={0.6} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#1a2e22' }}>Camera Feed</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => window.open('/qr-camera', '_blank')}
                      style={{
                        background: 'rgba(34,139,87,0.08)', border: '1px solid rgba(34,139,87,0.25)',
                        color: '#22a855', borderRadius: 6, padding: '4px 10px',
                        fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'Space Grotesk, sans-serif', whiteSpace: 'nowrap',
                      }}>
                      📱 Mobile Camera →
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: '#22a855', fontFamily: 'Orbitron', letterSpacing: '0.1em' }}>
                      <span className="live-dot" style={{ width: 6, height: 6 }} /> LIVE
                    </div>
                  </div>
                </div>
                {latestSnap ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                    {/* Scanline overlay */}
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                      background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
                      borderRadius: 10,
                    }} />
                    {/* Corner brackets on image */}
                    <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 3, width: 16, height: 16, borderTop: '2px solid #2196a8', borderLeft: '2px solid #2196a8', borderRadius: '2px 0 0 0', opacity: 0.8 }} />
                    <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 3, width: 16, height: 16, borderTop: '2px solid #2196a8', borderRight: '2px solid #2196a8', borderRadius: '0 2px 0 0', opacity: 0.8 }} />
                    <div style={{ position: 'absolute', bottom: 6, left: 6, zIndex: 3, width: 16, height: 16, borderBottom: '2px solid #2196a8', borderLeft: '2px solid #2196a8', borderRadius: '0 0 0 2px', opacity: 0.8 }} />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, zIndex: 3, width: 16, height: 16, borderBottom: '2px solid #2196a8', borderRight: '2px solid #2196a8', borderRadius: '0 0 2px 0', opacity: 0.8 }} />
                    <img
                      src={`${API_BASE}${latestSnap.image_url}`}
                      alt="Latest snapshot"
                      style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 180, display: 'block' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    {(latestSnap.mold_detected || latestSnap.sprout_detected) && (
                      <div style={{
                        position: 'absolute', inset: 0, zIndex: 4,
                        background: 'rgba(217, 48, 37,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: '0.95rem', borderRadius: 10,
                        letterSpacing: '0.08em', fontFamily: 'Space Grotesk',
                        animation: 'pulseCrit 1.8s ease-in-out infinite',
                      }}>
                        🚨 {latestSnap.mold_detected ? 'MOLD DETECTED' : 'SPROUTING DETECTED'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#7a9e8a', fontSize: '0.875rem', borderRadius: 10, border: '1px dashed rgba(33, 150, 168,0.15)' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: 10, opacity: 0.5 }}>📷</div>
                    No camera snapshots yet
                  </div>
                )}
                {latestSnap && (
                  <div style={{ fontSize: '0.7rem', color: '#7a9e8a', marginTop: 10 }}>
                    📅 {new Date(latestSnap.captured_at).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Alerts */}
              <div className="glass-card" style={{ padding: 22, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#1a2e22' }}>Alerts</h3>
                  <span className={`badge badge-${alerts.filter(a => !a.is_read).length > 0 ? 'red' : 'muted'}`}>
                    {alerts.filter(a => !a.is_read).length} unread
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
                  {alerts.length === 0 ? (
                    <p style={{ color: '#7a9e8a', fontSize: '0.85rem' }}>✅ All systems normal.</p>
                  ) : alerts.map((a) => <AlertItem key={a.id} alert={a} onRead={markRead} />)}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ── LISTINGS TABLE ────────────────────────── */}
        <motion.div {...cardAnim(0.32)} className="glass-card" style={{ padding: '22px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontSize: '0.95rem', color: '#1a2e22' }}>My Listings</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowListing(true)}>
              <Plus size={14} /> New Listing
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produce</th>
                  <th>Qty (kg)</th>
                  <th>Price/kg (₹)</th>
                  <th>Health Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#7a9e8a', padding: 28 }}>
                      No listings yet. Create your first one!
                    </td>
                  </tr>
                ) : listings.map((l) => (
                  <tr key={l.id} style={{ transition: 'background 0.15s' }}>
                    <td style={{ fontWeight: 600, color: '#1a2e22' }}>{l.produce_name}</td>
                    <td style={{ color: '#3d6b50' }}>{l.quantity_kg}</td>
                    <td style={{ color: '#22a855', fontWeight: 600 }}>₹{l.asking_price_per_kg}</td>
                    <td>
                      {l.health_score != null
                        ? <span style={{ color: scoreColor(l.health_score), fontWeight: 700, fontFamily: 'Space Grotesk' }}>
                          {l.health_score.toFixed(0)}
                        </span>
                        : <span style={{ color: '#7a9e8a' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${l.status === 'active' ? 'green' : l.status === 'sold' ? 'blue' : l.status === 'negotiating' ? 'amber' : 'muted'}`}>
                        {l.status}
                      </span>
                      {l.is_verified && (
                        <span className="badge badge-green" style={{ marginLeft: 6 }}>✓ Verified</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => loadBids(l.id)}>
                        View Bids
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── BIDS MODAL ────────────────────────────── */}
        {showBidsFor && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowBidsFor(null)}>
            <motion.div className="modal"
              initial={{ y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <div className="modal-header">
                <h2>💬 Bids on Listing</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowBidsFor(null)}><X size={16} /></button>
              </div>
              {(bids[showBidsFor] || []).length === 0 ? (
                <p style={{ color: '#3d6b50', textAlign: 'center', padding: '24px 0' }}>No bids yet on this listing.</p>
              ) : (bids[showBidsFor] || []).map((b) => (
                <div key={b.id} className="card mb-2" style={{ padding: 16 }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 700, color: '#22a855', fontSize: '1.1rem', fontFamily: 'Space Grotesk' }}>
                        ₹{b.offered_price_per_kg}/kg
                      </div>
                      {b.message && (
                        <div style={{ fontSize: '0.85rem', color: '#3d6b50', marginTop: 4 }}>"{b.message}"</div>
                      )}
                      {b.counter_price && (
                        <div style={{ fontSize: '0.85rem', color: '#e07c00', marginTop: 4 }}>
                          Counter: ₹{b.counter_price}/kg
                        </div>
                      )}
                    </div>
                    <span className={`badge badge-${b.status === 'pending' ? 'amber' : b.status === 'accepted' ? 'green' : b.status === 'rejected' ? 'red' : 'blue'}`}>
                      {b.status}
                    </span>
                  </div>
                  {b.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-primary btn-sm" onClick={() => respondBid(b.id, 'accept')}>Accept</button>
                      <button className="btn btn-danger btn-sm" onClick={() => respondBid(b.id, 'reject')}>Reject</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const price = prompt('Enter counter price (₹/kg):')
                        if (price) respondBid(b.id, 'counter', parseFloat(price))
                      }}>Counter</button>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        )}

        {/* ── LISTING MODAL ─────────────────────────── */}
        {showListing && (
          <ListingModal
            devices={devices}
            onClose={() => setShowListing(false)}
            onCreated={(l) => setListings((prev) => [l, ...prev])}
          />
        )}
      </main>
    </div>
  )
}
