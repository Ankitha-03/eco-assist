import { useCallback, useEffect, useRef } from 'react'

function FloatingOrb({ size, top, left, color, duration }) {
  return (
    <div style={{
      position: 'absolute', borderRadius: '50%',
      width: size, height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      top, left,
      filter: 'blur(80px)',
      opacity: 0.12,
      animation: `orbFloat ${duration}s ease-in-out infinite`,
      pointerEvents: 'none',
    }} />
  )
}

export default function AnimatedBackground({ withParticles = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const N = window.innerWidth > 768 ? 70 : 0
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        color: Math.random() > 0.5 ? '#00ff9d' : '#00d4ff',
        opacity: Math.random() * 0.3 + 0.2,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0,255,157,${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }

    if (withParticles) draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [withParticles])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,80,40,0.25) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,157,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,157,0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: 0.7 }} />
      <FloatingOrb size={400} top="-10%" left="-10%" color="rgba(0,255,157,1)" duration={18} />
      <FloatingOrb size={350} top="30%" left="70%" color="rgba(0,212,255,1)" duration={22} />
      <FloatingOrb size={300} top="70%" left="20%" color="rgba(180,79,255,1)" duration={15} />
      <FloatingOrb size={250} top="10%" left="80%" color="rgba(0,255,157,1)" duration={25} />
      <style>{`
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px,-20px) scale(1.05); }
          66% { transform: translate(-20px,30px) scale(0.95); }
        }
      `}</style>
    </div>
  )
}
