export default function CornerBrackets({ color = '#00ff9d', size = 14, thickness = 2, opacity = 0.6 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `${thickness}px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: -1, left: -1, borderTop: b, borderLeft: b, borderRadius: '2px 0 0 0' }} />
      <div style={{ ...s, top: -1, right: -1, borderTop: b, borderRight: b, borderRadius: '0 2px 0 0' }} />
      <div style={{ ...s, bottom: -1, left: -1, borderBottom: b, borderLeft: b, borderRadius: '0 0 0 2px' }} />
      <div style={{ ...s, bottom: -1, right: -1, borderBottom: b, borderRight: b, borderRadius: '0 0 2px 0' }} />
    </>
  )
}
