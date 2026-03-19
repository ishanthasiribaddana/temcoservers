import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, Code, LogOut, User, CreditCard, Activity, Users, BarChart3,
  Search, ChevronLeft, ChevronRight, Globe, Cpu, Circle, DollarSign,
  Shield, Loader2, RefreshCw, LayoutDashboard, ExternalLink, Landmark, Mail, Eye, Stethoscope, Terminal, Trash2
} from 'lucide-react'
import api from '../api/config'
import { APP_VERSION } from '../version'
import { UsersTab, RolesTab, ModulesPagesTab } from './AdminRbacTabs'
import { PaymentsTab, SubscriptionsTab } from './AdminPaymentsTabs'
import { AccountsFinanceTab } from './AdminAccountsTab'
import { EmailOverviewTab, EmailTemplatesTab, EmailGroupsTab, EmailCampaignsTab, EmailScheduleTab } from './AdminEmailCampaignTabs'

function AdminPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [customers, setCustomers] = useState([])
  const [customerTotal, setCustomerTotal] = useState(0)
  const [customerPage, setCustomerPage] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { navigate('/login'); return }
    const u = JSON.parse(userData)
    if (u.role !== 'Super Admin' && u.role !== 'System Admin') {
      navigate('/dashboard')
      return
    }
    setUser(u)
    fetchStats()
  }, [navigate])

  useEffect(() => {
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'servers') fetchServers()
  }, [activeTab, customerPage])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = { page: customerPage, size: 20 }
      if (customerSearch) params.search = customerSearch
      const res = await api.get('/admin/customers', { params })
      setCustomers(res.data.data)
      setCustomerTotal(res.data.total)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const fetchServers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/servers')
      setServers(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load servers')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerSearch = (e) => {
    e.preventDefault()
    setCustomerPage(0)
    fetchCustomers()
  }

  const handleImpersonate = async (gupId, customerName) => {
    if (!confirm(`Login as ${customerName}? You'll be redirected to their dashboard.`)) return
    try {
      const res = await api.post(`/admin/impersonate/${gupId}`)
      const customerData = res.data
      // Save admin session for "Return to Admin" functionality
      localStorage.setItem('adminToken', localStorage.getItem('token'))
      localStorage.setItem('adminUser', localStorage.getItem('user'))
      // Switch to customer session
      localStorage.setItem('token', customerData.token)
      localStorage.setItem('user', JSON.stringify(customerData))
      localStorage.setItem('impersonating', 'true')
      // Navigate to customer dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to impersonate user')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return null

  const navItems = [
    { icon: BarChart3, label: 'Overview', tab: 'overview' },
    { icon: Users, label: 'Customers', tab: 'customers' },
    { icon: Server, label: 'Servers', tab: 'servers' },
    { icon: Landmark, label: 'Accounts & Finance', tab: 'accounts', section: true, sectionLabel: 'Finance' },
    { icon: DollarSign, label: 'Payments', tab: 'payments', section: true, sectionLabel: 'Billing' },
    { icon: CreditCard, label: 'Subscriptions', tab: 'subscriptions' },
    { icon: Mail, label: 'Campaigns', tab: 'email-overview', section: true, sectionLabel: 'Email Marketing' },
    { icon: Mail, label: 'Templates', tab: 'email-templates' },
    { icon: Users, label: 'Audiences', tab: 'email-groups' },
    { icon: Mail, label: 'Send', tab: 'email-send' },
    { icon: Mail, label: 'Schedules', tab: 'email-schedules' },
    { icon: Stethoscope, label: 'AI Doctor', tab: 'ai-doctor', section: true, sectionLabel: 'AI & Support' },
    { icon: Users, label: 'User Mgmt', tab: 'rbac-users', section: true, sectionLabel: 'Access Control' },
    { icon: Shield, label: 'Roles & Perms', tab: 'rbac-roles' },
    { icon: Activity, label: 'Modules & Pages', tab: 'rbac-modules' },
  ]

  const statusColor = (status) => {
    if (status === 'running') return 'text-green-500'
    if (status === 'stopped') return 'text-red-400'
    return 'text-yellow-500'
  }

  const totalPages = Math.ceil(customerTotal / 20)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 py-4 px-4 flex flex-col shadow-sm z-10">
        <div className="flex items-end gap-0.5 mb-2 cursor-pointer" onClick={() => window.open('/', '_blank')}>
          <img src="/images/temco-logo-sm.png" alt="Temco" className="h-8 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>Servers</span>
        </div>
        <div className="flex items-center gap-1.5 mb-4 px-1">
          <Shield className="w-3.5 h-3.5 text-accent-500" />
          <span className="text-xs font-semibold text-accent-500 uppercase tracking-wide">Admin Panel</span>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {navItems.map((item, i) => (
            <div key={i}>
              {item.section && (
                <div className="pt-3 pb-1 mt-2 border-t border-gray-200">
                  <span className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.sectionLabel || 'Section'}</span>
                </div>
              )}
              <button
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  activeTab === item.tab
                    ? 'bg-accent-50 text-accent-600 border border-accent-200 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              User Dashboard
            </button>
          </div>
        </nav>

        <div className="border-t border-gray-200 pt-3 mt-2">
          <div className="flex items-center gap-3 px-3 py-1.5 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {(user.firstName?.[0] || 'A').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</div>
              <div className="text-xs text-accent-500 font-medium truncate">{user.role}</div>
            </div>
          </div>
          <button onClick={() => window.open('/', '_blank')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition">
            <ExternalLink className="w-4 h-4" />
            Back to Website
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <div className="mt-3 text-center text-xs text-gray-400">{APP_VERSION}</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Manage students, servers, and revenue.</p>
          </div>
          <button
            onClick={() => { fetchStats(); if (activeTab === 'customers') fetchCustomers(); if (activeTab === 'servers') fetchServers(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {loading && !stats ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
              </div>
            ) : stats && (
              <>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  {[
                    { label: 'Total Users', value: stats.totalUsers?.toLocaleString(), icon: Users, gradient: 'from-primary-500 to-primary-600' },
                    { label: 'Total Students', value: stats.totalStudents?.toLocaleString(), icon: User, gradient: 'from-accent-500 to-accent-600' },
                    { label: 'Server Customers', value: stats.serverCustomers?.toLocaleString(), icon: Server, gradient: 'from-green-500 to-green-600' },
                    { label: 'Active Subs', value: stats.activeSubscriptions?.toLocaleString(), icon: CreditCard, gradient: 'from-temco-500 to-temco-600' },
                    { label: 'Active Plans', value: stats.activePlans?.toLocaleString(), icon: Activity, gradient: 'from-primary-400 to-accent-500' },
                    { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue?.toFixed(2)}`, icon: DollarSign, gradient: 'from-green-400 to-green-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">{stat.label}</span>
                          <div className={`w-8 h-8 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center`}>
                            <stat.icon className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-primary-500 to-primary-600" />
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Summary</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Database</span>
                          <span className="font-medium text-gray-900">ijts_recovery_db</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Total Students (JIAT)</span>
                          <span className="font-medium text-gray-900">{stats.totalStudents?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Server Customers</span>
                          <span className="font-medium text-green-600">{stats.serverCustomers}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Subscription Plans</span>
                          <span className="font-medium text-gray-900">{stats.activePlans}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-accent-500 to-temco-500" />
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <button onClick={() => setActiveTab('customers')} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-accent-50 border border-gray-200 hover:border-accent-200 rounded-lg transition text-left">
                          <Users className="w-5 h-5 text-accent-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Manage Customers</div>
                            <div className="text-xs text-gray-500">View and search server customers</div>
                          </div>
                        </button>
                        <button onClick={() => setActiveTab('servers')} className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-200 rounded-lg transition text-left">
                          <Server className="w-5 h-5 text-primary-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">View All Servers</div>
                            <div className="text-xs text-gray-500">Contabo VPS instances</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent-500 to-accent-600" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Server Customers</h2>
                <span className="text-xs text-gray-400">{customerTotal} total</span>
              </div>

              {/* Search */}
              <form onSubmit={handleCustomerSearch} className="mb-6">
                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name, username, or email..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
                  />
                </div>
              </form>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-accent-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((c, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-accent-400 to-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {(c.firstName?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{c.firstName} {c.lastName}</div>
                                  <div className="text-xs text-gray-400">ID: {c.gupId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{c.username}</td>
                            <td className="py-3 px-4 text-gray-600">{c.email || '—'}</td>
                            <td className="py-3 px-4 text-gray-600">{c.mobile || '—'}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.isActive === 1 ? 'text-green-600' : 'text-red-500'}`}>
                                <Circle className="w-2 h-2 fill-current" />
                                {c.isActive === 1 ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {c.isActive === 1 && (
                                <button
                                  onClick={() => handleImpersonate(c.gupId, `${c.firstName} ${c.lastName}`)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100 transition"
                                  title="Login as this customer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Login As
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {customers.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-gray-400">No customers found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        Page {customerPage + 1} of {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCustomerPage(p => Math.max(0, p - 1))}
                          disabled={customerPage === 0}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCustomerPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={customerPage >= totalPages - 1}
                          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Servers Tab */}
        {activeTab === 'servers' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-500 via-accent-500 to-temco-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">All Contabo Servers</h2>
                <span className="text-xs text-gray-400">{servers.length} instances</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {servers.map((srv) => (
                    <div key={srv.instanceId} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:shadow-md transition bg-gray-50">
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
                      <div className="text-xs text-gray-400 ml-4">
                        {srv.defaultUser}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accounts & Finance Tab */}
        {activeTab === 'accounts' && <AccountsFinanceTab />}

        {/* Payments Tab */}
        {activeTab === 'payments' && <PaymentsTab />}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}

        {/* Email Campaign Tabs */}
        {activeTab === 'email-overview' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-500 to-accent-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Email Campaign Dashboard</h2>
              <EmailOverviewTab />
            </div>
          </div>
        )}
        {activeTab === 'email-templates' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-500 to-temco-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Email Templates</h2>
              <EmailTemplatesTab />
            </div>
          </div>
        )}
        {activeTab === 'email-groups' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent-500 to-green-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Audience Groups</h2>
              <EmailGroupsTab />
            </div>
          </div>
        )}
        {activeTab === 'email-send' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent-500 to-accent-600" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Send Campaign</h2>
              <EmailCampaignsTab />
            </div>
          </div>
        )}
        {activeTab === 'email-schedules' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-purple-500 to-primary-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Scheduled Campaigns</h2>
              <EmailScheduleTab />
            </div>
          </div>
        )}

        {/* AI Doctor — Admin Sessions Tab */}
        {activeTab === 'ai-doctor' && <AdminDoctorTab />}

        {/* RBAC — Users Tab */}
        {activeTab === 'rbac-users' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent-500 to-primary-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">User Management</h2>
              <UsersTab />
            </div>
          </div>
        )}

        {/* RBAC — Roles & Permissions Tab */}
        {activeTab === 'rbac-roles' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-500 to-accent-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Roles & Permissions</h2>
              <RolesTab />
            </div>
          </div>
        )}

        {/* RBAC — Modules & Pages Tab */}
        {activeTab === 'rbac-modules' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-temco-500 to-accent-500" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Modules & Pages</h2>
              <ModulesPagesTab />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Admin AI Doctor Sessions Tab ────────────────────────────────────────────

function AdminDoctorTab() {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { fetchSessions() }, [filter])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const params = filter ? `?status=${filter}` : ''
      const res = await api.get(`/doctor/admin/sessions${params}`)
      setSessions(Array.isArray(res.data) ? res.data : JSON.parse(res.data))
    } catch { setSessions([]) }
    finally { setLoading(false) }
  }

  const loadDetail = async (sessionId) => {
    try {
      const res = await api.get(`/doctor/admin/sessions/${sessionId}`)
      setSelectedSession(typeof res.data === 'string' ? JSON.parse(res.data) : res.data)
    } catch { /* ignore */ }
  }

  const deleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation()
    if (!confirm(`Delete session #${sessionId} and all its messages?`)) return
    try {
      await api.delete(`/doctor/admin/sessions/${sessionId}`)
      if (selectedSession?.session_id === sessionId) setSelectedSession(null)
      fetchSessions()
    } catch { /* ignore */ }
  }

  const cleanupStale = async () => {
    if (!confirm('Delete all sessions with no user messages (stale/empty sessions)?')) return
    try {
      const res = await api.delete('/doctor/admin/sessions/stale')
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      alert(`Cleaned up ${data.deleted || 0} stale session(s)`)
      setSelectedSession(null)
      fetchSessions()
    } catch { alert('Cleanup failed') }
  }

  const statusBadge = (s) => {
    if (s === 'open') return 'bg-green-100 text-green-700'
    if (s === 'resolved') return 'bg-blue-100 text-blue-700'
    if (s === 'escalated') return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">AI Doctor Sessions</h2>
            </div>
            <div className="flex items-center gap-2">
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
                <option value="closed">Closed</option>
              </select>
              <button onClick={cleanupStale}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Clean Stale
              </button>
              <button onClick={fetchSessions}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No AI Doctor sessions found.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <button key={s.session_id} onClick={() => loadDetail(s.session_id)}
                  className={`w-full text-left p-4 rounded-lg border transition hover:shadow-sm ${
                    selectedSession?.session_id === s.session_id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">#{s.session_id}</span>
                      <span className="text-sm text-gray-600 truncate max-w-xs">{s.title || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">GUP {s.gup_id}</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                      <button onClick={(e) => deleteSession(s.session_id, e)}
                        className="p-1 text-gray-300 hover:text-red-500 transition" title="Delete session">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {s.created_at ? new Date(s.created_at).toLocaleString() : ''}
                    {s.closed_at ? ` — Closed: ${new Date(s.closed_at).toLocaleString()}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Detail */}
      {selectedSession && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-900">
                Session #{selectedSession.session_id} — {selectedSession.title || 'Untitled'}
              </h3>
              <button onClick={() => setSelectedSession(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              GUP: {selectedSession.gup_id} | Instance: {selectedSession.instance_id} | Status: {selectedSession.status}
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(selectedSession.messages || []).map((m, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${
                  m.role === 'user' ? 'bg-emerald-50 border border-emerald-200' :
                  m.role === 'command' ? 'bg-gray-900 text-gray-300 font-mono text-xs' :
                  m.role === 'assistant' ? 'bg-gray-50 border border-gray-200' :
                  'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {m.role === 'command' ? <Terminal className="w-3 h-3 text-green-400" /> : null}
                    <span className="text-xs font-semibold uppercase opacity-60">{m.role}</span>
                    <span className="text-xs opacity-40">{m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.command_executed && (
                    <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono">
                      $ {m.command_executed}
                      {m.command_output && <pre className="mt-1 text-gray-400 whitespace-pre-wrap">{m.command_output.slice(0, 2000)}</pre>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
