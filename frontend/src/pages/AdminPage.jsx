import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, Code, LogOut, User, CreditCard, Activity, Users, BarChart3,
  Search, ChevronLeft, ChevronRight, Globe, Cpu, Circle, DollarSign,
  Shield, Loader2, RefreshCw, LayoutDashboard, ExternalLink, Landmark, Mail
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
                          </tr>
                        ))}
                        {customers.length === 0 && (
                          <tr><td colSpan={5} className="py-8 text-center text-gray-400">No customers found</td></tr>
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

export default AdminPage
