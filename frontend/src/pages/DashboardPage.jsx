import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Code, LogOut, User, CreditCard, Activity, Terminal, Play, Square, RotateCw, Globe, Cpu, Loader2, RefreshCw, Circle, Bell } from 'lucide-react'
import api from '../api/config'

function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(userData))
    fetchServers()
  }, [navigate])

  const fetchServers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/servers')
      setServers(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load servers')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (instanceId, action) => {
    setActionLoading(`${instanceId}-${action}`)
    try {
      await api.post(`/servers/${instanceId}/${action}`)
      setTimeout(fetchServers, 3000)
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  const runningCount = servers.filter(s => s.status === 'running').length
  const stoppedCount = servers.filter(s => s.status === 'stopped').length

  const statusColor = (status) => {
    if (status === 'running') return 'text-green-500'
    if (status === 'stopped') return 'text-red-400'
    return 'text-yellow-500'
  }

  const statusBg = (status) => {
    if (status === 'running') return 'bg-green-50 border-green-200'
    if (status === 'stopped') return 'bg-red-50 border-red-200'
    return 'bg-yellow-50 border-yellow-200'
  }

  const navItems = [
    { icon: Activity, label: 'Overview', tab: 'overview' },
    { icon: Server, label: 'My Servers', tab: 'servers' },
    { icon: Code, label: 'AI Assistant', tab: 'ai', link: '/ai' },
    { icon: Terminal, label: 'Terminal', tab: 'terminal' },
    { icon: CreditCard, label: 'Billing', tab: 'billing', link: '/billing' },
    { icon: Bell, label: 'Notifications', tab: 'notifications', link: '/notifications' },
    { icon: User, label: 'Profile', tab: 'profile' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
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
              onClick={() => item.link ? navigate(item.link) : setActiveTab(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                activeTab === item.tab
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
              {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-gray-400 truncate">{user.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.firstName || user.username}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage your servers and AI tools from here.
            </p>
          </div>
          <button
            onClick={fetchServers}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Servers', value: servers.length, icon: Server, gradient: 'from-primary-500 to-primary-600' },
            { label: 'Running', value: runningCount, icon: Play, gradient: 'from-green-500 to-green-600' },
            { label: 'Stopped', value: stoppedCount, icon: Square, gradient: 'from-red-400 to-red-500' },
            { label: 'AI Requests', value: '0', icon: Code, gradient: 'from-accent-500 to-temco-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">{stat.label}</span>
                  <div className={`w-9 h-9 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Server Instances */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-temco-500" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Server Instances</h2>
              <span className="text-xs text-gray-400">{servers.length} instances from Contabo</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                <span className="ml-3 text-gray-500">Loading servers from Contabo...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 mb-3">{error}</p>
                <button onClick={fetchServers} className="text-sm text-primary-500 hover:underline">Try again</button>
              </div>
            ) : (
              <div className="space-y-3">
                {servers.map((srv) => (
                  <div
                    key={srv.instanceId}
                    className={`flex items-center justify-between p-4 rounded-xl border transition hover:shadow-md ${statusBg(srv.status)}`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                        <Server className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate">
                            {srv.displayName || srv.name}
                          </span>
                          <span className={`flex items-center gap-1 text-xs font-medium ${statusColor(srv.status)}`}>
                            <Circle className="w-2 h-2 fill-current" />
                            {srv.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          {srv.ipv4 && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {srv.ipv4}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3 h-3" />
                            {srv.productId}
                          </span>
                          <span>{srv.region}</span>
                          <span className="text-gray-400">ID: {srv.instanceId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {srv.status === 'stopped' && (
                        <button
                          onClick={() => handleAction(srv.instanceId, 'start')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === `${srv.instanceId}-start` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          Start
                        </button>
                      )}
                      {srv.status === 'running' && (
                        <>
                          <button
                            onClick={() => handleAction(srv.instanceId, 'restart')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading === `${srv.instanceId}-restart` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                            Restart
                          </button>
                          <button
                            onClick={() => handleAction(srv.instanceId, 'stop')}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading === `${srv.instanceId}-stop` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                            Stop
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
