import { useState, useEffect, useRef } from 'react'
import { Stethoscope, Send, Loader2, Server, Terminal, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, Plus, X, History, Zap, HardDrive, MemoryStick, Container, Globe, FileText } from 'lucide-react'
import api from '../api/config'

const QUICK_ACTIONS = [
  { label: 'Check Disk Space', prompt: 'Check disk space usage on my server', icon: HardDrive },
  { label: 'Check Memory', prompt: 'Check RAM and swap usage', icon: MemoryStick },
  { label: 'Docker Status', prompt: 'Show me the status of all Docker containers', icon: Container },
  { label: 'Nginx Status', prompt: 'Check if Nginx is running and show any config errors', icon: Globe },
  { label: 'Recent Logs', prompt: 'Show me recent system logs for any errors', icon: FileText },
  { label: 'Full Health Check', prompt: 'Run a full health check on my server: disk, memory, CPU, services, docker', icon: Zap },
]

function AiDoctorTab({ servers }) {
  // Session state
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])

  // UI state
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [selectedServer, setSelectedServer] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [quota, setQuota] = useState(null)
  const [error, setError] = useState('')
  const [pendingFix, setPendingFix] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load sessions + quota on mount
  useEffect(() => {
    fetchSessions()
    fetchQuota()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-select first running server
  useEffect(() => {
    if (servers.length > 0 && !selectedServer) {
      const running = servers.find(s => s.status === 'running')
      setSelectedServer(running || servers[0])
    }
  }, [servers])

  const fetchSessions = async () => {
    try {
      const res = await api.get('/doctor/sessions')
      setSessions(res.data)
    } catch { /* ignore */ }
  }

  const fetchQuota = async () => {
    try {
      const res = await api.get('/doctor/quota')
      setQuota(res.data)
    } catch { /* ignore */ }
  }

  const loadSession = async (sessionId) => {
    try {
      const res = await api.get(`/doctor/sessions/${sessionId}`)
      setActiveSession(res.data)
      setMessages(res.data.messages || [])
      setShowHistory(false)
      setPendingFix(null)
    } catch (err) {
      setError('Failed to load session')
    }
  }

  const createSession = async () => {
    if (!selectedServer) {
      setError('Please select a server first')
      return
    }
    setCreatingSession(true)
    setError('')
    try {
      const res = await api.post('/doctor/sessions', {
        instanceId: selectedServer.instanceId
      })
      setActiveSession(res.data)
      setMessages([])
      setPendingFix(null)
      fetchSessions()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session. Is the server reachable?')
    } finally {
      setCreatingSession(false)
    }
  }

  const sendMessage = async (text) => {
    if (!text.trim() || !activeSession || !selectedServer) return
    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    setError('')
    setPendingFix(null)

    try {
      const res = await api.post(`/doctor/sessions/${activeSession.session_id}/message`, {
        message: text,
        instanceId: selectedServer.instanceId
      })

      // Add command results
      if (res.data.commands_run) {
        for (const cmd of res.data.commands_run) {
          setMessages(prev => [...prev, {
            role: 'command',
            command_executed: cmd.command,
            command_output: cmd.output,
            content: `Executed: ${cmd.command}`,
            classification: cmd.classification,
            exit_code: cmd.exit_code,
            created_at: new Date().toISOString()
          }])
        }
      }

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        created_at: new Date().toISOString()
      }])

      // Handle fix confirmation
      if (res.data.needs_confirmation) {
        setPendingFix(res.data.needs_confirmation)
      }

      // Update quota
      if (res.data.quota) {
        setQuota({
          requests_used: res.data.quota.requests_used,
          daily_limit: res.data.quota.daily_limit,
          remaining: res.data.quota.remaining
        })
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const confirmFix = async () => {
    if (!pendingFix || !activeSession || !selectedServer) return
    setSending(true)
    setError('')

    try {
      const res = await api.post(`/doctor/sessions/${activeSession.session_id}/confirm-fix`, {
        command: pendingFix.command,
        instanceId: selectedServer.instanceId
      })

      // Add command result
      if (res.data.commands_run) {
        for (const cmd of res.data.commands_run) {
          setMessages(prev => [...prev, {
            role: 'command',
            command_executed: cmd.command,
            command_output: cmd.output,
            content: `Fix executed: ${cmd.command}`,
            classification: 'fix',
            exit_code: cmd.exit_code,
            created_at: new Date().toISOString()
          }])
        }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        created_at: new Date().toISOString()
      }])

      setPendingFix(null)
      if (res.data.quota) setQuota(res.data.quota)
    } catch (err) {
      setError(err.response?.data?.detail || 'Fix command failed')
    } finally {
      setSending(false)
    }
  }

  const closeSession = async (status = 'resolved') => {
    if (!activeSession) return
    try {
      await api.post(`/doctor/sessions/${activeSession.session_id}/close`, { status })
      setActiveSession(null)
      setMessages([])
      setPendingFix(null)
      fetchSessions()
    } catch { /* ignore */ }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ─── No servers ────────────────────────────────────────────────────────────
  if (!servers.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Stethoscope className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No servers found</p>
        <p className="text-sm mt-1">Subscribe to a plan to get started with AI Doctor.</p>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Doctor</h2>
            <p className="text-xs text-gray-400">Diagnose & fix server issues with AI</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quota */}
          {quota && (
            <span className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              {quota.remaining}/{quota.daily_limit} requests today
            </span>
          )}

          {/* Server Selector */}
          <select
            value={selectedServer?.instanceId || ''}
            onChange={(e) => {
              const srv = servers.find(s => s.instanceId === Number(e.target.value))
              setSelectedServer(srv)
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary-500"
          >
            {servers.map(s => (
              <option key={s.instanceId} value={s.instanceId}>
                {s.displayName || s.name} ({s.ipv4 || 'no IP'})
              </option>
            ))}
          </select>

          {/* Session History */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            <History className="w-4 h-4" />
            History
          </button>

          {/* New Session */}
          <button
            onClick={createSession}
            disabled={creatingSession || !selectedServer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-lg transition font-medium"
          >
            {creatingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Session
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Session History Dropdown */}
      {showHistory && (
        <div className="mb-3 bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400">No previous sessions</p>
          ) : (
            <div className="space-y-1.5">
              {sessions.map(s => (
                <button
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activeSession?.session_id === s.session_id
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{s.title || `Session #${s.session_id}`}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'open' ? 'bg-green-100 text-green-700' :
                      s.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {!activeSession ? (
          /* No Active Session — Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Start a Troubleshooting Session</h3>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
              Select a server and click "New Session" to start diagnosing issues with AI assistance.
              The AI Doctor can run diagnostic commands and suggest fixes.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              {QUICK_ACTIONS.slice(0, 3).map((qa, i) => (
                <button
                  key={i}
                  onClick={async () => {
                    await createSession()
                  }}
                  className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition text-center"
                >
                  <qa.icon className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-medium text-gray-700">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Session Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 text-sm">
                <Server className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-gray-700">{activeSession.title || 'Session'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeSession.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{activeSession.status}</span>
              </div>
              {activeSession.status === 'open' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => closeSession('resolved')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  >
                    <CheckCircle className="w-3 h-3" /> Resolved
                  </button>
                  <button
                    onClick={() => closeSession('escalated')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"
                  >
                    <AlertTriangle className="w-3 h-3" /> Escalate
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !sending && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 mb-4">Describe your server issue, or use a quick action:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_ACTIONS.map((qa, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(qa.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition text-gray-600"
                      >
                        <qa.icon className="w-3.5 h-3.5 text-emerald-500" />
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {sending && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Doctor is diagnosing...</span>
                </div>
              )}

              {/* Fix Confirmation */}
              {pendingFix && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Fix Command Requires Approval</p>
                      <p className="text-xs text-amber-600 mt-1">{pendingFix.reason}</p>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg px-3 py-2 mb-3">
                    <code className="text-sm text-green-400 font-mono">{pendingFix.command}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={confirmFix}
                      disabled={sending}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition font-medium"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve & Run
                    </button>
                    <button
                      onClick={() => setPendingFix(null)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
                    >
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeSession.status === 'open' && (
              <div className="border-t border-gray-100 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the issue or ask a question..."
                    rows={1}
                    className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || sending}
                    className="flex items-center justify-center w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 rounded-lg transition text-white"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Message Bubble Component ────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const [expanded, setExpanded] = useState(false)

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-emerald-500 text-white rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    )
  }

  if (msg.role === 'command') {
    return (
      <div className="ml-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition mb-1"
        >
          <Terminal className="w-3.5 h-3.5" />
          <code className="font-mono">{msg.command_executed}</code>
          {msg.exit_code === 0 ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : msg.exit_code === -2 ? (
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-400" />
          )}
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {expanded && msg.command_output && (
          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{msg.command_output}</pre>
          </div>
        )}
      </div>
    )
  }

  if (msg.role === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] flex items-start gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Stethoscope className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-md px-4 py-2.5">
            <div className="text-sm text-gray-800 whitespace-pre-wrap prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ─── Simple Markdown Formatter ───────────────────────────────────────────────

function formatMarkdown(text) {
  if (!text) return ''
  let html = text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-300 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono">$2</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Bullet lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>')
  return html
}

export default AiDoctorTab
