import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createPool } from 'mysql2/promise'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// CORS 配置
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://graduation-app-blond.vercel.app',
      '*'
    ]
    
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}

// 中间件
app.use(cors(corsOptions))
app.use(express.json())

// MySQL 连接池
const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'airline_ceremony',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// 测试连接
pool
  .getConnection()
  .then((conn) => {
    console.log('✓ MySQL 连接成功')
    conn.release()
  })
  .catch((err) => {
    console.error('✗ MySQL 连接失败:', err.message)
  })

// ==================== API 路由 ====================

// 1. 获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    const conn = await pool.getConnection()

    // 获取总人数
    const [totalResult] = await conn.query('SELECT COUNT(*) as total FROM guests')
    const total = totalResult[0]?.total || 0

    // 获取已登机人数
    const [boardedResult] = await conn.query('SELECT COUNT(*) as boarded FROM guests WHERE boarded = 1')
    const boarded = boardedResult[0]?.boarded || 0

    conn.release()

    res.json({
      success: true,
      data: { total, boarded },
    })
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 2. 搜索参与者
app.get('/api/guests/search', async (req, res) => {
  const { name } = req.query

  if (!name || name.trim() === '') {
    return res.json({ success: true, data: [] })
  }

  try {
    const conn = await pool.getConnection()
    const [rows] = await conn.query(
      'SELECT id, name, group_num, type FROM guests WHERE name LIKE ? ORDER BY name ASC',
      [`%${name}%`]
    )
    conn.release()

    res.json({ success: true, data: rows || [] })
  } catch (error) {
    console.error('搜索参与者错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 3. 获取单个访客详情
app.get('/api/guests/:guestId', async (req, res) => {
  const { guestId } = req.params

  try {
    const conn = await pool.getConnection()
    const [rows] = await conn.query('SELECT * FROM guests WHERE id = ?', [guestId])
    conn.release()

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '访客不存在' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('获取访客详情错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 4. 记录登机
app.post('/api/guests/:guestId/board', async (req, res) => {
  const { guestId } = req.params

  try {
    const conn = await pool.getConnection()

    // 检查访客是否存在
    const [guest] = await conn.query('SELECT * FROM guests WHERE id = ?', [guestId])

    if (guest.length === 0) {
      conn.release()
      return res.status(404).json({ success: false, error: '访客不存在' })
    }

    // 更新登机状态
    await conn.query('UPDATE guests SET boarded = 1, boarded_at = NOW() WHERE id = ?', [guestId])

    conn.release()

    res.json({
      success: true,
      message: '登机成功',
      data: { ...guest[0], boarded: 1 },
    })
  } catch (error) {
    console.error('记录登机错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 5. 获取访客登机状态
app.get('/api/guests/:guestId/boarded-status', async (req, res) => {
  const { guestId } = req.params

  try {
    const conn = await pool.getConnection()
    const [rows] = await conn.query('SELECT id, boarded FROM guests WHERE id = ?', [guestId])
    conn.release()

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '访客不存在' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('获取登机状态错误:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// 6. 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API 服务正常运行' })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 后端服务器运行在 http://localhost:${PORT}`)
})
