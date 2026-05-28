export default function LoadingSpinner({ size = 40, center = false }) {
  const el = (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <div style={{
        position: 'absolute', inset: 0,
        border: '2px solid rgba(33, 150, 168,0.2)',
        borderTopColor: '#2196a8',
        borderRadius: '50%',
        animation: 'spinO 1.1s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: size * 0.18,
        border: '2px solid rgba(34, 139, 87,0.2)',
        borderTopColor: '#22a855',
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
