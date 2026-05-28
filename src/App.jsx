import { Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { apiClient } from './lib/api'

const FLIGHT = 'GD2026'
const ROUTE = 'BKI to FUTURE'
const TIME = '18:00'

const demoGuestQRCode = {
  id: 'guest-001',
  name: '张三',
  seat: '001',
  flight: FLIGHT,
  time: TIME,
  destination: ROUTE,
  class: 'graduate',
}

const normalizeSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')

  if (!cleaned) {
    return '001'
  }

  return cleaned.slice(-3).padStart(3, '0')
}

const normalizeGuest = (payload) => {
  if (!payload) {
    return null
  }

  const guestClass =
    payload.class?.toLowerCase() ||
    payload.type?.toLowerCase() ||
    payload.role?.toLowerCase() ||
    'economy'

  return {
    id: payload.id ?? payload.participant_id ?? payload.guest_id ?? '',
    name: payload.name ?? '',
    seat: normalizeSeat(payload.seat ?? payload.group_num ?? payload.zone ?? payload.seat_code),
    flight: payload.flight ?? FLIGHT,
    time: payload.time ?? TIME,
    destination: payload.destination ?? ROUTE,
    class:
      guestClass === 'graduate' || guestClass === 'business' || guestClass === 'vip'
        ? 'business'
        : 'economy',
  }
}

function App() {
  const [scannerName, setScannerName] = useState(() => localStorage.getItem('scanner_name') || '')
  const [message, setMessage] = useState('请扫描票据二维码开始登机。')
  const [scanStatus, setScanStatus] = useState('success')
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedGuest, setScannedGuest] = useState(null)
  const [configWarning, setConfigWarning] = useState('')
  const [showWelcomeBurst, setShowWelcomeBurst] = useState(false)
  const [scanPulse, setScanPulse] = useState(true)
  const [stats, setStats] = useState({
    boarded: 0,
    total: 0,
  })
  const [guestQuery, setGuestQuery] = useState('')
  const [generatedGuest, setGeneratedGuest] = useState(null)
  const [generationMessage, setGenerationMessage] = useState('请输入姓名生成二维码。')
  const [isGenerating, setIsGenerating] = useState(false)

  const processingRef = useRef(false)
  const lastScannedRef = useRef('')
  const audioContextRef = useRef(null)

  const loadStats = async () => {
    try {
      const result = await apiClient.getStats()
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const generateGuestQRCode = async () => {
    const trimmedQuery = guestQuery.trim()

    if (!trimmedQuery) {
      setGeneratedGuest(null)
      setGenerationMessage('请输入姓名生成二维码。')
      return
    }

    setIsGenerating(true)
    setGenerationMessage('正在查找参与者，请稍候...')

    try {
      const data = await apiClient.searchGuests(trimmedQuery)

      if (!data || data.length === 0) {
        const localGuest = {
          id: `local-${trimmedQuery.toLowerCase()}`,
          name: trimmedQuery,
          seat: normalizeSeat(trimmedQuery),
          flight: FLIGHT,
          time: TIME,
          destination: ROUTE,
          class: 'economy',
        }

        setGeneratedGuest(localGuest)
        setGenerationMessage(`未在数据库中找到 ${trimmedQuery}，已生成本地测试二维码。扫描即可展示 boarding pass。`)
        return
      }

      const exactMatch = data.find((item) => item.name.trim().toLowerCase() === trimmedQuery.toLowerCase())
      const guest = exactMatch || data[0]

      const qrData = {
        id: guest.id,
        name: guest.name,
        seat: normalizeSeat(guest.seat ?? guest.group_num),
        flight: guest.flight ?? FLIGHT,
        time: guest.time ?? TIME,
        destination: guest.destination ?? ROUTE,
        class: guest.type ?? 'economy',
      }

      setGeneratedGuest(qrData)
      setGenerationMessage(`已生成 ${guest.name} 的二维码，扫码即可登机。`)
    } catch (error) {
      console.error('生成二维码失败:', error)
      const localGuest = {
        id: `local-${trimmedQuery.toLowerCase()}`,
        name: trimmedQuery,
        seat: normalizeSeat(trimmedQuery),
        flight: FLIGHT,
        time: TIME,
        destination: ROUTE,
        class: 'economy',
      }

      setGeneratedGuest(localGuest)
      setGenerationMessage(`后端不可用，已生成本地 ${trimmedQuery} 的测试二维码。`)
    } finally {
      setIsGenerating(false)
    }
  }

  const playSuccessSound = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext

    if (!AudioContext) {
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }

    const context = audioContextRef.current

    if (context.state === 'suspended') {
      context.resume().catch(() => {})
    }

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.12)

    gainNode.gain.setValueAtTime(0.001, context.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.34)
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 320, height: 320 }, rememberLastUsedCamera: true },
      false
    )

    scanner.render(async (text) => {
      if (processingRef.current) {
        return
      }

      const trimmed = String(text).trim()

      if (!trimmed || trimmed === lastScannedRef.current) {
        return
      }

      lastScannedRef.current = trimmed
      processingRef.current = true
      setIsProcessing(true)
      setMessage('正在核对登机凭证...')
      setScanStatus('success')

      try {
        const parsed = JSON.parse(trimmed)
        const baseGuest = normalizeGuest(parsed)

        if (!baseGuest?.id || !baseGuest.name) {
          setScanStatus('warning')
          setMessage('❌ 无效的登机牌。')
          setScannedGuest(null)
          return
        }

        // 尝试从服务器获取访客信息
        let guestRecord = null
        try {
          guestRecord = await apiClient.getGuest(baseGuest.id)
        } catch (error) {
          console.warn('后端访客查询失败，使用扫码数据显示 boarding pass。', error)
        }

        if (guestRecord) {
          if (guestRecord.boarded) {
            setScanStatus('warning')
            setMessage(`❌ ${guestRecord.name || '该乘客'} 已经登机`)
            setScannedGuest(null)
            return
          }

          await apiClient.boardGuest(baseGuest.id)

          const mergedGuest = {
            ...baseGuest,
            name: guestRecord.name,
            seat: normalizeSeat(guestRecord.group_num),
            class: guestRecord.type === 'graduate' ? 'business' : 'economy',
          }

          setScannedGuest(mergedGuest)
          setMessage(`🎉 欢迎登机，${mergedGuest.name}`)
        } else {
          setScannedGuest(baseGuest)
          setMessage(`🎉 欢迎登机，${baseGuest.name}`)
        }

        setScanStatus('success')
        playSuccessSound()
        setShowWelcomeBurst(true)
        setScanPulse(true)

        window.setTimeout(() => {
          setScanPulse(false)
        }, 900)

        window.setTimeout(() => {
          setShowWelcomeBurst(false)
        }, 2200)

        // 更新统计数据
        loadStats()
      } catch (error) {
        console.error(error)
        setScanStatus('warning')
        setMessage('❌ QR 解析失败或服务器错误')
        setScannedGuest(null)
      } finally {
        setIsProcessing(false)
        processingRef.current = false

        setTimeout(() => {
          lastScannedRef.current = ''
        }, 3000)
      }
    })

    return () => {
      processingRef.current = false
      scanner.clear().catch(() => {})
    }
  }, [])

  const colors = {
    bg: '#f4f7fb',
    panel: '#ffffff',
    primary: '#2563eb',
    textMain: '#0f172a',
    textMuted: '#52607a',
    border: '#d9e3f1',
    successBg: '#ecfdf5',
    successText: '#047857',
    warningBg: '#fef2f2',
    warningText: '#b91c1c',
    glow: 'rgba(37, 99, 235, 0.24)',
  }

  const credentialItems = scannedGuest
    ? [
        ['姓名', scannedGuest.name],
        ['座位', scannedGuest.seat],
        ['航班', scannedGuest.flight],
        ['时间', scannedGuest.time],
        ['目的地', scannedGuest.destination],
        ['舱位', scannedGuest.class.toUpperCase()],
      ]
    : []

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '28px 20px 40px',
        background:
          'radial-gradient(circle at top left, rgba(191, 219, 254, 0.88), transparent 30%), radial-gradient(circle at top right, rgba(224, 231, 255, 0.78), transparent 28%), linear-gradient(180deg, #f9fcff 0%, #f4f8fd 52%, #ffffff 100%)',
        color: colors.textMain,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(16px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28); }
          70% { box-shadow: 0 0 0 18px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: colors.primary,
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
            }}
          >
            ✨ 2026 下半年欢送会
          </div>
          <h1
            style={{
              margin: '14px 0 10px',
              fontSize: 'clamp(2.1rem, 3.6vw, 3rem)',
              lineHeight: 1.05,
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            欢迎大厅
          </h1>
          <p
            style={{
              margin: '0 auto',
              maxWidth: '720px',
              color: colors.textMuted,
              fontSize: '16px',
              lineHeight: 1.7,
            }}
          >
            扫描登机牌二维码，即刻进入欢迎大厅，展示“欢迎登机”与完整凭证。
          </p>
        </div>

        {configWarning && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px 18px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
              color: '#854d0e',
              border: '1px solid #fde68a',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 800,
            }}
          >
            {configWarning}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <section
            style={{
              backgroundColor: colors.panel,
              borderRadius: '28px',
              padding: '28px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.1px',
                    color: colors.primary,
                    fontWeight: 800,
                  }}
                >
                  扫码区
                </p>
                <h2 style={{ margin: '6px 0 0', fontSize: '22px', color: colors.textMain }}>
                  扫码登机
                </h2>
              </div>
              <span
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  backgroundColor: isProcessing ? '#dbeafe' : colors.successBg,
                  color: isProcessing ? '#1d4ed8' : colors.successText,
                  fontWeight: 800,
                  fontSize: '13px',
                }}
              >
                {isProcessing ? '识别中...' : '相机已开启'}
              </span>
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(59,130,246,0.04))',
                border: `1px solid ${colors.border}`,
                animation: scanPulse ? 'pulseGlow 0.9s ease-out' : 'none',
              }}
            >
              <div id="reader" style={{ borderRadius: '18px', overflow: 'hidden' }} />
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '24px',
                borderRadius: '24px',
                backgroundColor: '#f8fbff',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: colors.textMain }}>
                    输入姓名生成登机二维码
                  </div>
                  <p style={{ margin: '8px 0 0', color: colors.textMuted, fontSize: '14px' }}>
                    例如输入 “Felix”，点击生成后会出现该乘客的二维码，扫描即可展示 boarding pass。
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                  <input
                    value={guestQuery}
                    onChange={(event) => setGuestQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        generateGuestQRCode()
                      }
                    }}
                    placeholder="请输入姓名，例如 Felix"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: `1px solid ${colors.border}`,
                      fontSize: '15px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={generateGuestQRCode}
                    disabled={isGenerating}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '14px',
                      border: 'none',
                      backgroundColor: colors.primary,
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {isGenerating ? '生成中...' : '生成二维码'}
                  </button>
                </div>

                <p style={{ margin: 0, color: colors.textMuted, fontSize: '14px' }}>{generationMessage}</p>

                {generatedGuest && (
                  <div
                    style={{
                      display: 'grid',
                      justifyItems: 'center',
                      gap: '12px',
                      padding: '18px',
                      borderRadius: '20px',
                      backgroundColor: '#ffffff',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <QRCodeCanvas value={JSON.stringify(generatedGuest)} size={180} level="H" />
                    <div style={{ textAlign: 'center', color: colors.textMain }}>
                      <div style={{ fontWeight: 800 }}>{generatedGuest.name}</div>
                      <div style={{ fontSize: '13px', color: colors.textMuted }}>扫码此二维码即可登机</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '16px 18px',
                borderRadius: '18px',
                backgroundColor: scanStatus === 'success' ? colors.successBg : colors.warningBg,
                color: scanStatus === 'success' ? colors.successText : colors.warningText,
                border: `1px solid ${scanStatus === 'success' ? '#a7f3d0' : '#fecaca'}`,
                textAlign: 'center',
                boxShadow: scanStatus === 'success' ? `0 12px 30px ${colors.glow}` : 'none',
              }}
            >
              <p style={{ margin: 0, fontWeight: 800, fontSize: '15px' }}>{message}</p>
            </div>
          </section>

          <section
            style={{
              backgroundColor: colors.panel,
              borderRadius: '28px',
              padding: '28px',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1.1px',
                color: colors.primary,
                fontWeight: 800,
              }}
            >
              欢迎大厅
            </p>
            <h2 style={{ margin: '8px 0 10px', fontSize: '22px', color: colors.textMain }}>
              欢迎登机展示
            </h2>
            <p style={{ margin: '0 0 18px', color: colors.textMuted, lineHeight: 1.7 }}>
              扫描成功后，这里会切换成大屏式欢迎卡片，并展示当前者的完整凭证。
            </p>

            {scannedGuest ? (
              <div
                style={{
                  position: 'relative',
                  padding: '24px 24px 22px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)',
                  color: '#ffffff',
                  boxShadow: '0 24px 48px rgba(37, 99, 235, 0.24)',
                  overflow: 'hidden',
                  animation: showWelcomeBurst ? 'floatUp 0.45s ease-out' : 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-34px',
                    right: '-34px',
                    width: '150px',
                    height: '150px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.14)',
                  }}
                />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                      marginBottom: '18px',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          letterSpacing: '1.2px',
                          textTransform: 'uppercase',
                          opacity: 0.8,
                        }}
                      >
                        登机成功
                      </p>
                      <h3
                        style={{
                          margin: '8px 0 0',
                          fontSize: 'clamp(1.6rem, 2vw, 2rem)',
                          fontWeight: 900,
                        }}
                      >
                        {scannedGuest.name}
                      </h3>
                    </div>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.14)',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.8px',
                      }}
                    >
                      {scannedGuest.class.toUpperCase()}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: '12px',
                      marginTop: '18px',
                    }}
                  >
                    {credentialItems.map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '18px',
                          background: 'rgba(15, 23, 42, 0.28)',
                          border: '1px solid rgba(255,255,255,0.14)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            opacity: 0.8,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 800 }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  borderRadius: '24px',
                  background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(255,255,255,0.98))',
                  border: `1px dashed ${colors.border}`,
                  color: colors.textMuted,
                  lineHeight: 1.8,
                }}
              >
                <p style={{ margin: 0, fontWeight: 700, color: colors.textMain }}>等待扫码</p>
                <p style={{ margin: '8px 0 0' }}>扫描后这里会自动展开欢迎大卡，并显示完整登机凭证。</p>
              </div>
            )}

            <div
              style={{
                marginTop: '20px',
                padding: '18px 20px',
                borderRadius: '20px',
                backgroundColor: '#f8fafc',
                border: `1px solid ${colors.border}`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.1px',
                  color: colors.primary,
                  fontWeight: 800,
                }}
              >
                扫描人的名字
              </p>
              <div style={{ marginTop: '12px' }}>
                <input
                  value={scannerName}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setScannerName(nextValue)
                    localStorage.setItem('scanner_name', nextValue)
                  }}
                  placeholder="请输入委员名字"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${colors.border}`,
                    fontSize: '15px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default App