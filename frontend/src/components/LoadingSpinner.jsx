export default function LoadingSpinner({ size = 40, center = false }) {
  const el = (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <div style={{
        position: 'absolute', inset: 0,
        border: '2px solid rgba(0,212,255,0.2)',
        borderTopColor: '#00d4ff',
        borderRadius: '50%',
        animation: 'spinO 1.1s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: size * 0.18,
        border: '2px solid rgba(0,255,157,0.2)',
        borderTopColor: '#00ff9d',
        borderRadius: '50%',
        animation: 'spinI 0.75s linear infinite reverse',
      }} />
      <style>{`
        @keyframes spinO { to { transform: rotate(360deg); } }
        @keyframes spinI { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
  if (center) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      {el}
    </div>
  )
  return el
}
