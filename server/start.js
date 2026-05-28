#!/usr/bin/env node
import app from './index.js'

// Server 会自动从 process.env.PORT 读取端口
const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`🚀 服务器运行在端口 ${port}`)
})
