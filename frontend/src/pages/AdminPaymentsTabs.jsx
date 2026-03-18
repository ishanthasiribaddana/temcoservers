import { useState, useEffect } from 'react'
import {
  Loader2, Check, X, Eye, ExternalLink, RefreshCw, Server,
  CreditCard, Clock, AlertCircle, CheckCircle, XCircle, Globe, FileText
} from 'lucide-react'
import api from '../api/config'

// =========================================================================
// Payments Tab — Admin reviews pending bank slip payments
// =========================================================================
export function PaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedSlip, setSelectedSlip] = useState(null)
  const [approveModal, setApproveModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [provisionServer, setProvisionServer] = useState(true)
  const [result, setResult] = useState(null)

  useEffect(() => { fetchPending() }, [])

  const fetchPending = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/payments/pending')
      setPayments(res.data)
    } catch (err) {
      console.error('Failed to load pending payments', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (voucherVid) => {
    setActionLoading(voucherVid)
    setResult(null)
    try {
      const res = await api.post(`/admin/payments/${voucherVid}/approve`, {
        notes: notes || null,
        provisionServer,
      })
      setResult(res.data)
      setApproveModal(null)
      setNotes('')
      await fetchPending()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (voucherVid) => {
    if (!reason.trim()) { alert('Please provide a reason for rejection.'); return }
    setActionLoading(voucherVid)
    try {
      await api.post(`/admin/payments/${voucherVid}/reject`, { reason })
      setRejectModal(null)
      setReason('')
      await fetchPending()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Result banner */}
      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
            <CheckCircle className="w-4 h-4" /> {result.message}
          </div>
          {result.serverProvisioned && (
            <div className="text-green-600 text-xs mt-1">
              Server provisioned — Contabo ID: {result.contaboInstanceId}, IP: {result.serverIp || 'pending'}
            </div>
          )}
          {result.provisionError && (
            <div className="text-amber-600 text-xs mt-1">
              Server provisioning failed: {result.provisionError} (subscription still activated)
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pending Payments</h2>
          <p className="text-xs text-gray-500 mt-0.5">{payments.length} payment(s) awaiting verification</p>
        </div>
        <button onClick={fetchPending} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-500">No pending payments to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div key={p.voucherVid} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-gray-900">{p.customerName}</span>
                      <span className="text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{p.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">Amount Paid</span>
                        <div className="font-bold text-gray-900 text-sm">LKR {p.amount?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Date</span>
                        <div className="font-medium text-gray-700">{p.date}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Bank Ref</span>
                        <div className="font-mono font-medium text-gray-700">{p.bankReference || '—'}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Voucher</span>
                        <div className="font-mono font-medium text-gray-500 text-[10px]">{p.voucherId}</div>
                      </div>
                    </div>

                    {/* Exchange rate & difference info */}
                    {p.planPriceUsd && (
                      <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Plan Price</span>
                            <div className="font-medium text-gray-700">${p.planPriceUsd}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Rate</span>
                            <div className="font-medium text-gray-700">LKR {p.exchangeRate}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Expected</span>
                            <div className="font-medium text-gray-700">LKR {p.expectedAmountLkr?.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Paid</span>
                            <div className="font-medium text-gray-700">LKR {p.paidAmountLkr?.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Difference</span>
                            {p.differenceAmountLkr === 0 || !p.differenceAmountLkr ? (
                              <div className="font-medium text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Exact</div>
                            ) : p.differenceAmountLkr > 0 ? (
                              <div className="font-medium text-blue-600">+LKR {p.differenceAmountLkr?.toLocaleString()} <span className="text-blue-400">(credit)</span></div>
                            ) : (
                              <div className="font-medium text-red-600">-LKR {Math.abs(p.differenceAmountLkr)?.toLocaleString()} <span className="text-red-400">(owing)</span></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slip preview */}
                  <div className="ml-4 flex flex-col items-end gap-2">
                    {p.slipUrl ? (
                      <button
                        onClick={() => setSelectedSlip(p.slipUrl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-50 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-100 transition"
                      >
                        <Eye className="w-3 h-3" /> View Slip
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No slip uploaded</span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => { setApproveModal(p); setNotes(''); setProvisionServer(true) }}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve & Activate
                  </button>
                  <button
                    onClick={() => { setRejectModal(p); setReason('') }}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slip Viewer Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSlip(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Bank Slip</h3>
              <button onClick={() => setSelectedSlip(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <img src={selectedSlip} alt="Bank Slip" className="w-full rounded-lg" onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<p class="text-center text-gray-400 py-8">Unable to load slip image</p>' }} />
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setApproveModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Approve Payment</h3>
                  <p className="text-xs text-gray-500">{approveModal.customerName} — LKR {approveModal.amount?.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Admin Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Verified with NTB statement"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionServer}
                    onChange={(e) => setProvisionServer(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Provision Contabo Server</div>
                    <div className="text-xs text-gray-500">Automatically create a VPS for this customer</div>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => handleApprove(approveModal.voucherVid)}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                >
                  {actionLoading === approveModal.voucherVid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm Approval
                </button>
                <button
                  onClick={() => setApproveModal(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Reject Payment</h3>
                  <p className="text-xs text-gray-500">{rejectModal.customerName} — LKR {rejectModal.amount?.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Reason for Rejection *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Amount does not match, slip is unreadable, payment not found in bank statement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => handleReject(rejectModal.voucherVid)}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                >
                  {actionLoading === rejectModal.voucherVid ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Confirm Rejection
                </button>
                <button
                  onClick={() => setRejectModal(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// Subscriptions Tab — Admin views all subscriptions
// =========================================================================
export function SubscriptionsTab() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchSubs() }, [])

  const fetchSubs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/subscriptions')
      setSubs(res.data)
    } catch (err) {
      console.error('Failed to load subscriptions', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredSubs = filter === 'all' ? subs : subs.filter(s => s.status === filter)

  const statusBadge = (status) => {
    const map = {
      active: 'bg-green-50 text-green-600 border-green-200',
      pending_payment: 'bg-amber-50 text-amber-600 border-amber-200',
      cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
      rejected: 'bg-red-50 text-red-500 border-red-200',
    }
    return map[status] || 'bg-gray-100 text-gray-500 border-gray-200'
  }

  const statusIcon = (status) => {
    if (status === 'active') return <CheckCircle className="w-3 h-3" />
    if (status === 'pending_payment') return <Clock className="w-3 h-3" />
    if (status === 'rejected') return <XCircle className="w-3 h-3" />
    return <AlertCircle className="w-3 h-3" />
  }

  const statusCounts = {
    all: subs.length,
    active: subs.filter(s => s.status === 'active').length,
    pending_payment: subs.filter(s => s.status === 'pending_payment').length,
    cancelled: subs.filter(s => s.status === 'cancelled').length,
    rejected: subs.filter(s => s.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">All Subscriptions</h2>
        <button onClick={fetchSubs} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6 shadow-sm">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'pending_payment', label: 'Pending' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'rejected', label: 'Rejected' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 ${
              filter === tab.id
                ? 'bg-accent-500 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              filter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {statusCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {filteredSubs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No subscriptions found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-accent-500 to-temco-500" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Server</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Start</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">End</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s) => (
                  <tr key={s.subscriptionId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{s.customerName}</div>
                      <div className="text-xs text-gray-400">GUP: {s.gupId}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">{s.planName}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">${s.priceMonthly}/mo</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge(s.status)}`}>
                        {statusIcon(s.status)}
                        {s.status === 'pending_payment' ? 'Pending' : s.status}
                      </span>
                      {s.rejectReason && (
                        <div className="text-[10px] text-red-400 mt-0.5 max-w-[200px] truncate" title={s.rejectReason}>
                          {s.rejectReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.serverIp ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Globe className="w-3 h-3 text-green-500" />
                          <span className="font-mono text-gray-700">{s.serverIp}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">{s.startDate || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{s.endDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
