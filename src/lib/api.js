const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const apiClient = {
  // 获取统计数据
  async getStats() {
    const response = await fetch(`${API_BASE_URL}/api/stats`)
    if (!response.ok) throw new Error('无法获取统计数据')
    return response.json()
  },

  // 搜索参与者
  async searchGuests(name) {
    const response = await fetch(
      `${API_BASE_URL}/api/guests/search?name=${encodeURIComponent(name)}`
    )
    if (!response.ok) throw new Error('无法搜索参与者')
    const result = await response.json()
    return result.data || []
  },

  // 获取单个访客
  async getGuest(guestId) {
    const response = await fetch(`${API_BASE_URL}/api/guests/${guestId}`)
    if (!response.ok) throw new Error('访客不存在')
    const result = await response.json()
    return result.data
  },

  // 记录登机
  async boardGuest(guestId) {
    const response = await fetch(`${API_BASE_URL}/api/guests/${guestId}/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) throw new Error('无法记录登机')
    const result = await response.json()
    return result.data
  },

  // 获取登机状态
  async getGuestBoardedStatus(guestId) {
    const response = await fetch(`${API_BASE_URL}/api/guests/${guestId}/boarded-status`)
    if (!response.ok) throw new Error('无法获取登机状态')
    const result = await response.json()
    return result.data
  },

  // 健康检查
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`)
      return response.ok
    } catch {
      return false
    }
  },
}
