# MySQL + Express 后端配置指南

你的项目已从 **Supabase** 迁移到 **MySQL + Express** 后端。

## 📁 项目结构

```
graduation.app-main/
├── server/                 # ← 新增：后端 Express 服务
│   ├── index.js           # Express 应用主文件
│   ├── package.json       # 后端依赖
│   ├── .env.example       # 环境变量示例
│   ├── database.sql       # 数据库初始化脚本
│   └── .gitignore
├── src/
│   ├── lib/
│   │   ├── api.js         # ← 新增：API 客户端
│   │   └── supabase.js    # ← 不再使用（可删除）
│   ├── App.jsx            # ← 已更新：使用新 API
│   ├── TicketGenerator.jsx # ← 已更新：使用新 API
│   └── ...
├── .env                   # ← 新增：前端环境变量
└── ...
```

## 🚀 快速启动

### 1️⃣ 安装 Node.js (如果还没有)

- 下载: https://nodejs.org/ (LTS 版本)
- 安装后重启 PowerShell

### 2️⃣ 设置 MySQL 数据库

#### 方案 A：本地 MySQL 服务器
```powershell
# 如果已安装 MySQL，连接到 MySQL
mysql -u root -p

# 粘贴 server/database.sql 的所有内容并执行
```

#### 方案 B：用 Docker（推荐快速测试）
```powershell
# 启动 MySQL 容器
docker run --name mysql-ceremony -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:latest

# 连接并导入数据
docker exec -i mysql-ceremony mysql -uroot -proot < server/database.sql
```

### 3️⃣ 启动后端服务器

```powershell
# 进入 server 目录
cd server

# 安装依赖
npm install

# 创建 .env 文件
Copy-Item .env.example -Destination .env

# 编辑 .env，修改 MySQL 连接信息（如需要）
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=root
# DB_NAME=airline_ceremony

# 启动后端（开发模式，自动重启）
npm run dev
# 或生产模式
npm start
```

**输出应该显示:**
```
✓ MySQL 连接成功
🚀 后端服务器运行在 http://localhost:5000
```

### 4️⃣ 启动前端（新终端窗口）

```powershell
# 返回项目根目录
cd ..

# 安装依赖（如果还没装）
npm install

# 启动前端
npm run dev
```

**输出应该显示:**
```
  ➜  Local:   http://localhost:5173/
```

### 5️⃣ 打开浏览器

访问 **http://localhost:5173/**

## 🔌 API 端点

后端提供以下 API（自动被前端调用）：

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/stats` | 获取登机统计 |
| GET | `/api/guests/search?name=xxx` | 搜索参与者 |
| GET | `/api/guests/:id` | 获取单个访客详情 |
| POST | `/api/guests/:id/board` | 标记为已登机 |
| GET | `/api/guests/:id/boarded-status` | 获取登机状态 |
| GET | `/api/health` | 健康检查 |

## 🗄️ 数据库表结构

```sql
CREATE TABLE guests (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  group_num VARCHAR(10),
  type VARCHAR(50),              -- 'graduate', 'vip', etc.
  seat VARCHAR(10),
  flight VARCHAR(20),
  destination VARCHAR(100),
  boarded BOOLEAN DEFAULT 0,
  boarded_at TIMESTAMP NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 📝 导入现有数据

如果你有现有的访客数据 CSV 文件：

```sql
LOAD DATA LOCAL INFILE '/path/to/guests.csv'
INTO TABLE guests
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
(id, name, group_num, type, seat, flight, destination);
```

## 🔧 环境变量

### 前端 (`.env`)
```
VITE_API_URL=http://localhost:5000
```

### 后端 (`server/.env`)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=airline_ceremony
DB_PORT=3306
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

## 🐛 常见问题

### ❌ "MySQL 连接失败"
- 检查 MySQL 是否运行中
- 检查用户名、密码、数据库名是否正确
- 检查数据库是否存在

### ❌ "CORS 错误"
- 确认后端正在运行（http://localhost:5000/api/health）
- 检查前端 `.env` 的 `VITE_API_URL` 是否正确

### ❌ "前端找不到 API"
- 检查后端是否启动（看终端输出）
- 刷新浏览器页面
- 打开浏览器开发工具（F12）查看 Network 标签错误

### ❌ "npm: 找不到命令"
- Node.js 可能未正确安装或 PowerShell 未重启
- 运行 `node --version` 验证
- 重启 PowerShell 再试

## 📦 生产部署

### 前端 (Vercel)
```bash
npm run build
# 上传 dist 文件夹到 Vercel
# 在 Vercel 环境变量中设置 VITE_API_URL=你的后端地址
```

### 后端 (Heroku / Railway / DigitalOcean)
```bash
# 提交到 Git
git add server/
git commit -m "Add Express backend"
git push

# 在主机平台配置环境变量并部署
```

## ✅ 验证安装

打开浏览器开发工具 (F12)，在 Console 标签粘贴：
```javascript
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(d => console.log('✓ 后端正常:', d))
  .catch(e => console.error('✗ 后端错误:', e))
```

应该看到: `✓ 后端正常: { success: true, message: '...' }`

---

需要帮助？检查 `server/index.js` 和 `src/lib/api.js` 中的代码！
