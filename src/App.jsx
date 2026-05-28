import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { apiClient } from './lib/api'

const FLIGHT = 'GD2026'
const ROUTE = 'BKI to FUTURE'
const TIME = '18:00'

const normalizeSeat = (value) => {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  if (!cleaned) return '001'
  return cleaned.slice(-3).padStart(3, '0')
}

const normalizeGuest = (payload) => {
  if (!payload) return null

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


// ─────────────────────────────────────────────────────────────────────────────
// ScannerView — 独立管理 Html5Qrcode 的生命周期
// ─────────────────────────────────────────────────────────────────────────────
function ScannerView({ onSuccess, stats, C }) {
  const scannerRef = useRef(null)
  const processingRef = useRef(null)
  const lastScannedRef = useRef('')

  const [message, setMessage] = useState('请将登机牌二维码对准摄像头')
  const [scanStatus, setScanStatus] = useState('idle') // 'idle' | 'success' | 'warning'
  const [scanPulse, setScanPulse] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08) // A5

      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.25)
    } catch (e) {
      console.warn('音频播放失败:', e)
    }
  }

  useEffect(() => {
    let html5Qrcode = null
    let stopped = false

    const startScanner = async () => {
      // 100ms 延迟，确保 React 的 DOM 节点 (#reader) 已经完全挂载
      setTimeout(async () => {
        if (stopped) return

        let cameras = []
        try {
          cameras = await Html5Qrcode.getCameras()
        } catch (e) {
          console.warn("获取摄像头列表失败，尝试直接请求设备：", e)
        }

        const element = document.getElementById('reader')
        if (!element) {
          setMessage('❌ 初始化失败：找不到摄像头渲染节点')
          setScanStatus('warning')
          return
        }

        try {
          html5Qrcode = new Html5Qrcode('reader')
          scannerRef.current = html5Qrcode

          // 【核心修复】优化摄像头选择配置，移除带有强制意味的 exact 关键字
          // 这样如果是在电脑上（没有后置摄像头），浏览器就会智能降级自动调用前置摄像头，不会卡死黑屏
          const cameraConfig = cameras.some(c => /back|rear|environment/i.test(c.label))
            ? { facingMode: { ideal: 'environment' } } // 手机：优先使用后置
            : { facingMode: 'user' }                  // 电脑：自动使用前置

          await html5Qrcode.start(
            cameraConfig,
            { 
              fps: 10, 
              qrbox: { width: 260, height: 260 }, 
              aspectRatio: 1.0 
            },
            async (text) => {
              if (processingRef.current) return
              const trimmed = String(text).trim()
              if (!trimmed || trimmed === lastScannedRef.current) return

              lastScannedRef.current = trimmed
              processingRef.current = true
              setIsProcessing(true)
              setMessage('正在核对登机凭证...')
              setScanStatus('success')

              let boardingSucceeded = false

              try {
                const parsed = JSON.parse(trimmed)
                const baseGuest = normalizeGuest(parsed)

                if (!baseGuest?.id || !baseGuest.name) {
                  setScanStatus('warning')
                  setMessage('❌ 无效的登机牌 QR。')
                  return
                }

                let guestRecord = null
                try {
                  guestRecord = await apiClient.getGuest(baseGuest.id)
                } catch {
                  setScanStatus('warning')
                  setMessage('❌ 无法连接服务器，请检查网络。')
                  return
                }

                if (!guestRecord) {
                  setScanStatus('warning')
                  setMessage('❌ 查无此人，登机牌无效。')
                  return
                }

                if (guestRecord.boarded) {
                  setScanStatus('warning')
                  setMessage(`❌ ${guestRecord.name || '该乘客'} 已经登机。`)
                  return
                }

                await apiClient.boardGuest(baseGuest.id)
                boardingSucceeded = true

                const mergedGuest = {
                  ...baseGuest,
                  name: guestRecord.name,
                  seat: normalizeSeat(guestRecord.group_num),
                  class: guestRecord.type === 'graduate' ? 'business' : 'economy',
                }

                playSuccessSound()
                setScanPulse(true)
                window.setTimeout(() => setScanPulse(false), 900)

                try {
                  if (html5Qrcode && html5Qrcode.isScanning) {
                    await html5Qrcode.stop()
                  }
                } catch {}
                scannerRef.current = null
                stopped = true

                onSuccess(mergedGuest)
              } catch (error) {
                console.error(error)
                setScanStatus('warning')
                setMessage('❌ QR 解析失败或服务器错误')
              } finally {
                setIsProcessing(false)
                processingRef.current = false
                if (!boardingSucceeded) {
                  setTimeout(() => { lastScannedRef.current = '' }, 3000)
                }
              }
            },
            () => {} // 忽略帧捕获的小错误
          )
        } catch (err) {
          console.error('Camera start error:', err)
          setMessage(`❌ 摄像头启动失败: ${err.message || '请检查权限或是否处于安全环境'}`)
          setScanStatus('warning')
        }
      }, 100)
    }

    startScanner()

    return () => {
      stopped = true
      processingRef.current = false
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
        } catch {}
        scannerRef.current = null
      }
    }
  }, [])

  return (
    <div style={{
      width: '100%', maxWidth: '420px', background: C.paper,
      borderRadius: '16px', boxShadow: '0 20px 50px rgba(11,26,51,0.15)',
      padding: '32px 24px', boxSizing: 'border-box', display: 'flex',
      flexDirection: 'column', alignItems: 'center', position: 'relative'
    }}>
      <div style={{
        textAlign: 'center', marginBottom: '24px', letterSpacing: '2px', color: C.navy
      }}>
        <div style={{ fontSize: '11px', fontWeight: 900, opacity: 0.6, textTransform: 'uppercase' }}>BOARDING SYSTEM</div>
        <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>闸机扫描口</div>
      </div>

      {/* 扫码区域外框 */}
      <div style={{
        width: '280px', height: '280px', background: '#000', borderRadius: '12px',
        overflow: 'hidden', position: 'relative',
        animation: scanPulse ? 'pulseGold 0.9s infinite' : 'none',
        border: `2px solid ${scanStatus === 'success' ? '#2e7d32' : scanStatus === 'warning' ? '#d32f2f' : C.gold}`
      }}>
        {/* 真正的扫描节点 */}
        <div id="reader" style={{ width: '100%', height: '100%' }}></div>

        {/* 扫描线动画 */}
        {!isProcessing && scanStatus === 'idle' && (
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, transparent, #c9a227, transparent)',
            boxShadow: '0 0 8px #c9a227', top: 0,
            animation: 'scanMove 2s linear infinite'
          }} />
        )}
      </div>

      <div style={{
        marginTop: '24px', fontSize: '14px', fontWeight: 700, textAlign: 'center',
        color: scanStatus === 'success' ? '#2e7d32' : scanStatus === 'warning' ? '#d32f2f' : C.navyMid,
        minHeight: '20px', padding: '0 8px'
      }}>
        {message}
      </div>

      {/* 底部简易统计 */}
      <div style={{
        marginTop: '32px', width: '100%', background: 'rgba(11,26,51,0.04)',
        borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-around',
        fontSize: '13px', color: C.navyMid, fontWeight: 700
      }}>
        <div>已登机: <span style={{ color: C.gold, fontSize: '15px' }}>{stats.boarded}</span></div>
        <div style={{ opacity: 0.3 }}>|</div>
        <div>总人数: <span>{stats.total}</span></div>
      </div>

      {/* CSS 修复：强制规范 html5-qrcode 自带的 video 样式，使其居中平铺 */}
      <style>{`
        @keyframes scanMove {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulseGold {
          0%   { box-shadow: 0 0 0 0 rgba(201,162,39,0.45); }
          70%  { box-shadow: 0 0 0 16px rgba(201,162,39,0); }
          100% { box-shadow: 0 0 0 0 rgba(201,162,39,0); }
        }
        #reader {
          background: #000 !important;
          border: none !important;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block;
        }
        #reader__dashboard, #reader img {
          display: none !important;
        }
      `}</style>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// WelcomeView — 显示扫描成功后的乘客机票凭证
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeView({ guest, onBack, C }) {
  return (
    <div style={{
      width: '100%', maxWidth: '640px', background: C.navy, color: '#fff',
      borderRadius: '16px', boxShadow: '0 30px 60px rgba(11,26,51,0.35)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '24px 32px', borderBottom: '1px dashed rgba(255,255,255,0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 900, color: C.gold, letterSpacing: '2px' }}>BOARDING PASS</div>
          <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '2px', letterSpacing: '1px' }}>欢迎登机</div>
        </div>
        <div style={{
          background: guest.class === 'business' ? C.gold : 'rgba(255,255,255,0.1)',
          color: guest.class === 'business' ? C.navy : '#fff',
          padding: '6px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 900,
          letterSpacing: '1.5px', textTransform: 'uppercase'
        }}>
          {guest.class === 'business' ? '商务舱 / BUSINESS' : '经济舱 / ECONOMY'}
        </div>
      </div>

      {/* 机票主要内容 */}
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>PASSENGER NAME</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginTop: '4px' }}>{guest.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>SEAT ASSIGNMENT</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: C.gold, marginTop: '4px', fontFamily: 'monospace' }}>{guest.seat}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>FLIGHT</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{guest.flight}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>DEPARTURE TIME</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{guest.time}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>ROUTE</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: C.goldLight }}>{guest.destination}</div>
          </div>
        </div>
      </div>

      {/* 底部返回操作栏 */}
      <div style={{
        background: 'rgba(0,0,0,0.2)', padding: '20px 32px',
        display: 'flex', justifyContent: 'between', alignItems: 'center'
      }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
          系统将在 8 秒后自动返回扫描模式...
        </div>
        <button
          onClick={onBack}
          style={{
            marginLeft: 'auto', background: C.gold, color: C.navy, border: 'none',
            padding: '10px 24px', borderRadius: '4px', fontSize: '13px', fontWeight: 900,
            cursor: 'pointer', letterSpacing: '1px', transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 0.9}
          onMouseLeave={(e) => e.target.style.opacity = 1}
        >
          手动返回
        </button>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// 主 App 组件
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState('scanner')   // 'scanner' | 'welcome'
  const [scannedGuest, setScannedGuest] = useState(null)
  const [stats, setStats] = useState({ boarded: 0, total: 0 })
  const autoReturnRef = useRef(null)

  const C = {
    navy:       '#0b1a33',
    navyMid:    '#1a3a6b',
    gold:       '#c9a227',
    goldLight:  '#f5e6b2',
    paper:      '#f0efe9',
    labelColor: '#555',
    valueColor: '#111',
  }

  const loadStats = async () => {
    try {
      const result = await apiClient.getStats()
      if (result.success) setStats(result.data)
    } catch {}
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const goToWelcome = (guest) => {
    setScannedGuest(guest)
    setView('welcome')
    loadStats()

    if (autoReturnRef.current) clearTimeout(autoReturnRef.current)
    autoReturnRef.current = window.setTimeout(() => goToScanner(), 8000)
  }

  const goToScanner = () => {
    if (autoReturnRef.current) {
      clearTimeout(autoReturnRef.current)
      autoReturnRef.current = null
    }
    setScannedGuest(null)
    setView('scanner')
  }

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', background: '#071121',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '20px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif'
    }}>
      {view === 'scanner' ? (
        <ScannerView onSuccess={goToWelcome} stats={stats} C={C} />
      ) : (
        <WelcomeView guest={scannedGuest} onBack={goToScanner} C={C} />
      )}
    </div>
  )
}

export default App