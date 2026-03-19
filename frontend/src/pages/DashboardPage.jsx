import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Code, LogOut, User, CreditCard, Activity, Play, Square, RotateCw, Globe, Cpu, Loader2, RefreshCw, Circle, Bell, ExternalLink, Shield, Mail, Phone, MapPin, ArrowLeft } from 'lucide-react'
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

  const isImpersonating = localStorage.getItem('impersonating') === 'true'

  const handleReturnToAdmin = () => {
    const adminToken = localStorage.getItem('adminToken')
    const adminUser = localStorage.getItem('adminUser')
    if (adminToken && adminUser) {
      localStorage.setItem('token', adminToken)
      localStorage.setItem('user', adminUser)
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      localStorage.removeItem('impersonating')
      window.location.href = '/admin'
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
    { icon: CreditCard, label: 'Billing', tab: 'billing', link: '/billing' },
    { icon: Bell, label: 'Notifications', tab: 'notifications', link: '/notifications' },
    { icon: User, label: 'Profile', tab: 'profile' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm z-10">
        <div className="flex items-end gap-0.5 mb-8 cursor-pointer" onClick={() => window.open('/', '_blank')}>
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
          {(user.role === 'Super Admin' || user.role === 'System Admin') && (
            <div className="pt-3 mt-2 border-t border-gray-200">
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-accent-600 hover:bg-accent-50 hover:border-accent-200 transition font-medium"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </button>
            </div>
          )}
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
          <button onClick={() => window.open('/', '_blank')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition">
            <ExternalLink className="w-4 h-4" />
            Back to Website
          </button>
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
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="-mt-4 mb-6 mx-0 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Shield className="w-4 h-4" />
              <span>You are viewing as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.username})</span>
            </div>
            <button
              onClick={handleReturnToAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Admin
            </button>
          </div>
        )}

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

        {activeTab === 'overview' && <>
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

        {/* Overview: compact server status list (no actions) */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-temco-500" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Server Status</h2>
              <button onClick={() => setActiveTab('servers')} className="text-xs text-primary-500 hover:text-primary-600 font-medium">View All &rarr;</button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {servers.map((srv) => (
                  <div key={srv.instanceId} className={`flex items-center justify-between p-3 rounded-lg border ${statusBg(srv.status)}`}>
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-primary-500" />
                      <span className="text-sm font-medium text-gray-900">{srv.displayName || srv.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {srv.ipv4 && <span>{srv.ipv4}</span>}
                      <span className={`flex items-center gap-1 font-medium ${statusColor(srv.status)}`}>
                        <Circle className="w-2 h-2 fill-current" />
                        {srv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>}

        {/* My Servers: full server list with actions */}
        {activeTab === 'servers' && (
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
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-temco-500" />
              <div className="p-8">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-accent-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                    <span className="inline-block mt-1 px-3 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-full">{user.role}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Username</div>
                      <div className="text-sm text-gray-900 font-medium">{user.username}</div>
                    </div>
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Email</div>
                        <div className="text-sm text-gray-900 font-medium">{user.email}</div>
                      </div>
                    </div>
                  )}
                  {user.mobile && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Mobile</div>
                        <div className="text-sm text-gray-900 font-medium">{user.mobile}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400">
                  GUP ID: {user.gupId} &middot; Login ID: {user.loginId}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default DashboardPage
