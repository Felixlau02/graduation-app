import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { apiClient } from './lib/api'

const FLIGHT_NO = 'GD2026'
const TIME = '18:00'
const DATE = '13 JUNE 2026'
const GATE = '01'
const AIRLINE = 'SMTM 主恩大专'
const FROM_CODE = 'BKI'
const TO_CODE = 'FUTURE'
const MOTTO = '耶和华说：我知道我向你们所怀的意念，是赐平安的意念，不是降灾祸的意念，要叫你们末后有指望（耶利米书 29:11）'
const REMINDER = '请看护你们曾经的激情和理想，在这个怀疑的时代，我们依旧需要信仰'

const formatSeat = (value) => {
  return String(value ?? '—')
}

function Barcode({ value, width = 180, height = 48 }) {
  const bars = []
  let x = 0
  const seed = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const totalBars = 60
  const unitW = width / totalBars
  for (let i = 0; i < totalBars; i++) {
    const isThin = (seed * (i + 3) * 7 + i * 13) % 3 !== 0
    const barW = isThin ? unitW * 0.8 : unitW * 1.4
    if ((seed + i) % 2 === 0) {
      bars.push(<rect key={i} x={x} y={0} width={barW} height={height} fill="#111" />)
    }
    x += barW + unitW * 0.3
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {bars}
    </svg>
  )
}

function Seal({ color = '#c9a227', size = 72 }) {
  const [imgFailed, setImgFailed] = useState(false)
  if (imgFailed) {
    return (
      <svg width={size} height={size} viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="34" fill="none" stroke={color} strokeWidth="2.5" />
        <text x="36" y="40" textAnchor="middle" fontSize="7" fontWeight="700" fill={color} fontFamily="serif">SMTM 主恩大专</text>
      </svg>
    )
  }
  return (
    <img
      src="/src/assets/logo_doodle.png"
      alt="SMTM 主恩大专"
      style={{ width: '170px', height: '115px', objectFit: 'contain' }}
      onError={() => setImgFailed(true)}
    />
  )
}

function BoardingPass({ person }) {
  const isGraduate = person.type === 'graduate'
  const seat = String(person.seat ?? person.group_num ?? '—')

  const accentColor = isGraduate ? '#c9a227' : '#1a3a6b'
  const accentLight = isGraduate ? '#f5e6b2' : '#dbeafe'
  const borderColor = isGraduate ? '#c9a227' : '#1a3a6b'
  const headerBg = isGraduate ? '#0b1a33' : '#1a3a6b'
  const headerText = isGraduate ? '#c9a227' : '#ffffff'
  const footerBg = isGraduate ? '#0b1a33' : '#1a3a6b'
  const footerText = isGraduate ? '#c9a227' : '#e0eaff'
  const labelColor = '#555'
  const valueColor = '#111'

  const qrData = JSON.stringify({
    id: person.id,
    name: person.name,
    seat,
    flight: FLIGHT_NO,
    time: TIME,
    date: DATE,
  })

  return (
    <div
      id={`ticket-${person.id}`}
      style={{
        width: '100%',
        maxWidth: '800px',
        background: '#f0efe9',
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        overflow: 'hidden',
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      }}
    >
      {/* ══ MAIN BODY ══ */}
      <div style={{ display: 'flex', minHeight: '280px' }}>

        {/* ════ LEFT MAIN SECTION ════ */}
        <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Header bar */}
          <div style={{ background: headerBg, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: headerText, fontWeight: 900, fontSize: '13px', letterSpacing: '1.5px' }}>{AIRLINE}</span>
            <span style={{ background: accentLight, color: accentColor, fontWeight: 700, fontSize: '11px', padding: '3px 10px', borderRadius: '3px', letterSpacing: '1px' }}>2023-2026</span>
          </div>

          {/* Content: 3 columns — left fields | QR | motto+notice */}
          <div style={{ flex: 1, padding: '14px 16px 0 16px', display: 'flex', gap: '12px' }}>

            {/* Col 1: SEAT / TIME / GATE+barcode */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', flexShrink: 0 }}>
              <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '4px 10px' }}>
                <div style={{ fontSize: '10px', color: labelColor, fontWeight: 700, letterSpacing: '1px' }}>SEAT</div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: valueColor, lineHeight: 1.1, letterSpacing: '2px' }}>{seat}</div>
              </div>

              <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '4px 10px' }}>
                <div style={{ fontSize: '10px', color: labelColor, fontWeight: 700, letterSpacing: '1px' }}>TIME</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: valueColor, lineHeight: 1.1 }}>{TIME}</div>
                <div style={{ fontSize: '9px', color: labelColor, marginTop: '2px' }}>DATE  {DATE}</div>
              </div>

              <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '4px 10px' }}>
                <div style={{ fontSize: '10px', color: labelColor, fontWeight: 700, letterSpacing: '1px' }}>BOARDING GATE</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: valueColor, lineHeight: 1.3, letterSpacing: '1px' }}>主恩堂圣堂</div>
              </div>
            </div>

            {/* Col 2: QR code (centered between col1 and motto) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '96px',
              flexShrink: 0,
              paddingBottom: '14px',
            }}>
              <div style={{ background: '#f0efe9', padding: '5px', borderRadius: '4px', border: `1.5px solid ${borderColor}` }}>
                <QRCodeCanvas value={qrData} size={76} level="H" />
              </div>
              <div style={{ fontSize: '8px', fontWeight: 700, color: labelColor, letterSpacing: '1px', textAlign: 'center' }}>SCAN TO BOARD</div>
            </div>

            {/* Col 3: flight label + motto box + notice */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: labelColor, fontWeight: 700, letterSpacing: '1px' }}>FLIGHT {FLIGHT_NO}</div>

              <div style={{
                border: `1.5px solid ${borderColor}`,
                borderRadius: '4px',
                padding: '10px 14px',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#111111',
                  fontFamily: '"STKaiti", "KaiTi", "楷体", "FangSong", serif',
                  lineHeight: 1.8,
                  letterSpacing: '0.5px',
                }}>
                  {MOTTO}
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#777', lineHeight: 1.5, paddingBottom: '8px' }}>
                <div style={{ fontWeight: 700 }}>重要提示: 登机口于起飞前10分钟关闭</div>
                <div>NOTICE: GATES WILL BE CLOSED 10 MINUTES BEFORE DEPARTURE TIME</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SVG tear line (renders correctly in html2canvas) ── */}
        <div style={{ width: '18px', display: 'flex', alignItems: 'stretch', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
          {/* top notch */}
          <div style={{ position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '8px', borderRadius: '0 0 8px 8px', background: '#f0efe9', border: `1.5px solid ${borderColor}`, borderTop: 'none' }} />
          {/* SVG dashed line */}
          <svg width="4" style={{ flex: 1, margin: '8px 0', overflow: 'visible' }} preserveAspectRatio="none">
            <line x1="2" y1="0" x2="2" y2="100%" stroke={borderColor} strokeWidth="4" strokeDasharray="8 5" />
          </svg>
          {/* bottom notch */}
          <div style={{ position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', width: '14px', height: '8px', borderRadius: '8px 8px 0 0', background: '#f0efe9', border: `1.5px solid ${borderColor}`, borderBottom: 'none' }} />
        </div>

        {/* ════ RIGHT STUB ════ */}
        <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: headerBg, padding: '8px 10px', color: headerText, fontWeight: 900, fontSize: '11px', letterSpacing: '1px' }}>
            {AIRLINE}
          </div>

          <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#f0efe9', borderRadius: '4px', padding: '4px 0', overflow: 'visible' }}>
              <Seal color={accentColor} size={80} />
            </div>

            <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '6px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: labelColor, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
                <span>FROM</span>
                <span>TO</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '17px', fontWeight: 900, color: valueColor, letterSpacing: '1px' }}>
                <span>{FROM_CODE}</span>
                <span style={{ color: accentColor, fontSize: '16px' }}>✈</span>
                <span>{TO_CODE}</span>
              </div>
            </div>

            <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: '4px', padding: '6px 10px' }}>
              <div style={{ fontSize: '9px', color: labelColor, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>NAME</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: valueColor, letterSpacing: '1px', wordBreak: 'break-all' }}>
                {person.name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BOTTOM REMINDER BANNER ══ */}
      <div style={{ background: footerBg, padding: '8px 18px', fontSize: '11px', color: footerText, fontWeight: 600, letterSpacing: '0.5px', lineHeight: 1.6 }}>
        REMINDER: {REMINDER}
      </div>
    </div>
  )
}

function TicketGenerator() {
  const [query, setQuery] = useState('')
  const [participants, setParticipants] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [message, setMessage] = useState('请输入姓名，系统会自动匹配并生成机票。')
  const [loadError, setLoadError] = useState('')

  const primaryColor = '#1a3a6b'

  const searchParticipants = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setParticipants([])
      setMessage('请输入姓名，系统会自动从数据库匹配并生成机票。')
      return
    }
    setIsSearching(true)
    setLoadError('')
    setMessage('正在查询姓名...')
    try {
      const data = await apiClient.searchGuests(trimmedQuery)
      if (!data?.length) {
        setParticipants([])
        setMessage('未找到匹配姓名，请检查是否为完整姓名或重新输入。')
        return
      }
      setParticipants(data)
      setMessage(`已找到 ${data.length} 位匹配人员。`)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoadError('无法从服务器拉取数据，请检查后端是否正常运行。')
      setParticipants([])
      setMessage('查询失败。')
    } finally {
      setIsSearching(false)
    }
  }

  const downloadTicketAsPNG = async (personId, personName) => {
    const ticketElement = document.getElementById(`ticket-${personId}`)
    if (!ticketElement) return
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f0efe9',
      })
      const imageURL = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = imageURL
      downloadLink.download = `BoardingPass_${personName.replace(/\s+/g, '_')}.png`
      downloadLink.click()
    } catch (error) {
      console.error('Failed to generate image:', error)
      alert('图片生成失败')
    }
  }

  return (
    <div style={{ fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif', minHeight: '100vh' }}>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1a33 0%, #1a3a6b 60%, #0b1a33 100%)',
        padding: '48px 24px 56px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative diagonal lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(45deg, #c9a227 0px, #c9a227 1px, transparent 1px, transparent 28px)',
          pointerEvents: 'none',
        }} />

        {/* flight tag */}
        <div style={{
          display: 'inline-block',
          background: '#c9a227',
          color: '#0b1a33',
          fontWeight: 900,
          fontSize: '11px',
          letterSpacing: '3px',
          padding: '4px 18px',
          borderRadius: '2px',
          marginBottom: '18px',
          textTransform: 'uppercase',
        }}>
          ✈ &nbsp; 2026 下半年欢送会 &nbsp; ✈
        </div>

        <h1 style={{
          margin: '0 0 14px',
          fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '4px',
          lineHeight: 1.1,
        }}>
          机票生成器
        </h1>

        <p style={{
          margin: '0 auto 32px',
          maxWidth: '500px',
          color: '#a0b4cc',
          fontSize: '14px',
          lineHeight: 1.8,
          letterSpacing: '0.3px',
        }}>
          输入参与者姓名，系统会直接从数据库查询并生成对应的登机牌
        </p>

        {/* Search bar */}
        <div style={{
          display: 'flex',
          maxWidth: '480px',
          margin: '0 auto',
          background: '#f0efe9',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '2px solid #c9a227',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') searchParticipants() }}
            placeholder="输入姓名搜索..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              padding: '14px 18px',
              color: '#0b1a33',
              background: 'transparent',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={searchParticipants}
            disabled={isSearching}
            style={{
              padding: '14px 24px',
              border: 'none',
              background: '#c9a227',
              color: '#0b1a33',
              fontWeight: 900,
              fontSize: '14px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              letterSpacing: '1px',
              flexShrink: 0,
              fontFamily: 'inherit',
              opacity: isSearching ? 0.7 : 1,
            }}
          >
            {isSearching ? '查询中...' : '搜 索'}
          </button>
        </div>

        {/* bottom wave shape */}
        <div style={{
          position: 'absolute', bottom: -1, left: 0, right: 0, height: '28px',
          background: '#f0efe9',
          clipPath: 'ellipse(55% 100% at 50% 100%)',
        }} />
      </div>

      {/* ══ CONTENT AREA ══ */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 20px 72px' }}>

        {/* Error */}
        {loadError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: '6px',
            backgroundColor: '#fef2f2', color: '#991b1b',
            border: '1px solid #fecaca', marginBottom: '24px', fontWeight: 600,
          }}>
            ⚠ {loadError}
          </div>
        )}

        {/* Status message */}
        {message && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            marginBottom: '32px',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #c9a22755)' }} />
            <span style={{
              color: '#0b1a33', fontWeight: 800, fontSize: '13px',
              letterSpacing: '1.5px', textTransform: 'uppercase',
              padding: '6px 20px',
              border: '1.5px solid #c9a227',
              borderRadius: '3px',
              background: '#f0efe9',
            }}>{message}</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #c9a22755)' }} />
          </div>
        )}

        {/* Ticket cards */}
        <div style={{ display: 'grid', gap: '40px', justifyItems: 'center' }}>
          {participants.map((person) => (
            <div key={person.id} style={{ width: '100%', maxWidth: '820px' }}>

              {/* Passenger label above ticket */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '12px', paddingLeft: '4px',
              }}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#c9a227', flexShrink: 0,
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 900, color: '#0b1a33',
                  letterSpacing: '2.5px', textTransform: 'uppercase',
                }}>登机牌 · {person.name}</span>
                <div style={{ flex: 1, height: '1px', background: '#c9a22733' }} />
              </div>

              {/* Ticket with subtle shadow lift */}
              <div style={{
                borderRadius: '8px',
                boxShadow: '0 2px 0 #c9a22788, 0 12px 40px rgba(11,26,51,0.18)',
                overflow: 'hidden',
              }}>
                <BoardingPass person={person} />
              </div>

              {/* Download button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => downloadTicketAsPNG(person.id, person.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 36px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0b1a33 0%, #1a3a6b 100%)',
                    color: '#c9a227',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                    letterSpacing: '2.5px',
                    fontFamily: 'inherit',
                    borderRadius: '4px',
                    boxShadow: '0 2px 0 #c9a22799, 0 8px 24px rgba(11,26,51,0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M7 9l-3-3M7 9l3-3M1 11h12" stroke="#c9a227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  下载 PNG
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {participants.length === 0 && !loadError && (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            color: '#0b1a3366', fontSize: '13px', letterSpacing: '1px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈</div>
            <div style={{ fontWeight: 700 }}>在上方搜索姓名以生成登机牌</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TicketGenerator