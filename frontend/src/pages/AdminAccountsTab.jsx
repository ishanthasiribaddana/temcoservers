import { useState, useEffect } from 'react'
import {
  Loader2, RefreshCw, TrendingUp, TrendingDown, DollarSign, Landmark,
  ArrowUpRight, ArrowDownRight, Minus, FileText, Clock, CheckCircle,
  ChevronDown, BarChart3, Wallet, PiggyBank, AlertCircle, ExternalLink
} from 'lucide-react'
import api from '../api/config'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function AccountsFinanceTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterYear, setFilterYear] = useState(null)
  const [filterMonth, setFilterMonth] = useState(null)
  const [contaboPayable, setContaboPayable] = useState(null)
  const [pricingTiers, setPricingTiers] = useState(null)

  const fetchPricingTiers = async () => {
    try {
      const res = await api.get('/admin/accounts/pricing-tiers')
      setPricingTiers(res.data)
    } catch (err) {
      console.error('Failed to load pricing tiers:', err)
    }
  }

  const fetchContaboPayable = async () => {
    try {
      const res = await api.get('/admin/accounts/contabo-payable')
      setContaboPayable(res.data)
    } catch (err) {
      console.error('Failed to load Contabo payable:', err)
    }
  }

  const fetchPL = async (year, month) => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (year) params.year = year
      if (month) params.month = month
      const res = await api.get('/admin/accounts/profit-loss', { params })
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPL(filterYear, filterMonth); fetchContaboPayable(); fetchPricingTiers() }, [filterYear, filterMonth])

  const fmt = (n) => {
    if (n == null) return '—'
    return 'LKR ' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => fetchPL(filterYear, filterMonth)} className="mt-3 px-4 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const profitColor = data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
  const profitBg = data.netProfit >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'

  // Find max revenue in monthly trend for bar chart scaling
  const maxMonthly = Math.max(
    ...((data.monthlyTrend || []).map(m => Math.max(m.revenue || 0, m.expenses || 0))),
    1
  )

  return (
    <div>
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Accounts & Finance</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Profit & Loss Statement
            {filterYear ? ` — ${filterYear}` : ' — All Time'}
            {filterMonth ? ` ${MONTHS[filterMonth]}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterYear || ''}
            onChange={(e) => { setFilterYear(e.target.value ? parseInt(e.target.value) : null); if (!e.target.value) setFilterMonth(null) }}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {filterYear && (
            <select
              value={filterMonth || ''}
              onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none"
            >
              <option value="">All Months</option>
              {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          )}
          <button
            onClick={() => fetchPL(filterYear, filterMonth)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: fmt(data.totalRevenue), icon: TrendingUp, gradient: 'from-green-500 to-green-600', text: 'text-green-700' },
          { label: 'Total Expenses', value: fmt(data.totalExpenses), icon: TrendingDown, gradient: 'from-red-400 to-red-500', text: 'text-red-600' },
          { label: 'Net Profit', value: fmt(data.netProfit), icon: data.netProfit >= 0 ? ArrowUpRight : ArrowDownRight, gradient: profitBg, text: profitColor },
          { label: 'Total Vouchers', value: data.totalVouchers?.toLocaleString(), icon: FileText, gradient: 'from-primary-500 to-primary-600', text: 'text-primary-700' },
          { label: 'Pending Review', value: data.pendingVouchers?.toLocaleString(), icon: Clock, gradient: 'from-amber-400 to-amber-500', text: 'text-amber-700' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{card.label}</span>
                <div className={`w-8 h-8 bg-gradient-to-br ${card.gradient} rounded-lg flex items-center justify-center`}>
                  <card.icon className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className={`text-xl font-bold ${card.text}`}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-green-400 to-green-600" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-semibold text-gray-900">Revenue</h3>
              <span className="ml-auto text-sm font-bold text-green-600">{fmt(data.totalRevenue)}</span>
            </div>
            {(data.revenue || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No revenue recorded</p>
            ) : (
              <div className="space-y-2">
                {data.revenue.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-green-50 border border-green-100 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{r.subAccountName || r.accountName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{r.subAccountCode || r.accountCode}</div>
                    </div>
                    <div className="text-sm font-bold text-green-700">{fmt(r.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-400 to-red-500" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-semibold text-gray-900">Expenses</h3>
              <span className="ml-auto text-sm font-bold text-red-600">{fmt(data.totalExpenses)}</span>
            </div>
            {(data.expenses || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No expenses recorded</p>
            ) : (
              <div className="space-y-2">
                {data.expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-red-50 border border-red-100 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{e.accountName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{e.accountCode}</div>
                    </div>
                    <div className="text-sm font-bold text-red-600">{fmt(e.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* P&L Summary Box */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className={`h-1.5 bg-gradient-to-r ${profitBg}`} />
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Profit & Loss Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-600">Total Revenue</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">{fmt(data.totalRevenue)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-600">Less: Total Expenses</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">({fmt(data.totalExpenses)})</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-4 font-bold text-gray-900 text-base">
                    {data.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                  </td>
                  <td className={`py-4 px-4 text-right font-bold text-base ${profitColor}`}>
                    {data.netProfit >= 0 ? '' : '('}{fmt(Math.abs(data.netProfit))}{data.netProfit >= 0 ? '' : ')'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bank Balances (Assets) */}
      {(data.assets || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="h-1.5 bg-gradient-to-r from-primary-500 to-primary-600" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-900">Bank Deposits Received</h3>
              <span className="ml-auto text-sm font-bold text-primary-600">{fmt(data.totalAssets)}</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {data.assets.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-100 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{a.accountName}</div>
                    <div className="text-sm font-bold text-primary-700">{fmt(a.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contabo Payable — Outstanding Balance & Pay Button */}
      {contaboPayable && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="h-1.5 bg-gradient-to-r from-red-400 to-orange-500" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-semibold text-gray-900">Contabo Hosting — Accounts Payable</h3>
              </div>
              <a
                href="https://my.contabo.com/account/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-sm transition"
              >
                Pay Contabo
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-5">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-700">{fmt(contaboPayable.outstandingBalance)}</div>
                <div className="text-xs text-red-600 mt-1">Outstanding Balance</div>
              </div>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-orange-700">{contaboPayable.unsettledCount}</div>
                <div className="text-xs text-orange-600 mt-1">Unsettled Invoices</div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-700">{fmt(contaboPayable.totalSettled)}</div>
                <div className="text-xs text-green-600 mt-1">Total Settled</div>
              </div>
            </div>

            {/* Recent Payable Vouchers */}
            {(contaboPayable.recentPayables || []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Recent Payable Vouchers</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-3 font-semibold text-gray-500">Voucher ID</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-500">Description</th>
                        <th className="text-left py-2 px-3 font-semibold text-gray-500">Date</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-500">Amount</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contaboPayable.recentPayables.map((p, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td className="py-2 px-3 font-mono text-gray-600">{p.voucherId}</td>
                            <td className="py-2 px-3 text-gray-700 max-w-xs truncate">{p.description}</td>
                            <td className="py-2 px-3 text-gray-500">{p.date}</td>
                            <td className="py-2 px-3 text-right font-medium text-red-600">{fmt(p.amount)}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                p.settled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {p.settled ? 'Settled' : 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {(data.monthlyTrend || []).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-accent-500 to-temco-500" />
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-accent-500" />
              <h3 className="text-sm font-semibold text-gray-900">Monthly Trend (Last 12 Months)</h3>
            </div>

            {/* Simple bar chart */}
            <div className="space-y-3">
              {data.monthlyTrend.map((m, i) => {
                const revPct = maxMonthly > 0 ? (m.revenue / maxMonthly) * 100 : 0
                const expPct = maxMonthly > 0 ? (m.expenses / maxMonthly) * 100 : 0
                return (
                  <div key={i} className="group">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-medium text-gray-500 w-16">{MONTHS[m.month]} {m.year}</span>
                      <div className="flex-1">
                        <div className="flex gap-1 items-center h-5">
                          <div
                            className="h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-sm transition-all"
                            style={{ width: `${Math.max(revPct, 1)}%` }}
                            title={`Revenue: ${fmt(m.revenue)}`}
                          />
                        </div>
                        <div className="flex gap-1 items-center h-5 -mt-1">
                          <div
                            className="h-4 bg-gradient-to-r from-red-300 to-red-400 rounded-sm transition-all"
                            style={{ width: `${Math.max(expPct, 0.5)}%` }}
                            title={`Expenses: ${fmt(m.expenses)}`}
                          />
                        </div>
                      </div>
                      <div className="text-right w-36">
                        <span className={`text-xs font-bold ${m.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.netProfit >= 0 ? '+' : ''}{fmt(m.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-sm" />
                Revenue
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 bg-gradient-to-r from-red-300 to-red-400 rounded-sm" />
                Expenses
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Tiers & Margin Analysis — Real Data from API */}
      {pricingTiers && pricingTiers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-8">
          <div className="h-1.5 bg-gradient-to-r from-temco-500 to-primary-500" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-temco-600" />
                <h3 className="text-sm font-semibold text-gray-900">Pricing Tiers & Reseller Margins</h3>
              </div>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Live from ts_ai_usage</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Plan</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Base Price</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">n8n Add-on</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Full Price</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Contabo</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">AI Cost (actual)</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Workflow AI</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Total Cost</th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Net Margin</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingTiers.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-gray-900">{t.planName}</span>
                        <span className="text-[10px] text-gray-400 ml-1.5">({t.contaboProduct})</span>
                        {t.aiRequestsLimit === -1 ? (
                          <span className="text-[9px] ml-1 px-1 py-0.5 bg-temco-100 text-temco-700 rounded">Unlimited</span>
                        ) : t.aiRequestsLimit > 0 ? (
                          <span className="text-[9px] ml-1 px-1 py-0.5 bg-accent-100 text-accent-700 rounded">{t.aiRequestsLimit.toLocaleString()}/mo</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-right text-green-600 font-bold">${t.priceMonthly.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {t.workflowAddonPrice ? (
                          <span className="text-blue-600 font-medium">+${t.workflowAddonPrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-green-700 font-bold">${t.fullPrice.toFixed(2)}/mo</td>
                      <td className="py-2.5 px-3 text-right text-red-500 font-medium">${t.contaboCostUsd.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {t.aiCostAvgMonthly > 0 ? (
                          <div>
                            <span className="text-red-400 font-medium">${t.aiCostAvgMonthly.toFixed(4)}</span>
                            <div className="text-[9px] text-gray-400">{t.aiTotalRequests} req / {t.aiUniqueUsers} user{t.aiUniqueUsers !== 1 ? 's' : ''}</div>
                          </div>
                        ) : (
                          <span className="text-gray-300">$0.00</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {t.workflowAiCostAvg > 0 ? (
                          <div>
                            <span className="text-orange-500 font-medium">${t.workflowAiCostAvg.toFixed(4)}</span>
                            <div className="text-[9px] text-gray-400">{t.workflowAiRequests} wf req</div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-600 font-semibold">${t.totalCostUsd.toFixed(2)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${t.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${t.netMargin.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.marginPct >= 40 ? 'bg-green-100 text-green-700' :
                          t.marginPct >= 20 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{t.marginPct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
