import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8180/temcoservers/api'
const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8580'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const aiApi = axios.create({
  baseURL: AI_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
