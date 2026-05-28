import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import PageTransition from '../components/PageTransition'

function useCountUp(end, duration = 1800, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let frame = 0
    const totalFrames = Math.round(duration / 16)
    const timer = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (frame >= totalFrames) { setCount(end); clearInterval(timer) }
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration, active])
  return count
}

function useTypewriter(text, speed = 40) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, ++i)) }
      else clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])
  return displayed
}

function StatBadge({ value, suffix, label }) {
  const [ref, inView] = useInView({ triggerOnce: true })
  const count = useCountUp(value, 1800, inView)
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 700, color: '#22a855', textShadow: 'none' }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#3d6b50', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function StepCard({ icon, num, title, desc, delay }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(34, 139, 87,0.12)', borderRadius: 16, padding: 28,
        textAlign: 'center', position: 'relative', flex: 1,
      }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34, 139, 87,0.1)', border: '2px solid rgba(34, 139, 87,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 16px' }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', color: '#22a855', letterSpacing: '0.15em', marginBottom: 8 }}>STEP {num}</div>
      <h3 style={{ fontSize: '1rem', marginBottom: 10, color: '#1a2e22' }}>{title}</h3>
      <p style={{ fontSize: '0.85rem', color: '#3d6b50', lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
  )
}

function PortalHalf({ side, icon, label, title, points, linkTo, btnText, accent }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: side === 'left' ? -60 : 60 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: 1, padding: '60px 48px',
        background: side === 'left' ? 'rgba(34, 139, 87,0.03)' : 'rgba(33, 150, 168,0.03)',
        borderRight: side === 'left' ? `1px solid rgba(34, 139, 87,0.1)` : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20,
      }}>
      <div style={{ fontSize: '3.5rem' }}>{icon}</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.2em', color: accent }}>{label}</div>
      <h2 style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', color: '#1a2e22', lineHeight: 1.2 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {points.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: '#3d6b50' }}>
            <span style={{ color: accent, fontSize: '0.7rem' }}>✦</span> {p}
          </div>
        ))}
      </div>
      <Link to={linkTo}>
        <button className="btn-neon" style={{ borderColor: accent, color: accent, marginTop: 8 }}>
          <span>{btnText}</span>
        </button>
      </Link>
    </motion.div>
  )
}

const TECH = ['ESP32-CAM', 'BME280', 'MQTT', 'FastAPI', 'PostgreSQL', 'React', 'YOLOv8']

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef(null)
  const subtitle = useTypewriter('Real-time IoT monitoring · AI spoilage prediction · Direct farm-to-buyer marketplace', 35)
  const { scrollYProgress } = useScroll()
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const titleWords = [{ text: 'PROTECT', color: '#1a2e22' }, { text: 'YOUR', color: '#1a2e22' }, { text: 'HARVEST.', color: '#22a855', glow: true }]

  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.3 })

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>

        {/* ── NAVBAR ── */}
        <motion.nav
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
            padding: '16px 40px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(34, 139, 87,0.1)' : 'none',
            transition: 'all 0.4s ease',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: '1.4rem' }}>🌿</div>
            <span className="glitch" style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 700, color: '#22a855', textShadow: 'none', letterSpacing: '0.1em' }}>ECO-ASSIST</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/farmer/login">
              <button className="btn-neon btn-sm" style={{ padding: '8px 20px', fontSize: '0.8rem' }}><span>Farmer Portal</span></button>
            </Link>
            <Link to="/buyer/login">
              <button className="btn-neon-solid" style={{ padding: '9px 20px', fontSize: '0.8rem' }}>Buyer Marketplace</button>
            </Link>
          </div>
        </motion.nav>

        {/* ── HERO ── */}
        <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', flexDirection: 'column', textAlign: 'center', position: 'relative' }}>

          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34, 139, 87,0.05)', border: '1px solid rgba(34, 139, 87,0.2)', borderRadius: 100, padding: '7px 18px', marginBottom: 32 }}>
              <span className="live-dot" />
              <span style={{ fontSize: '0.78rem', color: '#3d6b50', letterSpacing: '0.05em', fontWeight: 500 }}>⚡ AI-Powered Agricultural Intelligence</span>
            </div>
          </motion.div>

          {/* Title */}
          <h1 style={{ fontFamily: 'Orbitron', fontSize: 'clamp(2.8rem,7vw,5.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 28, letterSpacing: '-0.02em' }}>
            {titleWords.map((w, i) => (
              <motion.span key={i}
                initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'inline-block', marginRight: '0.3em', color: w.color, textShadow: w.glow ? 'none' : 'none' }}>
                {w.text}
              </motion.span>
            ))}
          </h1>

          {/* Typewriter subtitle */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
            style={{ fontSize: 'clamp(0.9rem,2vw,1.1rem)', color: '#3d6b50', maxWidth: 600, marginBottom: 40, minHeight: '1.6em', lineHeight: 1.7 }}>
            {subtitle}<span style={{ animation: 'blink 1s infinite', color: '#22a855' }}>|</span>
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.6 }}
            style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
            <Link to="/farmer/login">
              <button className="btn-neon" style={{ fontSize: '1rem', padding: '14px 32px' }}><span>Enter Farmer Portal →</span></button>
            </Link>
            <Link to="/buyer/login">
              <button className="btn-neon-solid" style={{ fontSize: '1rem', padding: '15px 32px' }}>Browse Marketplace →</button>
            </Link>
          </motion.div>

          {/* Mini stats */}
          <motion.div ref={statsRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.6 }}
            style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center', padding: '24px 40px', background: 'rgba(34, 139, 87,0.03)', border: '1px solid rgba(34, 139, 87,0.1)', borderRadius: 16, backdropFilter: 'blur(10px)' }}>
            {statsInView && <>
              <StatBadge value={1240} suffix="+" label="Farmers Protected" />
              <div style={{ width: 1, background: 'rgba(34, 139, 87,0.1)' }} />
              <StatBadge value={98} suffix="%" label="Detection Accuracy" />
              <div style={{ width: 1, background: 'rgba(34, 139, 87,0.1)' }} />
              <StatBadge value={0} suffix="" label="Middlemen" />
            </>}
          </motion.div>

          {/* Floating mockup card */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
            className="float"
            style={{ position: 'absolute', right: 'max(40px, 5vw)', top: '50%', transform: 'translateY(-50%)', display: 'none', }}>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}
            style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#7a9e8a', fontSize: '0.72rem', letterSpacing: '0.1em' }}>
            <div style={{ width: 24, height: 38, border: '1.5px solid rgba(34, 139, 87,0.3)', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: 3, height: 8, background: '#22a855', borderRadius: 2 }} />
            </div>
            SCROLL TO EXPLORE
          </motion.div>
        </section>

        {/* ── PROBLEM STATS ── */}
        <section style={{ padding: '80px 40px', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              { value: '₹92,651 Cr', sub: 'Lost annually to post-harvest crop damage in India' },
              { value: '40%', sub: 'Of all produce never reaches consumers — lost in transit' },
            ].map((s, i) => {
              const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 })
              return (
                <motion.div key={i} ref={ref}
                  initial={{ opacity: 0, x: i === 0 ? -50 : 50 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(34, 139, 87,0.12)', borderRadius: 16, padding: '36px 32px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900, color: '#22a855', textShadow: 'none', marginBottom: 12 }}>{s.value}</div>
                  <div style={{ color: '#3d6b50', fontSize: '0.9rem', lineHeight: 1.5 }}>{s.sub}</div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '0.65rem', letterSpacing: '0.3em', color: '#22a855', marginBottom: 12 }}>TECHNOLOGY</div>
            <h2 style={{ fontFamily: 'Orbitron', fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#1a2e22' }}>HOW ECO-ASSIST WORKS</h2>
          </motion.div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <StepCard num="01" icon="🔬" title="ESP32 Sensors Monitor" desc="BME280 + gas sensors track temperature, humidity, VOC, and ammonia levels 24/7 inside your cold storage" delay={0.1} />
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(34, 139, 87,0.3)', fontSize: '1.5rem' }}>→</div>
            <StepCard num="02" icon="🤖" title="AI Calculates Health Score" desc="Our algorithm processes sensor data in real-time, assigns a 0-100 health score, and fires instant alerts on risk" delay={0.3} />
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(34, 139, 87,0.3)', fontSize: '1.5rem' }}>→</div>
            <StepCard num="03" icon="🤝" title="Direct Farmer-Buyer Deal" desc="Farmers list produce with verified health data. Buyers bid directly — no commission, no middlemen, full transparency" delay={0.5} />
          </div>
        </section>

        {/* ── TECH STACK ── */}
        <section style={{ padding: '60px 40px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            style={{ fontFamily: 'Orbitron', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#7a9e8a', marginBottom: 24 }}>
            POWERED BY
          </motion.div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {TECH.map((t, i) => (
              <motion.div key={t}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.4 }}
                whileHover={{ y: -4, borderColor: 'rgba(34, 139, 87,0.4)' }}
                style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(34, 139, 87,0.1)', borderRadius: 100, padding: '8px 20px', fontSize: '0.82rem', color: '#3d6b50', fontWeight: 500, letterSpacing: '0.03em' }}>
                {t}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── DUAL PORTAL CTA ── */}
        <section style={{ margin: '40px 24px 0', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(34, 139, 87,0.1)', display: 'flex', flexWrap: 'wrap' }}>
          <PortalHalf side="left" icon="🌾" label="FOR FARMERS" title={"Monitor.\nProtect. Sell."} accent="#22a855"
            points={['Real-time IoT sensor dashboard', 'AI spoilage alerts before it\'s too late', 'Direct marketplace — keep 100% margin']}
            linkTo="/farmer/login" btnText="Enter Farmer Portal →" />
          <PortalHalf side="right" icon="🛒" label="FOR BUYERS" title={"Verify.\nNegotiate. Buy."} accent="#2196a8"
            points={['AI-verified produce quality scores', 'Full sensor transparency on every listing', 'No middlemen — direct farmer deals']}
            linkTo="/buyer/login" btnText="Browse Marketplace →" />
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ padding: '48px 40px', textAlign: 'center', borderTop: '1px solid rgba(34, 139, 87,0.08)', marginTop: 80 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: '1rem', color: '#22a855', marginBottom: 8 }}>🌿 ECO-ASSIST</div>
          <div style={{ color: '#7a9e8a', fontSize: '0.82rem', marginBottom: 12 }}>From Farm to Buyer — AI-Verified, Zero Middlemen</div>
          <div style={{ color: '#9db8a8', fontSize: '0.75rem' }}>Built with ❤️ for Indian Farmers · © 2026</div>
          <div style={{ marginTop: 20 }}>
            <Link to="/register" style={{ color: '#22a855', fontSize: '0.85rem' }}>Create Account →</Link>
          </div>
        </footer>
      </div>
    </PageTransition>
  )
}
