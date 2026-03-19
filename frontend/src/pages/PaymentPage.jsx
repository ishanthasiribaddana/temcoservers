import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Landmark, Upload, CheckCircle, ArrowLeft, Copy, FileText,
  User, Hash, Calendar, DollarSign, Package, AlertCircle, Loader2,
  CreditCard, Globe
} from 'lucide-react'
import api from '../api/config'

const bankAccounts = [
  {
    bank: 'Nations Trust Bank',
    branch: 'Nawala',
    accountNo: '100270013028',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  {
    bank: 'Sampath Bank',
    branch: 'Gangodawila',
    accountNo: '013510007411',
    color: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
  {
    bank: 'Commercial Bank',
    branch: 'Reid Avenue',
    accountNo: '8021668995',
    color: 'from-green-600 to-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
  },
]

const plans = [
  { value: 'starter', label: 'Starter — $4/month', usd: 4 },
  { value: 'ai-basic', label: 'AI Basic — $8/month', usd: 8 },
  { value: 'ai-pro', label: 'AI Pro — $15/month', usd: 15 },
  { value: 'ai-unlimited', label: 'AI Unlimited — $25/month', usd: 25 },
]

function PaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedPlan = searchParams.get('plan') || ''
  const preselectedPlanId = searchParams.get('planId') || ''

  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [invoiceUrl, setInvoiceUrl] = useState(null)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank') // 'bank' or 'paypal'
  const [paypalReady, setPaypalReady] = useState(false)
  const [paypalClientId, setPaypalClientId] = useState(null)
  const [paypalConfigured, setPaypalConfigured] = useState(false)
  const [paypalResult, setPaypalResult] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState(preselectedPlanId ? parseInt(preselectedPlanId) : 0)
  const [lkrRate, setLkrRate] = useState(null)
  const paypalContainerRef = useRef(null)

  const [form, setForm] = useState({
    purchaserName: '',
    referenceNo: '',
    amount: '',
    product: preselectedPlan,
    file: null,
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { navigate('/login'); return }
    const parsed = JSON.parse(userData)
    setUser(parsed)
    setForm(prev => ({
      ...prev,
      purchaserName: `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim(),
    }))

    // Fetch LKR exchange rate
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data.result === 'success' && data.rates?.LKR) {
          setLkrRate(Math.round(data.rates.LKR * 1.02)) // ~2% markup for bank selling rate
        }
      })
      .catch(() => {})

    // Check if PayPal is configured
    api.get('/billing/paypal/client-id').then(res => {
      if (res.data?.configured) {
        setPaypalConfigured(true)
        setPaypalClientId(res.data.clientId)
      }
    }).catch(() => {})
  }, [navigate])

  // Load PayPal SDK when method switches to paypal
  const loadPayPalSdk = useCallback(() => {
    if (!paypalClientId || document.getElementById('paypal-sdk')) {
      if (window.paypal) setPaypalReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'paypal-sdk'
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`
    script.onload = () => setPaypalReady(true)
    document.body.appendChild(script)
  }, [paypalClientId])

  useEffect(() => {
    if (paymentMethod === 'paypal' && paypalClientId) {
      loadPayPalSdk()
    }
  }, [paymentMethod, paypalClientId, loadPayPalSdk])

  // Render PayPal buttons when SDK is ready
  useEffect(() => {
    if (!paypalReady || paymentMethod !== 'paypal' || !paypalContainerRef.current || !selectedPlanId) return
    // Clear previous buttons
    paypalContainerRef.current.innerHTML = ''
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
      createOrder: async () => {
        setError('')
        const res = await api.post('/billing/paypal/create-order', {
          planId: selectedPlanId,
          returnUrl: window.location.origin + '/payment?status=success',
          cancelUrl: window.location.origin + '/payment?status=cancel',
        })
        return res.data.orderId
      },
      onApprove: async (data) => {
        setSubmitting(true)
        setError('')
        try {
          const res = await api.post('/billing/paypal/capture', {
            orderId: data.orderID,
            planId: selectedPlanId,
          })
          setPaypalResult(res.data)
          setSubmitted(true)
        } catch (err) {
          setError(err.response?.data?.error || 'PayPal payment failed')
        } finally {
          setSubmitting(false)
        }
      },
      onError: (err) => {
        setError('PayPal payment failed. Please try again.')
        console.error('PayPal error', err)
      },
    }).render(paypalContainerRef.current)
  }, [paypalReady, paymentMethod, selectedPlanId])

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let { width, height } = img
        // Scale down until estimated size fits under MAX_FILE_SIZE
        const scaleFactor = Math.min(1, Math.sqrt(MAX_FILE_SIZE / file.size) * 0.9)
        width = Math.round(width * scaleFactor)
        height = Math.round(height * scaleFactor)
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            resolve(compressed)
          },
          'image/jpeg',
          0.8
        )
      }
      img.src = url
    })
  }

  const handleFileChange = async (e) => {
    let file = e.target.files[0]
    if (!file) return
    setError('')
    // Auto-compress images that exceed the max size
    if (file.size > MAX_FILE_SIZE && file.type.startsWith('image/')) {
      try {
        file = await compressImage(file)
      } catch {
        setError('Failed to compress image. Please upload a smaller file.')
        return
      }
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB. Please upload a smaller file or lower-resolution image.')
      return
    }
    setForm(prev => ({ ...prev, file }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.purchaserName || !form.referenceNo || !form.amount || !form.product || !form.file) {
      setError('Please fill in all fields and upload your bank slip.')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('purchaserName', form.purchaserName)
      formData.append('referenceNo', form.referenceNo)
      formData.append('amount', form.amount)
      formData.append('product', form.product)
      formData.append('timestamp', new Date().toISOString())
      formData.append('slip', form.file)
      // Send exchange rate and expected amount for accounting
      const selectedPlan = plans.find(p => p.value === form.product)
      if (selectedPlan && lkrRate) {
        const expectedLkr = Math.round(selectedPlan.usd * lkrRate)
        formData.append('expectedAmountLkr', String(expectedLkr))
        formData.append('planPriceUsd', String(selectedPlan.usd))
        formData.append('exchangeRate', String(lkrRate))
        formData.append('differenceAmountLkr', String(parseFloat(form.amount || 0) - expectedLkr))
      }

      const res = await api.post('/billing/upload-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.invoiceUrl) setInvoiceUrl(res.data.invoiceUrl)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  if (submitted) {
    const isPayPal = !!paypalResult
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isPayPal ? 'bg-green-100' : 'bg-green-100'
          }`}>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isPayPal ? 'Payment Successful!' : 'Payment Slip Submitted'}
          </h2>
          <p className="text-gray-500 mb-6">
            {isPayPal
              ? 'Your PayPal payment has been confirmed and your subscription is now active!'
              : 'Your bank slip has been received. Our team will verify the payment and activate your plan within 24 hours.'}
          </p>
          {isPayPal ? (
            <div className="text-xs text-gray-500 space-y-1 mb-6">
              <div>PayPal Order: <span className="font-mono font-medium text-gray-700">{paypalResult.orderId}</span></div>
              <div>Amount: <span className="font-medium text-gray-700">${paypalResult.amount}</span></div>
              {paypalResult.payerEmail && <div>Payer: <span className="font-medium text-gray-700">{paypalResult.payerEmail}</span></div>}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-4">
                Reference: <span className="font-mono font-medium text-gray-600">{form.referenceNo}</span>
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-6">
                Verification is pending and may take up to 24 hours as we reconcile with bank statements.
              </p>
            </>
          )}
          <div className="flex flex-col gap-3">
            {isPayPal && paypalResult.receiptUrl && (
              <a
                href={paypalResult.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg font-semibold transition"
              >
                <FileText className="w-4 h-4" />
                Download Receipt
              </a>
            )}
            {!isPayPal && invoiceUrl && (
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition"
              >
                <FileText className="w-4 h-4" />
                Download Invoice
              </a>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary-500 transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Make a Payment</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Payment Method Toggle */}
        {paypalConfigured && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Choose Payment Method</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentMethod('bank')}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  paymentMethod === 'bank'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Landmark className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-primary-500' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`text-sm font-bold ${paymentMethod === 'bank' ? 'text-primary-700' : 'text-gray-700'}`}>Bank Transfer</div>
                  <div className="text-xs text-gray-500">Transfer to our bank account & upload slip</div>
                </div>
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  paymentMethod === 'paypal'
                    ? 'border-[#0070ba] bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Globe className={`w-6 h-6 ${paymentMethod === 'paypal' ? 'text-[#0070ba]' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`text-sm font-bold ${paymentMethod === 'paypal' ? 'text-[#0070ba]' : 'text-gray-700'}`}>PayPal</div>
                  <div className="text-xs text-gray-500">Pay instantly with PayPal (USD)</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* PayPal Section */}
        {paymentMethod === 'paypal' && paypalConfigured && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#0070ba]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pay with PayPal</h2>
                <p className="text-xs text-gray-500">Instant payment — your subscription activates immediately</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Plan Selection for PayPal */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Package className="w-4 h-4 text-gray-400" /> Select Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0070ba] focus:border-transparent bg-white"
                required
              >
                <option value="0">Choose a plan</option>
                {plans.map((p, i) => (
                  <option key={i} value={i + 1}>{p.label}</option>
                ))}
              </select>
            </div>

            {selectedPlanId > 0 ? (
              <div>
                {submitting && (
                  <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing PayPal payment...
                  </div>
                )}
                <div ref={paypalContainerRef} className={submitting ? 'opacity-30 pointer-events-none' : ''} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Please select a plan above to continue with PayPal
              </div>
            )}
          </div>
        )}

        {/* Bank Transfer Details */}
        {paymentMethod === 'bank' && (
        <>
        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bank Transfer Details</h2>
          <p className="text-sm text-gray-500 mb-6">
            Transfer your payment to any of the following bank accounts, then upload your bank slip below.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {bankAccounts.map((acc, i) => (
              <div key={i} className={`rounded-xl overflow-hidden border ${acc.border} bg-white shadow-sm`}>
                <div className={`h-1.5 bg-gradient-to-r ${acc.color}`} />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark className={`w-5 h-5 ${acc.text}`} />
                    <span className={`font-bold text-sm ${acc.text}`}>{acc.bank}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs">Account No</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-800 tracking-wide">{acc.accountNo}</span>
                        <button
                          onClick={() => handleCopy(acc.accountNo, i)}
                          className="p-1 hover:bg-gray-100 rounded transition"
                          title="Copy"
                        >
                          {copied === i ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Branch</span>
                      <div className="font-medium text-gray-700">{acc.branch}</div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Account Name</span>
                      <div className="font-medium text-gray-700 text-xs">Java Institute Holdings (Pvt) Ltd</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Bank Slip</h2>
          <p className="text-sm text-gray-500 mb-6">
            After making the transfer, fill in the details below and upload a photo or screenshot of your bank slip.
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Plan (first — drives amount calculation) */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Package className="w-4 h-4 text-gray-400" /> Plan
                </label>
                <select
                  value={form.product}
                  onChange={(e) => {
                    const selected = plans.find(p => p.value === e.target.value)
                    const expectedLkr = selected && lkrRate ? Math.round(selected.usd * lkrRate) : ''
                    setForm(prev => ({ ...prev, product: e.target.value, amount: expectedLkr ? String(expectedLkr) : prev.amount }))
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}{lkrRate ? ` ≈ LKR ${(p.usd * lkrRate).toLocaleString()}` : ''}</option>
                  ))}
                </select>
                {form.product && lkrRate && (() => {
                  const selected = plans.find(p => p.value === form.product)
                  return selected ? (
                    <div className="mt-1.5 text-xs text-gray-500">
                      ${selected.usd} × LKR {lkrRate} = <span className="font-semibold text-gray-700">LKR {(selected.usd * lkrRate).toLocaleString()}</span>
                      <span className="text-gray-400 ml-1">(market rate + ~2%)</span>
                    </div>
                  ) : null
                })()}
              </div>

              {/* Purchaser Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <User className="w-4 h-4 text-gray-400" /> Purchaser Name
                </label>
                <input
                  type="text"
                  value={form.purchaserName}
                  onChange={(e) => setForm(prev => ({ ...prev, purchaserName: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Amount (LKR) — pre-filled from plan, editable */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <DollarSign className="w-4 h-4 text-gray-400" /> Amount Paid (LKR)
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder={form.product && lkrRate ? `Expected: LKR ${Math.round(plans.find(p => p.value === form.product)?.usd * lkrRate || 0)}` : 'Select a plan first'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  min="1"
                />
                {/* Overpayment / Underpayment indicator */}
                {form.product && form.amount && lkrRate && (() => {
                  const selected = plans.find(p => p.value === form.product)
                  if (!selected) return null
                  const expected = Math.round(selected.usd * lkrRate)
                  const paid = parseFloat(form.amount) || 0
                  const diff = paid - expected
                  if (diff === 0) return (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" /> Exact match
                    </div>
                  )
                  if (diff > 0) return (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-blue-600">
                      <AlertCircle className="w-3.5 h-3.5" /> +LKR {diff.toLocaleString()} overpayment — credit applied to next billing
                    </div>
                  )
                  return (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" /> -LKR {Math.abs(diff).toLocaleString()} underpayment — balance due on next billing
                    </div>
                  )
                })()}
              </div>

              {/* Reference Number */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Hash className="w-4 h-4 text-gray-400" /> Reference Number
                </label>
                <input
                  type="text"
                  value={form.referenceNo}
                  onChange={(e) => setForm(prev => ({ ...prev, referenceNo: e.target.value }))}
                  placeholder="Bank transaction reference"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Date (auto) */}
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2.5">
              <Calendar className="w-4 h-4" />
              Submission date: <span className="font-medium text-gray-600">{new Date().toLocaleString()}</span>
              <span className="text-gray-300">(auto-recorded)</span>
            </div>

            {/* File Upload */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <FileText className="w-4 h-4 text-gray-400" /> Bank Slip
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="slip-upload"
                />
                <label
                  htmlFor="slip-upload"
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl py-8 cursor-pointer transition ${
                    form.file
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50'
                  }`}
                >
                  {form.file ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                      <span className="text-sm font-medium text-green-700">{form.file.name}</span>
                      <span className="text-xs text-green-500 mt-1">
                        {(form.file.size / 1024).toFixed(1)} KB — Click to change
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-600">Click to upload bank slip</span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG, or PDF — Max 5MB</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-lg font-bold text-sm transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Submit Payment Slip
                </>
              )}
            </button>
          </form>
        </div>
        </>
        )}
      </div>
    </div>
  )
}

export default PaymentPage
