import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, Code, LogOut, User, CreditCard, Activity, Terminal, Bell,
  ArrowLeft, Loader2, Mail, Shield, Sparkles, ChevronLeft, ChevronRight,
  Inbox, Clock
} from 'lucide-react'
import api from '../api/config'

const purposeConfig = {
  'Payment Reminder': { icon: CreditCard, color: 'text-temco-600', bg: 'bg-temco-50', border: 'border-temco-200' },
  'Server Provisioned': { icon: Server, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  'Subscription Renewal': { icon: CreditCard, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200' },
  'AI Usage Alert': { icon: Sparkles, color: 'text-accent-600', bg: 'bg-accent-50', border: 'border-accent-200' },
  'Overdue Notice': { icon: Shield, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

function NotificationsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { navigate('/login'); return }
    setUser(JSON.parse(userData))
  }, [navigate])

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user, page])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications', { params: { page, size: 20 } })
      setNotifications(res.data.data)
      setTotal(res.data.total)
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  const totalPages = Math.ceil(total / 20)

  const navItems = [
    { icon: Activity, label: 'Overview', path: '/dashboard' },
    { icon: Server, label: 'My Servers', path: '/dashboard' },
    { icon: Code, label: 'AI Assistant', path: '/ai' },
    { icon: Terminal, label: 'Terminal', path: '/dashboard' },
    { icon: CreditCard, label: 'Billing', path: '/billing' },
    { icon: Bell, label: 'Notifications', path: '/notifications', active: true },
    { icon: User, label: 'Profile', path: '/dashboard' },
  ]

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return dateStr }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm z-10">
        <div className="flex items-end gap-0.5 mb-8">
          <img src="/images/temco-logo-sm.png" alt="Temco" className="h-8 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>Servers</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                item.active
                  ? 'bg-primary-50 text-primary-600 border border-primary-200 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {(user.firstName?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-gray-400 truncate">{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 p-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 text-sm mt-1">{total} notification{total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary-400 via-accent-500 to-temco-500" />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-sm text-gray-500">You'll receive notifications about your subscription, payments, and AI usage here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const config = purposeConfig[n.purpose] || { icon: Mail, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
                const Icon = config.icon
                return (
                  <div key={n.id} className="flex items-start gap-4 p-5 hover:bg-gray-50 transition">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg} border ${config.border}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                          {n.purpose}
                        </span>
                        <span className="text-xs text-gray-400">via {n.type}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{n.content}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(n.sentDate)}
                        <span className="mx-1">·</span>
                        <span>From: {n.senderName}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default NotificationsPage
