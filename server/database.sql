-- 创建数据库
CREATE DATABASE IF NOT EXISTS airline_ceremony;
USE airline_ceremony;

-- 创建 guests 表
CREATE TABLE IF NOT EXISTS guests (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  group_num VARCHAR(10),
  type VARCHAR(50),
  seat VARCHAR(10),
  flight VARCHAR(20),
  destination VARCHAR(100),
  boarded BOOLEAN DEFAULT 0,
  boarded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_boarded (boarded)
);

-- 示例数据（可选）
INSERT INTO guests (id, name, group_num, type, seat, flight, destination, boarded) VALUES
('guest-001', 'Felix', '001', 'graduate', '001', 'GD2026', 'BKI to FUTURE', 0);
