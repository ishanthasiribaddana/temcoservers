import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Search, Mail } from 'lucide-react'
import api from '../api/config'

function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = identity lookup, 2 = registration form, 3 = success
  const [country, setCountry] = useState('LK')
  const [nic, setNic] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupStatus, setLookupStatus] = useState(null) // 'found' | 'not-found' | 'has-account' | null
  const [skipLookup, setSkipLookup] = useState(false)
  const debounceRef = useRef(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [gupId, setGupId] = useState(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP state
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('')
  const [otpExpiry, setOtpExpiry] = useState(5)
  const [verificationToken, setVerificationToken] = useState(null)
  const [otpResendCooldown, setOtpResendCooldown] = useState(0)
  const cooldownRef = useRef(null)

  const validateNic = (value) => {
    // Old format: 9 digits + V/X, New format: 12 digits
    const oldFormat = /^\d{9}[VvXx]$/
    const newFormat = /^\d{12}$/
    return oldFormat.test(value) || newFormat.test(value)
  }

  // Debounced NIC lookup — fires 600ms after user stops typing a valid NIC
  useEffect(() => {
    if (country !== 'LK' || !nic.trim()) {
      setLookupStatus(null)
      setLookupResult(null)
      return
    }
    if (!validateNic(nic.trim())) {
      setLookupStatus(null)
      setLookupResult(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLookupLoading(true)
      setLookupStatus(null)
      setError('')
      try {
        const res = await api.get(`/auth/nic-lookup/${encodeURIComponent(nic.trim())}`)
        if (res.data.found) {
          if (res.data.hasAccount) {
            setLookupStatus('has-account')
            setLookupResult(null)
          } else {
            setLookupStatus('found')
            setLookupResult(res.data)
            setFirstName(res.data.firstName || '')
            setLastName(res.data.lastName || '')
            setEmail(res.data.email || '')
            setMobile(res.data.mobile || '')
            setGupId(res.data.gupId)
          }
        } else {
          setLookupStatus('not-found')
          setLookupResult(null)
          setGupId(null)
        }
      } catch {
        setLookupStatus(null)
      } finally {
        setLookupLoading(false)
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [nic, country])

  const handleNicContinue = async (e) => {
    e.preventDefault()
    setError('')

    if (country === 'LK' && !validateNic(nic)) {
      setError('Invalid NIC format. Use 9 digits + V/X (old) or 12 digits (new).')
      return
    }
    if (lookupStatus === 'has-account') {
      setError('An account already exists for this NIC. Please login instead.')
      return
    }

    // If student found, send OTP and go to step 1b
    if (lookupStatus === 'found' && lookupResult?.email) {
      await sendOtpToEmail()
    } else {
      // No student found or no email — skip OTP, go to registration
      setStep(2)
    }
  }

  const sendOtpToEmail = async () => {
    setOtpSending(true)
    setError('')
    try {
      const res = await api.post('/auth/send-otp', { nic: nic.trim(), email: lookupResult.email })
      setOtpMaskedEmail(res.data.maskedEmail || '***')
      setOtpExpiry(res.data.expiresInMinutes || 5)
      setOtpCode('')
      setStep('1b')
      startResendCooldown()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code.')
    } finally {
      setOtpSending(false)
    }
  }

  const startResendCooldown = () => {
    setOtpResendCooldown(60)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setOtpResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit code.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-otp', { nic: nic.trim(), otpCode: otpCode.trim() })
      setVerificationToken(res.data.verificationToken)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipLookup = () => {
    setSkipLookup(true)
    setLookupResult(null)
    setGupId(null)
    setStep(2)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        username: username.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        mobile: mobile.trim() || null,
        nic: nic.trim() || null,
        gupId: gupId,
        verificationToken: verificationToken
      })
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
  const readOnlyClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed"

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-end gap-2 mb-4">
            <img src="/images/temco-logo-sm.png" alt="Temco" className="h-9 w-auto" />
            <span className="text-xl font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Servers</span>
          </Link>
          <p className="text-gray-500 text-sm">Create your account to get started</p>
        </div>

        {/* Step 1: Identity Lookup */}
        {step === 1 && (
          <form onSubmit={handleNicContinue} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <h2 className="text-lg font-semibold text-gray-900">Identity Verification</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                <option value="LK">🇱🇰 Sri Lanka</option>
                <option value="OTHER">🌍 Other Country</option>
              </select>
            </div>

            {country === 'LK' ? (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">NIC Number</label>
                <input
                  type="text"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 199912345678 or 912345678V"
                  required
                />
                {/* Debounce status indicator */}
                {lookupLoading && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking NIC...
                  </p>
                )}
                {!lookupLoading && lookupStatus === 'found' && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" /> Student record found — {lookupResult?.firstName} {lookupResult?.lastName}
                  </p>
                )}
                {!lookupLoading && lookupStatus === 'not-found' && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    No existing record found. You'll fill in your details manually.
                  </p>
                )}
                {!lookupLoading && lookupStatus === 'has-account' && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> An account already exists for this NIC. <Link to="/login" className="underline font-medium">Login instead</Link>
                  </p>
                )}
                {!lookupLoading && !lookupStatus && nic.trim() && !validateNic(nic.trim()) && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Enter a valid NIC: 9 digits + V/X or 12 digits
                  </p>
                )}
                {!lookupLoading && !lookupStatus && !nic.trim() && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    If you're a JIAT student, your details will be auto-filled.
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  International customers can register directly without identity lookup.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {country === 'LK' ? (
                <button
                  type="submit"
                  disabled={lookupLoading || !nic.trim() || lookupStatus === 'has-account'}
                  className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2"
                >
                  {lookupLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Continue</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSkipLookup}
                  className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold text-white transition"
                >
                  Continue to Registration
                </button>
              )}

              {country === 'LK' && (
                <button
                  type="button"
                  onClick={handleSkipLookup}
                  className="text-sm text-gray-500 hover:text-primary-500 transition"
                >
                  Don't have a NIC? Register with email instead
                </button>
              )}
            </div>
          </form>
        )}

        {/* Step 1b: OTP Verification */}
        {step === '1b' && (
          <form onSubmit={handleVerifyOtp} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold"><Mail className="w-4 h-4" /></div>
              <h2 className="text-lg font-semibold text-gray-900">Verify Your Email</h2>
            </div>

            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              A 6-digit verification code has been sent to <strong>{otpMaskedEmail}</strong>. It expires in {otpExpiry} minutes.
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={inputClass + ' text-center text-xl tracking-[0.5em] font-mono'}
                placeholder="000000"
                maxLength={6}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || otpCode.trim().length !== 6}
                className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Continue'}
              </button>

              <button
                type="button"
                disabled={otpResendCooldown > 0 || otpSending}
                onClick={sendOtpToEmail}
                className="text-sm text-gray-500 hover:text-primary-500 disabled:text-gray-300 transition"
              >
                {otpSending ? 'Sending...' : otpResendCooldown > 0 ? `Resend code in ${otpResendCooldown}s` : 'Resend verification code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setOtpCode('') }}
                className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to NIC entry
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <form onSubmit={handleRegister} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <h2 className="text-lg font-semibold text-gray-900">Create Account</h2>
            </div>

            {lookupResult && (
              <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Student record found! Your details have been auto-filled.</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={lookupResult ? readOnlyClass : inputClass}
                  readOnly={!!lookupResult}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={lookupResult ? readOnlyClass : inputClass}
                  readOnly={!!lookupResult}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={lookupResult?.email ? readOnlyClass : inputClass}
                readOnly={!!lookupResult?.email}
                placeholder="your@email.com"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={lookupResult?.mobile ? readOnlyClass : inputClass}
                readOnly={!!lookupResult?.mobile}
                placeholder="+94 77 123 4567"
              />
            </div>

            <hr className="my-5 border-gray-200" />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass + ' pr-10'}
                  placeholder="Min 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Re-enter password"
                required
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</> : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setLookupResult(null); setGupId(null); setVerificationToken(null) }}
                className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to identity verification
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Your TemcoServers account has been created successfully. You can now sign in.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold text-white transition"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {/* Footer links */}
        <div className="flex items-center justify-between mt-6 px-1">
          <Link to="/" className="text-sm text-primary-500 hover:text-primary-600">
            &larr; Back to Home
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-primary-500">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
