import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api'
import PageTransition from '../components/PageTransition'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Register() {
  const navigate = useNavigate()
  const [role, setRole] = useState('farmer')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', location: '' })
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { ...form, role })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success(`Account created! Welcome, ${data.user.full_name}!`)
      navigate(role === 'farmer' ? '/farmer/dashboard' : '/buyer/marketplace')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const accent = role === 'farmer' ? '#00ff9d' : '#00d4ff'

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', zIndex: 1 }}>

        {/* Left visual panel */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${role === 'farmer' ? 'rgba(0,80,40,0.2)' : 'rgba(0,60,80,0.2)'} 0%, transparent 70%)`, transition: 'all 0.5s' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
            <div className="float" style={{ fontSize: '3.5rem', marginBottom: 20 }}>{role === 'farmer' ? '🌿' : '🛒'}</div>
            <h2 style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, color: '#e8f4f0', lineHeight: 1.2, marginBottom: 12 }}>
              JOIN<br /><span style={{ color: accent, textShadow: `0 0 20px ${accent}60` }}>ECO-ASSIST</span>
            </h2>
            <p style={{ color: '#5a8a7a', fontSize: '0.9rem', lineHeight: 1.7 }}>
              {role === 'farmer' ? 'Start monitoring your crops today. Free forever for farmers.' : 'Access hundreds of verified produce listings directly from farmers.'}
            </p>
          </div>
        </motion.div>

        {/* Right form panel */}
        <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{ width: '48%', minWidth: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'rgba(2,6,12,0.6)', backdropFilter: 'blur(20px)', borderLeft: `1px solid ${accent}18`, overflow: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ fontFamily: 'Orbitron', color: accent, fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: 8 }}>CREATE ACCOUNT</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 24, color: '#e8f4f0' }}>Get Started Free</h2>

            {/* Role toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {[['farmer', '🌾', 'I am a Farmer'], ['buyer', '🛒', 'I am a Buyer']].map(([r, icon, label]) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  style={{ padding: '13px', border: `2px solid ${role === r ? (r === 'farmer' ? '#00ff9d' : '#00d4ff') : 'rgba(0,255,157,0.1)'}`, borderRadius: 10, background: role === r ? `${r === 'farmer' ? 'rgba(0,255,157,0.08)' : 'rgba(0,212,255,0.08)'}` : 'transparent', color: role === r ? (r === 'farmer' ? '#00ff9d' : '#00d4ff') : '#3a5a4a', cursor: 'none', fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {icon} {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit}>
              <div className="form-group">
                <label>Full Name</label>
                <input name="full_name" value={form.full_name} onChange={handle} placeholder="Ravi Kumar" required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input name="password" type="password" value={form.password} onChange={handle} placeholder="Min 6 characters" required minLength={6} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Phone (optional)</label>
                  <input name="phone" value={form.phone} onChange={handle} placeholder="+91-XXXXXXXXXX" />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input name="location" value={form.location} onChange={handle} placeholder="Punjab, India" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: `linear-gradient(135deg, ${accent}, ${role === 'farmer' ? '#00c87a' : '#0099cc'})`, border: 'none', color: '#020408', fontFamily: 'Space Grotesk', fontWeight: 700, padding: 14, borderRadius: 8, cursor: 'none', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 20px ${accent}40`, transition: 'all 0.3s', marginTop: 4 }}>
                {loading ? <LoadingSpinner size={20} /> : `Register as ${role === 'farmer' ? 'Farmer' : 'Buyer'} →`}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.82rem', color: '#3a5a4a' }}>
              Already registered? <Link to={role === 'farmer' ? '/farmer/login' : '/buyer/login'} style={{ color: accent }}>Sign In</Link>
              <span style={{ margin: '0 8px' }}>·</span>
              <Link to="/" style={{ color: '#5a8a7a' }}>← Home</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
