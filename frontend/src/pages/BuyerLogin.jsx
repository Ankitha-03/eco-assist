import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api'
import PageTransition from '../components/PageTransition'
import LoadingSpinner from '../components/LoadingSpinner'

export default function BuyerLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      if (data.user.role !== 'buyer') {
        toast.error('This account is registered as a farmer. Use Farmer Login.')
        setLoading(false)
        return
      }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success(`Welcome, ${data.user.full_name}!`)
      navigate('/buyer/marketplace')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', zIndex: 1 }}>

        {/* Left panel */}
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(33, 150, 168,0.2) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
            <div className="float" style={{ fontSize: '4rem', marginBottom: 24 }}>🛒</div>
            <h1 style={{ fontFamily: 'Orbitron', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: '#1a2e22', lineHeight: 1.2, marginBottom: 16 }}>
              BUY DIRECT.<br /><span style={{ color: '#2196a8', textShadow: 'none' }}>SAVE MORE.</span>
            </h1>
            <p style={{ color: '#3d6b50', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Access AI-verified produce quality scores, sensor data transparency, and bid directly with farmers — no commissions.
            </p>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              {['AI-verified quality scores', 'Full sensor transparency', 'Zero middlemen, zero commission'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3d6b50', fontSize: '0.88rem' }}>
                  <span style={{ color: '#2196a8', fontSize: '0.6rem' }}>✦</span> {f}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right panel */}
        <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '42%', minWidth: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(33, 150, 168,0.1)' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'Orbitron', color: '#2196a8', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: 8 }}>BUYER LOGIN</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 4, color: '#1a2e22' }}>Welcome Back</h2>
            <p style={{ color: '#7a9e8a', fontSize: '0.85rem', marginBottom: 32 }}>Sign in to browse verified produce</p>

            <form onSubmit={submit}>
              <div className="form-group">
                <label>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handle} placeholder="buyer@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #2196a8, #1a7a8c)', border: 'none', color: '#f0f7f4', fontFamily: 'Space Grotesk', fontWeight: 700, padding: 14, borderRadius: 8, cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 20px rgba(33, 150, 168,0.3)', transition: 'all 0.3s', marginTop: 8 }}>
                {loading ? <LoadingSpinner size={20} /> : 'Browse Marketplace →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className="btn-ghost btn-sm" onClick={() => setForm({ email: 'buyer1@demo.com', password: 'demo123' })}
                style={{ fontSize: '0.78rem', borderRadius: 6 }}>
                Fill Demo Credentials
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.82rem', color: '#7a9e8a' }}>
              No account? <Link to="/register" style={{ color: '#2196a8' }}>Register free</Link>
              <span style={{ margin: '0 8px' }}>·</span>
              <Link to="/" style={{ color: '#3d6b50' }}>← Home</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
