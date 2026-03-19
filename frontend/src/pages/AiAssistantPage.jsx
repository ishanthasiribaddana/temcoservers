import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Code, LogOut, User, CreditCard, Activity, Send, Copy, Check, Loader2, Sparkles, ChevronDown, ArrowLeft, AlertTriangle } from 'lucide-react'
import { aiApi } from '../api/config'

const LANGUAGES = [
  'python', 'javascript', 'java', 'c', 'cpp', 'csharp', 'php', 'ruby',
  'go', 'rust', 'typescript', 'swift', 'kotlin', 'sql', 'html', 'css', 'bash'
]

const MODELS = [
  { id: 'deepseek', label: 'DeepSeek Coder', desc: 'Fast & accurate for code' },
  { id: 'openai', label: 'GPT-4o Mini', desc: 'General purpose AI' },
]

function AiAssistantPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState('python')
  const [model, setModel] = useState('deepseek')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [aiStatus, setAiStatus] = useState('checking') // 'checking' | 'online' | 'offline'
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { navigate('/login'); return }
    setUser(JSON.parse(userData))
    // Check if AI service is reachable
    aiApi.get('/health', { timeout: 5000 })
      .then(() => setAiStatus('online'))
      .catch(() => setAiStatus('offline'))
  }, [navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    const userMsg = { role: 'user', content: prompt, language, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setPrompt('')
    setLoading(true)

    try {
      const res = await aiApi.post('/api/ai/generate', {
        prompt: prompt.trim(),
        language,
        model,
        gup_id: user?.gupId || null,
      })
      const aiMsg = {
        role: 'assistant',
        content: res.data.response,
        model_used: res.data.model_used,
        tokens_used: res.data.tokens_used,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const errMsg = {
        role: 'error',
        content: err.response?.data?.detail || err.message || 'AI service unavailable. Please check API keys.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const extractCodeBlocks = (text) => {
    const parts = []
    const regex = /```(\w*)\n?([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'code', lang: match[1] || language, content: match[2].trim() })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) })
    }
    return parts.length > 0 ? parts : [{ type: 'text', content: text }]
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
    { icon: Code, label: 'AI Assistant', path: '/ai', active: true },
    { icon: CreditCard, label: 'Billing', path: '/billing' },
    { icon: User, label: 'Profile', path: '/dashboard' },
  ]

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
              {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
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

      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col h-screen">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-500" />
              <h1 className="text-lg font-semibold text-gray-900">AI Code Assistant</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {/* Model Selector */}
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none cursor-pointer"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* AI Service Status Banner */}
        {aiStatus === 'offline' && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span><strong>AI service is currently unavailable.</strong> The API key may not be configured on the server. You can still browse, but code generation won't work until the service is online.</span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-400 via-accent-500 to-temco-500 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">AI Code Assistant</h2>
              <p className="text-gray-500 text-sm max-w-md mb-8">
                Ask me to generate, explain, debug, or optimize code in any language.
                Powered by DeepSeek & OpenAI.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  { q: 'Write a Python Flask REST API with CRUD operations', icon: '🐍' },
                  { q: 'Create a responsive navbar with TailwindCSS', icon: '🎨' },
                  { q: 'Explain how binary search works with Java code', icon: '☕' },
                  { q: 'Write a MySQL query to find duplicate records', icon: '🗃️' },
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(example.q); textareaRef.current?.focus() }}
                    className="p-3 bg-white border border-gray-200 rounded-xl text-left hover:border-primary-300 hover:shadow-md transition text-sm"
                  >
                    <span className="text-lg mb-1 block">{example.icon}</span>
                    <span className="text-gray-700 line-clamp-2">{example.q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-2xl">
                      <div className="bg-primary-500 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm">
                        {msg.content}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 text-right">
                        {msg.language}
                      </div>
                    </div>
                  ) : msg.role === 'error' ? (
                    <div className="max-w-2xl">
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-3xl w-full">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm overflow-hidden">
                        {extractCodeBlocks(msg.content).map((block, bi) => (
                          block.type === 'code' ? (
                            <div key={bi} className="relative group">
                              <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-xs">
                                <span className="text-gray-400">{block.lang}</span>
                                <button
                                  onClick={() => copyToClipboard(block.content, `${idx}-${bi}`)}
                                  className="flex items-center gap-1 text-gray-400 hover:text-white transition"
                                >
                                  {copiedIdx === `${idx}-${bi}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedIdx === `${idx}-${bi}` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm leading-relaxed">
                                <code>{block.content}</code>
                              </pre>
                            </div>
                          ) : (
                            <div key={bi} className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {block.content}
                            </div>
                          )
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{msg.model_used}</span>
                        {msg.tokens_used > 0 && <span>{msg.tokens_used} tokens</span>}
                        <button
                          onClick={() => copyToClipboard(msg.content, `full-${idx}`)}
                          className="flex items-center gap-1 hover:text-gray-600 transition"
                        >
                          {copiedIdx === `full-${idx}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          Copy all
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    <span className="text-sm text-gray-500">Generating code...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask me to write ${language} code...`}
                  rows={1}
                  className="w-full resize-none px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none placeholder-gray-400 max-h-32 overflow-y-auto"
                  style={{ minHeight: '48px' }}
                  onInput={(e) => {
                    e.target.style.height = '48px'
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || loading}
                className="px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line. Powered by {model === 'deepseek' ? 'DeepSeek Coder' : 'GPT-4o Mini'}.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}

export default AiAssistantPage
