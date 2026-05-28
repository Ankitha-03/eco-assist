import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const API_BASE = `http://${window.location.hostname}:8000`

export default function QRCamera() {
  const [ip, setIp] = useState(
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? ''
      : window.location.hostname
  )
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [loadingDevices, setLoadingDevices] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoadingDevices(false); return }
    fetch(`${API_BASE}/farmer/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setDevices(data)
        if (data.length > 0) setSelectedDeviceId(data[0].id)
      })
      .catch(() => { })
      .finally(() => setLoadingDevices(false))
  }, [])

  const ready = ip && selectedDeviceId
  const url = ready
    ? `http://${ip}:5173/camera?device=${selectedDeviceId}`
    : ''

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f7f4',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 20px',
      fontFamily: "'Space Grotesk', sans-serif", color: '#1a2e22',
      position: 'relative', zIndex: 1,
    }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>

        <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>📱</div>
        <h1 style={{
          fontFamily: 'Orbitron, monospace', fontSize: '1.25rem', color: '#22a855',
          marginBottom: 6, letterSpacing: '0.06em',
        }}>
          MOBILE CAMERA
        </h1>
        <p style={{ color: '#3d6b50', fontSize: '0.88rem', marginBottom: 24, lineHeight: 1.6 }}>
          Scan with your phone — device ID is encoded in the QR code automatically
        </p>

        {/* Device selector */}
        <div style={{
          background: '#ffffff', borderRadius: 16, padding: '16px 20px', marginBottom: 20,
          border: '1px solid rgba(34,139,87,0.15)', boxShadow: '0 2px 8px rgba(34,139,87,0.06)',
          textAlign: 'left',
        }}>
          <label style={{
            display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#3d6b50',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>
            📡 Select Device for QR Code
          </label>
          {loadingDevices ? (
            <div style={{ color: '#7a9e8a', fontSize: '0.82rem', padding: '8px 0' }}>Loading devices…</div>
          ) : devices.length > 0 ? (
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(34,139,87,0.25)', background: '#f0f7f4',
                color: '#1a2e22', fontSize: '0.9rem', outline: 'none',
              }}>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.device_name}</option>
              ))}
            </select>
          ) : (
            <div style={{ color: '#e07c00', fontSize: '0.8rem', padding: '4px 0' }}>
              ⚠ Not logged in — QR will open camera without a device pre-selected
            </div>
          )}
          {selectedDevice && (
            <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#22a855' }}>
              ✓ Device ID will be embedded in QR — no login needed on phone
            </div>
          )}
        </div>

        {/* IP input */}
        <div style={{
          background: '#ffffff', borderRadius: 16, padding: '16px 20px', marginBottom: 20,
          border: `1px solid ${!ip ? 'rgba(217,48,37,0.4)' : 'rgba(34,139,87,0.15)'}`,
          boxShadow: !ip ? '0 2px 8px rgba(217,48,37,0.1)' : '0 2px 8px rgba(34,139,87,0.06)',
          textAlign: 'left',
        }}>
          <label style={{
            display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#3d6b50',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>
            🖥 PC IP Address
          </label>
          {!ip && (
            <div style={{
              background: 'rgba(217,48,37,0.07)', border: '1px solid rgba(217,48,37,0.25)',
              borderRadius: 8, padding: '9px 12px', marginBottom: 10,
              fontSize: '0.78rem', color: '#c62828', lineHeight: 1.5,
            }}>
              ⚠ Type your PC's WiFi IP below — the QR won't work on your phone until you do.<br />
              <strong>Find it:</strong> Windows → Settings → WiFi → Properties → IPv4 address
            </div>
          )}
          <input
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="e.g. 192.168.1.42"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              border: `1px solid ${!ip ? 'rgba(217,48,37,0.35)' : 'rgba(34,139,87,0.25)'}`,
              background: '#f0f7f4',
              color: '#1a2e22', fontSize: '0.95rem', outline: 'none',
              textAlign: 'center', boxSizing: 'border-box', fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          />
          <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#7a9e8a' }}>
            {ip
              ? <>✓ QR will point to <strong style={{ color: '#1a2e22', fontFamily: 'monospace' }}>{ip}</strong></>
              : <>Enter your PC's local IP so the phone can reach it over WiFi</>
            }
          </div>
        </div>

        {/* QR Card */}
        <div style={{
          background: '#ffffff', borderRadius: 20, padding: '28px 28px 20px',
          border: `2px solid ${ready ? 'rgba(34,139,87,0.2)' : 'rgba(217,48,37,0.25)'}`,
          boxShadow: '0 8px 32px rgba(34,139,87,0.12)',
          marginBottom: 20, display: 'inline-block',
        }}>
          {ready ? (
            <>
              <QRCodeSVG
                value={url}
                size={220}
                bgColor="#ffffff"
                fgColor="#1a2e22"
                level="M"
                style={{ display: 'block' }}
              />
              <div style={{
                marginTop: 14, fontSize: '0.65rem', color: '#7a9e8a',
                wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5,
              }}>
                {url}
              </div>
            </>
          ) : (
            <div style={{
              width: 220, height: 220, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 10,
              color: '#c8d8cc', border: '2px dashed rgba(217,48,37,0.2)', borderRadius: 12,
            }}>
              <div style={{ fontSize: '2.5rem' }}>📵</div>
              <div style={{ fontSize: '0.75rem', color: '#e07c00', textAlign: 'center', lineHeight: 1.4, padding: '0 10px' }}>
                {!ip ? "Enter your PC's IP above" : 'Select a device above'} to generate the QR code
              </div>
            </div>
          )}
        </div>

        {/* Steps */}
        <div style={{
          background: 'rgba(34,139,87,0.05)', border: '1px solid rgba(34,139,87,0.15)',
          borderRadius: 14, padding: '16px 18px', textAlign: 'left', marginBottom: 20,
          fontSize: '0.8rem', color: '#3d6b50', lineHeight: 1.9,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#1a2e22' }}>📋 Steps</div>
          <div>1. Select which device above</div>
          <div>2. Make sure IP shows <code style={{ background: 'rgba(34,139,87,0.1)', padding: '1px 5px', borderRadius: 4 }}>10.202.0.174</code></div>
          <div>3. Scan QR with phone camera app</div>
          <div>4. Tap "Capture Produce Image" — device is pre-filled!</div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => ready && window.open(`/camera?device=${selectedDeviceId}`, '_blank')}
            disabled={!ready}
            style={{
              background: ready ? 'linear-gradient(135deg, #22a855, #1a8c45)' : '#c8d8cc',
              color: '#ffffff', border: 'none', borderRadius: 10, padding: '12px 24px',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
              fontSize: '0.88rem', cursor: ready ? 'pointer' : 'not-allowed',
              boxShadow: ready ? '0 4px 12px rgba(34,139,87,0.25)' : 'none',
            }}>
            📷 Open Camera on this PC →
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'transparent', color: '#3d6b50',
              border: '1.5px solid rgba(34,139,87,0.3)', borderRadius: 10, padding: '12px 24px',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              fontSize: '0.88rem', cursor: 'pointer',
            }}>
            ← Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
