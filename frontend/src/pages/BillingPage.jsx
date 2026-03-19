import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, Code, LogOut, User, CreditCard, Activity, Bell,
  Check, Loader2, ArrowLeft, Sparkles, Cpu, HardDrive, Zap, X,
  Receipt, Calendar, DollarSign, Crown, AlertTriangle, ShieldOff, Clock, Shield
} from 'lucide-react'
import api from '../api/config'

function BillingPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [hasActive, setHasActive] = useState(false)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [activeTab, setActiveTab] = useState('plans')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { navigate('/login'); return }
    setUser(JSON.parse(userData))
    fetchAll()
  }, [navigate])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [plansRes, subRes, histRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription'),
        api.get('/billing/history'),
      ])
      setPlans(plansRes.data)
      setSubscription(subRes.data.subscription)
      setHasActive(subRes.data.active)
      setHistory(histRes.data)
    } catch (err) {
      console.error('Failed to load billing data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId) => {
    setActionLoading(planId)
    try {
      await api.post('/billing/subscribe', { planId })
      await fetchAll()
      setActiveTab('subscription')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to subscribe')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return
    setActionLoading('cancel')
    try {
      await api.post('/billing/cancel')
      await fetchAll()
      setActiveTab('plans')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel')
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

  const navItems = [
    { icon: Activity, label: 'Overview', path: '/dashboard' },
    { icon: Server, label: 'My Servers', path: '/dashboard' },
    { icon: Code, label: 'AI Assistant', path: '/ai' },
    { icon: CreditCard, label: 'Billing', path: '/billing', active: true },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'Profile', path: '/dashboard' },
  ]

  const planHighlight = { 'AI Pro': true }
  const planIcons = {
    'Starter': HardDrive,
    'AI Basic': Zap,
    'AI Pro': Crown,
    'AI Unlimited': Sparkles,
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
        {/* Impersonation Banner */}
        {localStorage.getItem('impersonating') === 'true' && (
          <div className="-mt-4 mb-6 mx-0 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <Shield className="w-4 h-4" />
              <span>You are viewing as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.username})</span>
            </div>
            <button
              onClick={() => {
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
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Admin
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your plan, view payment history.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-8 shadow-sm">
          {[
            { id: 'plans', label: 'Plans' },
            { id: 'subscription', label: 'My Subscription' },
            { id: 'history', label: 'Payment History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Plans Tab */}
            {activeTab === 'plans' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => {
                  const isHighlight = planHighlight[plan.planName]
                  const Icon = planIcons[plan.planName] || Server
                  const isCurrentPlan = hasActive && subscription?.planId === plan.planId
                  return (
                    <div
                      key={plan.planId}
                      className={`relative bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition hover:shadow-lg ${
                        isHighlight ? 'border-accent-400' : 'border-gray-200'
                      }`}
                    >
                      {isHighlight && (
                        <div className="absolute top-0 right-0 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                          POPULAR
                        </div>
                      )}
                      <div className={`h-2 bg-gradient-to-r ${
                        isHighlight ? 'from-accent-500 to-temco-500' : 'from-primary-400 to-primary-600'
                      }`} />
                      <div className="p-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                          isHighlight ? 'bg-accent-50' : 'bg-primary-50'
                        }`}>
                          <Icon className={`w-6 h-6 ${isHighlight ? 'text-accent-500' : 'text-primary-500'}`} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{plan.planName}</h3>
                        <div className="flex items-baseline gap-1 mt-2 mb-4">
                          <span className="text-3xl font-bold text-gray-900">${plan.priceMonthly}</span>
                          <span className="text-gray-500 text-sm">/month</span>
                        </div>
                        <div className="space-y-3 mb-6 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Cpu className="w-4 h-4 text-primary-400" />
                            <span>{plan.vcpu} vCPUs / {plan.ramGb} GB RAM</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Server className="w-4 h-4 text-primary-400" />
                            <span>Contabo {plan.contaboProductId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Sparkles className="w-4 h-4 text-accent-400" />
                            <span>{plan.aiRequestsLimit > 0 ? `${plan.aiRequestsLimit.toLocaleString()} AI requests/mo` : 'No AI requests'}</span>
                          </div>
                        </div>
                        {isCurrentPlan ? (
                          <div className="w-full py-2.5 bg-green-50 border border-green-200 text-green-600 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" /> Current Plan
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSubscribe(plan.planId)}
                            disabled={actionLoading === plan.planId || hasActive}
                            className={`w-full py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 ${
                              isHighlight
                                ? 'bg-gradient-to-r from-accent-500 to-temco-500 hover:from-accent-600 hover:to-temco-600 text-white'
                                : 'bg-primary-500 hover:bg-primary-600 text-white'
                            }`}
                          >
                            {actionLoading === plan.planId ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : hasActive ? 'Cancel current first' : 'Select Plan'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="max-w-2xl">
                {subscription ? (
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${
                      subscription.status === 'pending_payment' ? 'from-amber-400 to-amber-500' :
                      subscription.status === 'grace' ? 'from-orange-400 to-orange-500' :
                      subscription.status === 'suspended' ? 'from-red-400 to-red-600' :
                      subscription.status === 'expired' ? 'from-gray-400 to-gray-500' :
                      'from-green-400 to-green-600'
                    }`} />
                    <div className="p-8">
                      {subscription.status === 'pending_payment' && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
                            <Activity className="w-4 h-4" /> Payment Pending
                          </div>
                          <p className="text-xs text-amber-600 mb-3">
                            Your subscription is created but awaiting payment. Please upload your bank slip to activate your plan.
                          </p>
                          <button
                            onClick={() => navigate('/payment')}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition"
                          >
                            Upload Bank Slip
                          </button>
                        </div>
                      )}

                      {subscription.status === 'grace' && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                          <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-1">
                            <AlertTriangle className="w-4 h-4" /> Grace Period — Action Required
                          </div>
                          <p className="text-xs text-orange-600 mb-2">
                            Your subscription has expired. You have until <strong>{subscription.graceEndDate}</strong> to renew before your server is suspended.
                          </p>
                          <p className="text-xs text-orange-500">
                            Please contact support to process a renewal payment immediately.
                          </p>
                        </div>
                      )}

                      {subscription.status === 'suspended' && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                          <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
                            <ShieldOff className="w-4 h-4" /> Subscription Suspended
                          </div>
                          <p className="text-xs text-red-600 mb-2">
                            Your subscription has been suspended due to non-renewal. Your server has been stopped.
                          </p>
                          <p className="text-xs text-red-500">
                            Contact support to renew your subscription and restore server access. Your data is preserved.
                          </p>
                        </div>
                      )}

                      {subscription.status === 'expired' && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-300 rounded-xl">
                          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm mb-1">
                            <Clock className="w-4 h-4" /> Subscription Expired
                          </div>
                          <p className="text-xs text-gray-600">
                            Your subscription has expired. Please subscribe to a new plan to continue using TemcoServers.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            subscription.status === 'pending_payment' ? 'bg-amber-50' :
                            subscription.status === 'grace' ? 'bg-orange-50' :
                            subscription.status === 'suspended' ? 'bg-red-50' :
                            subscription.status === 'expired' ? 'bg-gray-100' :
                            'bg-green-50'
                          }`}>
                            <CreditCard className={`w-6 h-6 ${
                              subscription.status === 'pending_payment' ? 'text-amber-500' :
                              subscription.status === 'grace' ? 'text-orange-500' :
                              subscription.status === 'suspended' ? 'text-red-500' :
                              subscription.status === 'expired' ? 'text-gray-400' :
                              'text-green-500'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{subscription.planName}</h3>
                            {subscription.status === 'active' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            )}
                            {subscription.status === 'pending_payment' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Activity className="w-3 h-3" /> Pending Payment
                              </span>
                            )}
                            {subscription.status === 'grace' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Grace Period
                              </span>
                            )}
                            {subscription.status === 'suspended' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                <ShieldOff className="w-3 h-3" /> Suspended
                              </span>
                            )}
                            {subscription.status === 'expired' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Expired
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">${subscription.priceMonthly}</div>
                          <div className="text-xs text-gray-500">/month</div>
                        </div>
                      </div>

                      <div className={`grid ${subscription.status === 'grace' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'} gap-4 mb-8`}>
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="text-xs text-gray-500 mb-1">Start Date</div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary-400" />
                            {subscription.startDate}
                          </div>
                        </div>
                        {subscription.endDate && (
                          <div className={`p-4 rounded-xl ${
                            subscription.status === 'grace' || subscription.status === 'suspended' ? 'bg-red-50' : 'bg-gray-50'
                          }`}>
                            <div className="text-xs text-gray-500 mb-1">{subscription.status === 'active' ? 'Renewal Date' : 'Expired On'}</div>
                            <div className={`text-sm font-medium flex items-center gap-1.5 ${
                              subscription.status === 'grace' || subscription.status === 'suspended' ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {subscription.endDate}
                            </div>
                          </div>
                        )}
                        {subscription.status === 'grace' && subscription.graceEndDate && (
                          <div className="p-4 bg-orange-50 rounded-xl">
                            <div className="text-xs text-orange-500 mb-1">Suspend Date</div>
                            <div className="text-sm font-medium text-orange-700 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {subscription.graceEndDate}
                            </div>
                          </div>
                        )}
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="text-xs text-gray-500 mb-1">AI Requests</div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                            {subscription.aiRequestsLimit > 0 ? `${subscription.aiRequestsLimit.toLocaleString()}/mo` : 'None'}
                          </div>
                        </div>
                      </div>

                      {(subscription.status === 'active' || subscription.status === 'pending_payment') && (
                        <button
                          onClick={handleCancel}
                          disabled={actionLoading === 'cancel'}
                          className="flex items-center gap-2 px-4 py-2 text-sm border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Cancel Subscription
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                    <p className="text-sm text-gray-500 mb-6">Choose a plan to get started with TemcoServers.</p>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition"
                    >
                      View Plans
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Payment History Tab */}
            {activeTab === 'history' && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary-400 to-accent-500" />
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment History</h2>
                  {history.length === 0 ? (
                    <div className="py-12 text-center">
                      <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No payment history yet.</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Description</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.referenceId}</td>
                            <td className="py-3 px-4 text-gray-700">{item.description}</td>
                            <td className="py-3 px-4 text-gray-500">{item.date}</td>
                            <td className="py-3 px-4">
                              <span className="text-xs font-medium bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                                {item.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-gray-900">
                              <span className="flex items-center justify-end gap-1">
                                <DollarSign className="w-3 h-3 text-green-500" />
                                {item.totalPaid?.toFixed(2) || '0.00'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                item.isCompleted ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
                              }`}>
                                {item.isCompleted ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default BillingPage
