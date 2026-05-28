# 部署说明

## GitHub 推送成功！

你的代码已上传到：
https://github.com/Felixlau02/graduation-app

### 下一步：部署到 Railway 和 Vercel

**1. 后端部署到 Railway**
- 访问 https://railway.app/
- 登录 → New Project → Deploy from GitHub repo
- 选择 Felixlau02/graduation-app
- 选择 server 文件夹
- Railway 会问是否要添加 MySQL 数据库 → 选择 YES
- 设置环境变量（Railway 会自动生成 DB 连接信息）

**2. 前端部署到 Vercel**
- 访问 https://vercel.com/
- 登录 → Add New → Project
- 选择 Felixlau02/graduation-app
- Framework: Vite
- 设置环境变量：
  ```
  VITE_API_URL=<你的 Railway 后端 URL>
  ```

详见下方的完整部署指南。
