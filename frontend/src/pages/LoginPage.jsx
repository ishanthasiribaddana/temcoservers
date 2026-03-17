import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import api from '../api/config'

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotMsg, setShowForgotMsg] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data))
      const role = response.data.role
      if (role === 'Super Admin' || role === 'System Admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-end gap-2 mb-4">
            <img src="/images/temco-logo-sm.png" alt="Temco" className="h-9 w-auto" />
            <span className="text-xl font-semibold tracking-tight text-gray-800 leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Servers</span>
          </Link>
          <p className="text-gray-500 text-sm">Sign in to manage your servers & AI tools</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition pr-10"
                placeholder="Enter your password"
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

          <div className="flex justify-end mb-4 -mt-2">
            <button type="button" onClick={() => setShowForgotMsg(!showForgotMsg)}
              className="text-xs text-primary-500 hover:text-primary-600 transition">
              Forgot Password?
            </button>
          </div>

          {showForgotMsg && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              To reset your password, send a WhatsApp message saying <strong>"Reset My TemcoServers Password"</strong> to <a href="https://wa.me/94774505005?text=Reset%20My%20TemcoServers%20Password" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-blue-900">0774 505 005</a> using your registered phone number.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg font-semibold text-white transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/" className="text-primary-500 hover:text-primary-600">
            &larr; Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
