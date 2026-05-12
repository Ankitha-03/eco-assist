import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Search, X, LogOut, ShoppingCart, CheckCircle } from 'lucide-react'
import api from '../api'

const scoreColor = (s) => (s >= 75 ? '#00ff9d' : s >= 40 ? '#ffb800' : '#ff2d55')
const scoreBadgeClass = (s) => (s >= 75 ? 'badge-green' : s >= 40 ? 'badge-amber' : 'badge-red')
const riskLabel = (s) => (s >= 75 ? 'Healthy' : s >= 50 ? 'Good' : s >= 25 ? 'At Risk' : 'Critical')

/* ── Mini circular health gauge ───────────────────────────── */
function MiniHealthGauge({ score }) {
  const r = 15, cx = 20, cy = 20
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = scoreColor(score)
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.07)" strokeWidth={3.5} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={3.5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        style={{ transition: 'stroke-dashoffset 0.9s ease', filter: `drop-shadow(0 0 4px ${color}80)` }} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fill={color}
        fontSize="8.5" fontWeight="800" fontFamily="Space Grotesk">
        {score.toFixed(0)}
      </text>
    </svg>
  )
}

/* ── Sensor chip ──────────────────────────────────────────── */
function SensorChip({ icon, value, unit, warn }) {
  if (value == null) return null
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: warn ? 'rgba(255,45,85,0.06)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${warn ? 'rgba(255,45,85,0.2)' : 'rgba(0,255,157,0.08)'}`,
      borderRadius: 8, padding: '6px 10px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: warn ? '#ff2d55' : '#e8f4f0' }}>
        {value.toFixed(1)}<span style={{ fontSize: '0.62rem', color: '#5a8a7a', marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{ fontSize: '0.62rem', color: '#5a8a7a', marginTop: 1 }}>{icon}</div>
    </div>
  )
}

/* ── Produce Card ─────────────────────────────────────────── */
function ProduceCard({ listing, onBid, index }) {
  const score = listing.health_score ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.28 } }}
      className="glass-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 20px 18px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Top glow line based on health */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${scoreColor(score)}, transparent)`,
        opacity: 0.6,
      }} />

      {/* Header: name + mini gauge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e8f4f0', marginBottom: 4, lineHeight: 1.3 }}>
            {listing.produce_name}
          </h3>
          <div style={{ fontSize: '0.75rem', color: '#5a8a7a' }}>
            📍 {listing.farmer_location || 'India'} · {listing.farmer_name || 'Farmer'}
          </div>
        </div>
        <MiniHealthGauge score={score} />
      </div>

      {/* Verified badge */}
      {listing.is_verified && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
          padding: '4px 12px', borderRadius: 100,
          background: 'linear-gradient(90deg, rgba(0,255,157,0.08), rgba(0,212,255,0.08))',
          border: '1px solid rgba(0,255,157,0.25)',
          fontSize: '0.68rem', fontWeight: 700, color: '#00ff9d', letterSpacing: '0.05em',
          backgroundSize: '200% 200%', animation: 'holographic 4s ease infinite',
        }}>
          <CheckCircle size={10} /> ✓ VERIFIED
        </div>
      )}

      {/* Risk badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`badge ${scoreBadgeClass(score)}`} style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
          ● {score.toFixed(0)} {riskLabel(score)}
        </span>
      </div>

      {/* Sensor chips */}
      {(listing.latest_temp != null || listing.latest_humidity != null || listing.latest_ammonia != null) && (
        <div style={{ display: 'flex', gap: 6 }}>
          <SensorChip icon="🌡️ Temp" value={listing.latest_temp} unit="°C" warn={listing.latest_temp > 20} />
          <SensorChip icon="💧 Humid" value={listing.latest_humidity} unit="%" />
          <SensorChip icon="⚗️ NH₃" value={listing.latest_ammonia} unit="ppm" warn={listing.latest_ammonia > 25} />
        </div>
      )}

      {/* Price + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
        <div>
          <div style={{
            fontFamily: 'Space Grotesk', fontSize: '1.4rem', fontWeight: 800,
            color: '#00ff9d', textShadow: '0 0 8px rgba(0,255,157,0.35)',
          }}>
            ₹{listing.asking_price_per_kg}/kg
          </div>
          <div style={{ fontSize: '0.7rem', color: '#5a8a7a', marginTop: 2 }}>
            {listing.quantity_kg} kg available
          </div>
        </div>
        <button className="btn-neon" style={{ padding: '9px 18px', fontSize: '0.8rem', letterSpacing: '0.05em' }}
          onClick={() => onBid(listing)}>
          <span>MAKE OFFER</span>
        </button>
      </div>
    </motion.div>
  )
}

/* ── Bid Modal ────────────────────────────────────────────── */
function BidModal({ listing, onClose, onBidPlaced }) {
  const [price, setPrice] = useState(listing.asking_price_per_kg)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState('')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    api.get(`/market/listings/${listing.id}`).then(({ data }) => setDetail(data)).catch(() => {})
  }, [listing.id])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    try {
      await api.post('/market/bid', { listing_id: listing.id, offered_price_per_kg: parseFloat(price), message })
      setSuccess(true)
      onBidPlaced?.()
    } catch (err) {
      setErr(err.response?.data?.detail || 'Failed to place bid')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal"
        initial={{ y: 48, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="modal-header">
          <h2>💰 Make an Offer</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Listing summary */}
        <div className="card mb-4" style={{ padding: '14px 16px', border: '1px solid rgba(0,255,157,0.15)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight: 700, color: '#e8f4f0' }}>{listing.produce_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#5a8a7a', marginTop: 3 }}>
                {listing.quantity_kg} kg · by {listing.farmer_name}
              </div>
            </div>
            {listing.health_score != null && <MiniHealthGauge score={listing.health_score} />}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#5a8a7a', marginTop: 10 }}>
            Asking: <span style={{ color: '#ffb800', fontWeight: 600 }}>₹{listing.asking_price_per_kg}/kg</span>
          </div>
        </div>

        {/* 24h health chart */}
        {detail?.sensor_history?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '0.72rem', color: '#5a8a7a', marginBottom: 8, letterSpacing: '0.05em' }}>
              24h HEALTH HISTORY
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={detail.sensor_history.slice().reverse()}>
                <XAxis hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{ background: 'rgba(4,12,22,0.95)', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'Space Grotesk' }}
                  formatter={(v) => [v?.toFixed(1), 'Health']}
                />
                <Line type="monotone" dataKey="health_score" stroke="#00ff9d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,157,0.1)', border: '2px solid rgba(0,255,157,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>
              ✓
            </div>
            <h3 style={{ color: '#00ff9d', marginBottom: 8, fontFamily: 'Space Grotesk' }}>Offer Sent!</h3>
            <p style={{ color: '#5a8a7a', fontSize: '0.88rem' }}>
              Sent directly to farmer — zero middlemen!
            </p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
          </motion.div>
        ) : (
          <form onSubmit={submit}>
            {err && (
              <div className="alert-banner alert-banner-critical mb-4"><span>⚠️</span> {err}</div>
            )}
            <div className="form-group">
              <label>Your Offer (₹/kg)</label>
              <input type="number" min="0.01" step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)} required
                style={{ fontSize: '1.2rem', fontFamily: 'Space Grotesk', fontWeight: 700, color: '#00ff9d' }} />
            </div>
            <div className="form-group">
              <label>Message to Farmer (optional)</label>
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="I need 200kg. Can pick up within 3 days…" />
            </div>
            <button type="submit" className="btn-neon-solid w-full" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: '0.95rem' }}>
              {loading ? 'Submitting…' : 'Submit Offer →'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function BuyerMarketplace() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [listings, setListings] = useState([])
  const [myBids, setMyBids] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [activeTab, setTab] = useState('market')
  const [bidTarget, setBidTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter === 'verified') params.set('verified_only', 'true')
      if (filter === 'healthy') params.set('healthy_only', 'true')
      const { data } = await api.get(`/market/listings?${params}`)
      setListings(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filter])

  const loadMyBids = useCallback(async () => {
    try {
      const { data } = await api.get('/market/my-bids')
      setMyBids(data)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadListings() }, [loadListings])
  useEffect(() => { if (activeTab === 'bids') loadMyBids() }, [activeTab, loadMyBids])

  const logout = () => { localStorage.clear(); navigate('/') }

  const filterChips = [
    { key: 'all', label: 'All Listings' },
    { key: 'verified', label: '✓ Verified' },
    { key: 'healthy', label: '🟢 Healthy' },
  ]

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>

      {/* ── HEADER ──────────────────────────────────── */}
      <header style={{
        background: 'rgba(2,4,8,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,255,157,0.1)',
        padding: '14px 28px', position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo */}
          <div style={{ fontFamily: 'Orbitron', fontSize: '1rem', fontWeight: 700, color: '#00ff9d', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
            🌿 ECO-ASSIST
          </div>

          {/* Tabs */}
          <nav style={{ display: 'flex', gap: 4 }}>
            {['market', 'bids'].map((tab) => (
              <button key={tab} onClick={() => setTab(tab)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: activeTab === tab ? 'rgba(0,255,157,0.1)' : 'transparent',
                  color: activeTab === tab ? '#00ff9d' : '#5a8a7a',
                  fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'none', transition: 'all 0.2s',
                  borderBottom: activeTab === tab ? '2px solid #00ff9d' : '2px solid transparent',
                }}>
                {tab === 'market' ? '🏪 Marketplace' : `💬 My Bids${myBids.length ? ` (${myBids.length})` : ''}`}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.82rem', color: '#5a8a7a', fontFamily: 'Space Grotesk' }}>{user.full_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}><LogOut size={14} /></button>
        </div>
      </header>

      {/* ── CONTENT ─────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}>
        {activeTab === 'market' ? (
          <>
            {/* Search + filters */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#5a8a7a' }} />
                <input
                  style={{
                    width: '100%',
                    background: 'rgba(6,20,35,0.7)',
                    border: '1px solid rgba(0,255,157,0.12)',
                    borderRadius: 10, color: '#e8f4f0',
                    padding: '11px 14px 11px 38px',
                    outline: 'none', fontFamily: 'Inter', fontSize: '0.9rem',
                    backdropFilter: 'blur(12px)',
                    transition: 'border-color 0.25s, box-shadow 0.25s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(0,255,157,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,157,0.08)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(0,255,157,0.12)'; e.target.style.boxShadow = 'none' }}
                  placeholder="Search tomatoes, onions, wheat…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {filterChips.map((c) => (
                  <button key={c.key}
                    onClick={() => setFilter(c.key)}
                    style={{
                      padding: '9px 16px', borderRadius: 8, border: `1px solid ${filter === c.key ? 'rgba(0,255,157,0.4)' : 'rgba(0,255,157,0.1)'}`,
                      background: filter === c.key ? 'rgba(0,255,157,0.1)' : 'transparent',
                      color: filter === c.key ? '#00ff9d' : '#5a8a7a',
                      fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 80, color: '#5a8a7a' }}>
                <div style={{ width: 40, height: 40, border: '2px solid rgba(0,255,157,0.2)', borderTopColor: '#00ff9d', borderRadius: '50%', animation: 'spinO 1s linear infinite', margin: '0 auto 16px' }} />
                Loading listings…
              </div>
            ) : listings.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: 80, color: '#5a8a7a' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: 0.4 }}>🌾</div>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600 }}>No listings found</div>
                <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Try adjusting your search or filters</div>
              </motion.div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {listings.map((l, i) => (
                  <ProduceCard key={l.id} listing={l} onBid={(l) => setBidTarget(l)} index={i} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── MY BIDS TAB ────────────────────────── */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', color: '#e8f4f0', marginBottom: 24, letterSpacing: '0.05em' }}>
              MY OFFERS
            </h2>
            {myBids.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: '#5a8a7a' }}>
                <ShoppingCart size={44} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600 }}>No offers placed yet</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setTab('market')}>
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myBids.map((b, i) => (
                  <motion.div key={b.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.45 }}
                    className="glass-card" style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#e8f4f0' }}>
                          {b.produce_name || 'Produce'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#5a8a7a', marginTop: 5 }}>
                          Your offer:{' '}
                          <span style={{ color: '#00ff9d', fontWeight: 700, fontFamily: 'Space Grotesk' }}>
                            ₹{b.offered_price_per_kg}/kg
                          </span>
                          {b.message && (
                            <span style={{ color: '#3a5a4a' }}> · "{b.message}"</span>
                          )}
                        </div>
                        {b.counter_price && (
                          <div style={{ fontSize: '0.85rem', color: '#ffb800', marginTop: 5 }}>
                            🔄 Counter offer: ₹{b.counter_price}/kg
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#3a5a4a', marginTop: 6 }}>
                          {new Date(b.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                        <span className={`badge badge-${b.status === 'pending' ? 'amber' : b.status === 'accepted' ? 'green' : b.status === 'rejected' ? 'red' : 'blue'}`}
                          style={{ animation: b.status === 'pending' ? 'pulseBadge 2s ease infinite' : 'none' }}>
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                        {b.status === 'countered' && b.counter_price && (
                          <button className="btn btn-primary btn-sm" onClick={async () => {
                            try {
                              await api.post(`/farmer/bids/${b.id}/respond`, { action: 'accept' })
                              loadMyBids()
                            } catch (e) { console.error(e) }
                          }}>
                            Accept ₹{b.counter_price}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── BID MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {bidTarget && (
          <BidModal
            listing={bidTarget}
            onClose={() => setBidTarget(null)}
            onBidPlaced={() => { loadListings(); loadMyBids() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
