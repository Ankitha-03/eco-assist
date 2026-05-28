import { useState, useEffect, useRef, useCallback } from 'react'

const CAPTURE_INTERVAL = 10 * 60 // 10 minutes in seconds

function ScoreCircle({ score }) {
  const r = 40, cx = 52, cy = 52
  const circ = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circ * (1 - clamped / 100)
  const color = clamped >= 70 ? '#22a855' : clamped >= 40 ? '#e07c00' : '#d93025'
  return (
    <svg width="104" height="104" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(34,139,87,0.12)" strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
        fontSize="24" fontWeight="800" fontFamily="Space Grotesk, sans-serif">
        {Math.round(clamped)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#3d6b50"
        fontSize="9" fontFamily="Inter, sans-serif" letterSpacing="1">
        HEALTH
      </text>
    </svg>
  )
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid rgba(34,139,87,0.15)',
        borderTopColor: '#22a855',
        animation: 'camSpin 1s linear infinite',
        margin: '0 auto 14px',
      }} />
      <style>{`@keyframes camSpin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

export default function MobileCamera() {
  const API_BASE = '/api'

  // Read device ID embedded in QR code URL — no login needed on phone
  const deviceFromUrl = new URLSearchParams(window.location.search).get('device') || ''

  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [manualId, setManualId] = useState('')
  const [hasAuth, setHasAuth] = useState(false)

  const [isCameraActive, setIsCameraActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('idle') // idle | uploading | analyzing | done | error
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [countdown, setCountdown] = useState(CAPTURE_INTERVAL)
  const [expandedId, setExpandedId] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // URL param takes priority → then JWT-auth dropdown → then manual input
  const activeDeviceId = deviceFromUrl || (hasAuth ? selectedDeviceId : manualId)

  // Load devices on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setHasAuth(false); return }

    fetch(`${API_BASE}/farmer/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => {
        setHasAuth(true)
        setDevices(data)
        if (data.length > 0) setSelectedDeviceId(data[0].id)
      })
      .catch(() => setHasAuth(false))
  }, [API_BASE])

  // Load snapshot history
  const loadHistory = useCallback(async (deviceId) => {
    if (!deviceId) return
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const r = await fetch(`${API_BASE}/farmer/snapshots/${deviceId}?limit=5`, { headers })
      if (r.ok) setHistory(await r.json())
    } catch { }
  }, [API_BASE])

  useEffect(() => {
    if (activeDeviceId) loadHistory(activeDeviceId)
  }, [activeDeviceId, loadHistory])

  // Start Camera Function
  const startCamera = async () => {
    if (streamRef.current) return;
    
    // Check if browser blocks camera (HTTP)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrMsg('ERROR: Your browser blocks automatic camera access on HTTP. You MUST use HTTPS or the localtunnel link. Fallback enabled.')
      setIsCameraActive(false)
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' } // Rear camera
        })
      } catch (err) {
        // Fallback to any camera if 'environment' constraint fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        })
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      streamRef.current = stream
      setIsCameraActive(true)
      setErrMsg('')
    } catch (err) {
      setErrMsg('Camera access denied or unavailable. Please allow camera permissions.')
      setIsCameraActive(false)
    }
  }

  // Stop Camera Function
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  // Initialize camera when device is selected
  useEffect(() => {
    if (activeDeviceId) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [activeDeviceId])

  const doUpload = useCallback(async (file) => {
    const deviceId = deviceFromUrl || (hasAuth ? selectedDeviceId : manualId)
    if (!deviceId) {
      setErrMsg('Please select or enter a device ID first.')
      setUploadStatus('error')
      return
    }

    setUploadStatus('uploading')
    setErrMsg('')
    try {
      const fd = new FormData()
      fd.append('device_id', deviceId)
      fd.append('image', file)

      setUploadStatus('analyzing')

      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const r = await fetch(`${API_BASE}/ingest/camera`, {
        method: 'POST',
        headers,
        body: fd,
      })

      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail || `Server error (${r.status})`)
      }

      const data = await r.json()
      setResult(data)
      setUploadStatus('done')
      loadHistory(deviceId)
    } catch (err) {
      setUploadStatus('error')
      if (!err.message || err.message.toLowerCase().includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
        setErrMsg('Cannot connect to server. Make sure you are on the same WiFi network.')
      } else {
        setErrMsg(err.message)
      }
    }
  }, [API_BASE, deviceFromUrl, hasAuth, selectedDeviceId, manualId, loadHistory])

  // Capture Image from Video Stream
  const captureAndUpload = useCallback(() => {
    if (!videoRef.current || !activeDeviceId) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `auto_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await doUpload(file);
    }, 'image/jpeg', 0.85);
  }, [activeDeviceId, doUpload])

  // Manual File Upload Fallback
  const handleManualUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      doUpload(file);
    }
  }, [doUpload])

  // Countdown timer for automatic capture
  useEffect(() => {
    if (!activeDeviceId || !isCameraActive) return;

    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          captureAndUpload()
          return CAPTURE_INTERVAL
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [activeDeviceId, isCameraActive, captureAndUpload])

  const fmtCountdown = (s) => {
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  const statusMessages = {
    uploading: { label: 'Uploading…', sub: 'Sending image to server' },
    analyzing: { label: 'Analyzing…', sub: 'Running visual health analysis' },
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f7f4',
      fontFamily: "'Space Grotesk', sans-serif", color: '#1a2e22',
      paddingBottom: 80,
      position: 'relative', zIndex: 1,
    }}>

      {/* ── HEADER ── */}
      <header style={{
        background: '#ffffff', borderBottom: '1px solid rgba(34,139,87,0.15)',
        padding: '14px 20px', position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 2px 8px rgba(34,139,87,0.08)',
      }}>
        <div style={{ fontSize: '1.5rem' }}>📷</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.88rem', fontWeight: 700, color: '#22a855', letterSpacing: '0.06em' }}>
            AUTO CAMERA
          </div>
          <div style={{ fontSize: '0.68rem', color: '#3d6b50', marginTop: 1 }}>
            Continuous visual monitoring
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.62rem', color: '#7a9e8a' }}>Next auto-scan in</div>
          <div style={{
            fontFamily: 'Orbitron, monospace', fontSize: '0.88rem', fontWeight: 700,
            color: countdown < 60 ? '#d93025' : '#22a855',
          }}>
            {fmtCountdown(countdown)}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '18px 16px' }}>

        {/* ── DEVICE SELECTOR ── */}
        <div style={{
          background: '#ffffff', borderRadius: 16, padding: '16px 18px', marginBottom: 14,
          border: '1px solid rgba(34,139,87,0.12)', boxShadow: '0 2px 8px rgba(34,139,87,0.06)',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3d6b50', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            📡 Device Link
          </div>
          {deviceFromUrl ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(34,139,87,0.06)', borderRadius: 10,
              padding: '10px 14px', border: '1px solid rgba(34,139,87,0.2)',
            }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a7a45' }}>Device pre-selected</div>
                <div style={{ fontSize: '0.65rem', color: '#7a9e8a', marginTop: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {deviceFromUrl}
                </div>
              </div>
            </div>
          ) : hasAuth && devices.length > 0 ? (
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(34,139,87,0.2)', background: '#f0f7f4',
                color: '#1a2e22', fontSize: '0.9rem', outline: 'none',
              }}>
              <option value="" disabled>Select a device</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.device_name}</option>
              ))}
            </select>
          ) : (
            <div>
              <div style={{ fontSize: '0.72rem', color: '#7a9e8a', marginBottom: 6 }}>
                {hasAuth ? 'No devices found.' : 'No login session found.'} Enter device ID manually:
              </div>
              <input
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                placeholder="Paste device UUID here…"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid rgba(34,139,87,0.2)', background: '#f0f7f4',
                  color: '#1a2e22', fontSize: '0.82rem', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>

        {/* ── CAMERA VIEWPORT ── */}
        <div style={{
          background: '#ffffff', borderRadius: 16, padding: '20px 18px', marginBottom: 14,
          border: '1px solid rgba(34,139,87,0.12)', boxShadow: '0 2px 8px rgba(34,139,87,0.06)',
          textAlign: 'center',
        }}>

          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(34,139,87,0.2)', backgroundColor: '#000', position: 'relative' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', display: isCameraActive ? 'block' : 'none', maxHeight: 350, objectFit: 'cover' }}
            />
            {!isCameraActive && (
              <div style={{ padding: '60px 20px', color: '#fff', fontSize: '0.9rem' }}>
                Camera inactive.<br />Select a device to start automatic monitoring.
              </div>
            )}
            {/* Hidden canvas for taking snapshots */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Spinner while uploading/analyzing */}
          {(uploadStatus === 'uploading' || uploadStatus === 'analyzing') ? (
            <div style={{ padding: '16px 0' }}>
              <Spinner />
              <div style={{ color: '#22a855', fontWeight: 700, fontSize: '0.95rem' }}>
                {statusMessages[uploadStatus]?.label}
              </div>
              <div style={{ color: '#7a9e8a', fontSize: '0.75rem', marginTop: 4 }}>
                {statusMessages[uploadStatus]?.sub}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setCountdown(CAPTURE_INTERVAL);
                  captureAndUpload();
                }}
                disabled={!isCameraActive}
                style={{
                  background: isCameraActive ? 'linear-gradient(135deg, #22a855, #1a8c45)' : '#c8d8cc',
                  color: '#ffffff', border: 'none', borderRadius: 14,
                  padding: '18px 24px', fontSize: '1.05rem', fontWeight: 700,
                  cursor: isCameraActive ? 'pointer' : 'not-allowed',
                  width: '100%', letterSpacing: '0.01em',
                  boxShadow: isCameraActive ? '0 4px 16px rgba(34,139,87,0.3)' : 'none',
                  transition: 'all 0.2s',
                  marginBottom: !isCameraActive ? 14 : 0,
                }}>
                📸 Force Capture Now
              </button>
              
              {!isCameraActive && (
                <div style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={handleManualUpload}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                    }}
                  />
                  <button style={{
                    background: 'transparent', color: '#22a855', border: '2px dashed rgba(34,139,87,0.4)', 
                    borderRadius: 14, padding: '16px 24px', fontSize: '1.05rem', fontWeight: 700,
                    width: '100%', transition: 'all 0.2s',
                  }}>
                    ⬆️ Manual Upload Fallback
                  </button>
                </div>
              )}

              <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#7a9e8a' }}>
                Keep this screen open. The app will automatically capture and analyze a photo every 10 minutes.
              </div>
            </>
          )}

          {/* Error state */}
          {errMsg && uploadStatus !== 'uploading' && uploadStatus !== 'analyzing' && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                background: 'rgba(217,48,37,0.07)', border: '1px solid rgba(217,48,37,0.22)',
                borderRadius: 10, padding: '11px 14px', color: '#c62828',
                fontSize: '0.8rem', textAlign: 'left', marginBottom: 10, lineHeight: 1.5,
              }}>
                ⚠️ {errMsg}
              </div>
            </div>
          )}
        </div>

        {/* ── RESULTS ── */}
        {result && uploadStatus === 'done' && (
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '20px 18px', marginBottom: 14,
            border: `2px solid ${result.mold_detected ? 'rgba(217,48,37,0.35)' : 'rgba(34,139,87,0.3)'}`,
            boxShadow: '0 4px 20px rgba(34,139,87,0.1)',
          }}>
            {/* Status banner */}
            <div style={{
              background: result.mold_detected ? 'rgba(217,48,37,0.08)' : 'rgba(34,139,87,0.07)',
              border: `1px solid ${result.mold_detected ? 'rgba(217,48,37,0.28)' : 'rgba(34,139,87,0.22)'}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 18,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{result.mold_detected ? '🚨' : '✅'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: result.mold_detected ? '#c62828' : '#1a7a45' }}>
                  {result.mold_detected
                    ? 'CRITICAL: Mold detected! Check your produce immediately.'
                    : 'Produce looks healthy. No visual spoilage detected.'}
                </div>
                {result.mold_detected && (
                  <div style={{ fontSize: '0.73rem', color: '#b86200', marginTop: 4 }}>
                    An alert has been sent to your dashboard.
                  </div>
                )}
              </div>
            </div>

            {/* Score + metrics row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <ScoreCircle score={result.visual_health_score ?? 0} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#7a9e8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mold Detected</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: result.mold_detected ? '#d93025' : '#22a855', marginTop: 3 }}>
                    {result.mold_detected ? '⚠ YES' : '✓ No'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#7a9e8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sprout Detected</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: result.sprout_detected ? '#e07c00' : '#22a855', marginTop: 3 }}>
                    {result.sprout_detected ? '⚠ YES' : '✓ No'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(34,139,87,0.1)', paddingTop: 12, fontSize: '0.7rem', color: '#7a9e8a', lineHeight: 1.6 }}>
              📅 {new Date().toLocaleString()} &nbsp;·&nbsp;
              Visual score: <strong style={{ color: '#1a2e22' }}>{(result.visual_health_score ?? 0).toFixed(1)}/100</strong>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {history.length > 0 && (
          <div style={{
            background: '#ffffff', borderRadius: 16, padding: '18px 18px', marginBottom: 14,
            border: '1px solid rgba(34,139,87,0.12)', boxShadow: '0 2px 8px rgba(34,139,87,0.06)',
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#3d6b50', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              📜 Recent Captures
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((snap) => {
                const isExpanded = expandedId === snap.id
                const score = snap.visual_health_score ?? 80
                const scoreColor = score >= 70 ? '#22a855' : score >= 40 ? '#e07c00' : '#d93025'
                return (
                  <div
                    key={snap.id}
                    onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                    style={{
                      borderRadius: 12, border: '1px solid rgba(34,139,87,0.12)',
                      overflow: 'hidden', cursor: 'pointer', background: '#f8fbf9',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
                      <img
                        src={`${API_BASE}${snap.image_url}`}
                        alt=""
                        style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(34,139,87,0.15)' }}
                        onError={e => { e.target.style.background = '#e8f5ef'; e.target.style.display = 'block' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.76rem', color: '#1a2e22', fontWeight: 600 }}>
                          {new Date(snap.captured_at).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                          {snap.mold_detected && (
                            <span style={{ fontSize: '0.62rem', background: 'rgba(217,48,37,0.1)', color: '#c62828', border: '1px solid rgba(217,48,37,0.25)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                              🔴 Mold
                            </span>
                          )}
                          <span style={{ fontSize: '0.62rem', background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}40`, borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                            {score.toFixed(0)} score
                          </span>
                        </div>
                      </div>
                      <div style={{ color: '#7a9e8a', fontSize: '0.75rem', flexShrink: 0 }}>
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                    {isExpanded && (
                      <img
                        src={`${API_BASE}${snap.image_url}`}
                        alt="Full capture"
                        style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── TIPS ── */}
        <div style={{
          background: 'rgba(33,150,168,0.05)', border: '1px solid rgba(33,150,168,0.15)',
          borderRadius: 12, padding: '13px 16px', fontSize: '0.72rem', color: '#3d6b50', lineHeight: 1.7,
        }}>
          <strong>📱 Tips for auto-capture:</strong> Mount the phone securely 20-40cm from produce. Ensure the area is well lit. Keep this browser window open and active to allow continuous monitoring.
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#ffffff', borderTop: '1px solid rgba(34,139,87,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '10px 0',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        zIndex: 100, boxShadow: '0 -2px 12px rgba(34,139,87,0.08)',
      }}>
        {[
          {
            icon: '🏠', label: 'Home',
            onClick: () => { window.location.href = `http://${window.location.hostname}:5173` },
          },
          {
            icon: '📸', label: 'Auto Cam', active: true,
            onClick: () => { },
          },
          {
            icon: '📊', label: 'Dashboard',
            onClick: () => { window.location.href = `http://${window.location.hostname}:5173/farmer/dashboard` },
          },
        ].map(({ icon, label, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '4px 20px',
              color: active ? '#22a855' : '#7a9e8a',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: active ? 700 : 500 }}>{label}</span>
            {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22a855' }} />}
          </button>
        ))}
      </nav>
    </div>
  )
}
