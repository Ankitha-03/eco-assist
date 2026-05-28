import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api'
import PageTransition from '../components/PageTransition'
import LoadingSpinner from '../components/LoadingSpinner'

export default function FarmerLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      if (data.user.role !== 'farmer') {
        toast.error('This account is registered as a buyer. Use Buyer Login.')
        setLoading(false)
        return
      }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      toast.success(`Welcome back, ${data.user.full_name}!`)
      navigate('/farmer/dashboard')
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
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(34, 139, 87,0.2) 0%, transparent 70%)' }} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
            <div className="float" style={{ fontSize: '4rem', marginBottom: 24 }}>🌾</div>
            <h1 style={{ fontFamily: 'Orbitron', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: '#1a2e22', lineHeight: 1.2, marginBottom: 16 }}>
              PROTECT YOUR<br /><span style={{ color: '#22a855', textShadow: 'none' }}>HARVEST.</span>
            </h1>
            <p style={{ color: '#3d6b50', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Monitor your crops with real-time IoT sensors, get AI-powered spoilage alerts, and sell directly to buyers.
            </p>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              {['24/7 sensor monitoring', 'Instant spoilage alerts', 'Zero-commission sales'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3d6b50', fontSize: '0.88rem' }}>
                  <span style={{ color: '#22a855', fontSize: '0.6rem' }}>✦</span> {f}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right panel */}
        <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '42%', minWidth: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(34, 139, 87,0.1)' }}>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'Orbitron', color: '#22a855', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: 8 }}>FARMER LOGIN</div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 4, color: '#1a2e22' }}>Welcome Back</h2>
            <p style={{ color: '#7a9e8a', fontSize: '0.85rem', marginBottom: 32 }}>Sign in to your farmer account</p>

            <form onSubmit={submit}>
              <div className="form-group">
                <label>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handle} placeholder="farmer@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn-neon-solid w-full" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '14px', fontSize: '0.95rem' }}>
                {loading ? <LoadingSpinner size={20} /> : 'Sign In →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className="btn-ghost btn-sm" onClick={() => setForm({ email: 'farmer1@demo.com', password: 'demo123' })}
                style={{ fontSize: '0.78rem', borderRadius: 6 }}>
                Fill Demo Credentials
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.82rem', color: '#7a9e8a' }}>
              No account? <Link to="/register" style={{ color: '#22a855' }}>Register free</Link>
              <span style={{ margin: '0 8px' }}>·</span>
              <Link to="/" style={{ color: '#3d6b50' }}>← Home</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
