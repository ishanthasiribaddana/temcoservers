import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Landmark, Upload, CheckCircle, ArrowLeft, Copy, FileText,
  User, Hash, Calendar, DollarSign, Package, AlertCircle, Loader2
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
  { value: 'starter', label: 'Starter — $4/month' },
  { value: 'ai-basic', label: 'AI Basic — $8/month' },
  { value: 'ai-pro', label: 'AI Pro — $15/month' },
  { value: 'ai-unlimited', label: 'AI Unlimited — $25/month' },
]

function PaymentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedPlan = searchParams.get('plan') || ''

  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

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
  }, [navigate])

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }
    setError('')
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

      await api.post('/billing/upload-slip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Slip Submitted</h2>
          <p className="text-gray-500 mb-6">
            Your bank slip has been received. Our team will verify the payment and activate your plan within 24 hours.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Reference: <span className="font-mono font-medium text-gray-600">{form.referenceNo}</span>
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition"
          >
            Go to Dashboard
          </button>
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
        {/* Bank Transfer Details */}
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

        {/* Upload Slip Form */}
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

              {/* Amount */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <DollarSign className="w-4 h-4 text-gray-400" /> Amount (LKR)
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. 2500"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  min="1"
                />
              </div>

              {/* Product */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Package className="w-4 h-4 text-gray-400" /> Plan
                </label>
                <select
                  value={form.product}
                  onChange={(e) => setForm(prev => ({ ...prev, product: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
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
      </div>
    </div>
  )
}

export default PaymentPage
