import { useState, useEffect, useRef } from 'react'
import {
  Mail, Send, Users, FileText, Clock, BarChart3, Plus, Trash2, Eye, Play,
  Pause, Loader2, CheckCircle, XCircle, AlertTriangle, ChevronDown, X,
  Search, RefreshCw, Info, Zap, Calendar
} from 'lucide-react'
import api from '../api/config'

// ─── Overview Tab ────────────────────────────────────────────────────────────

export function EmailOverviewTab() {
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, c, sc] = await Promise.all([
        api.get('/admin/email/stats'),
        api.get('/admin/email/campaigns'),
        api.get('/admin/email/schedules'),
      ])
      setStats(s.data)
      setCampaigns(c.data)
      setSchedules(sc.data)
    } catch (err) {
      console.error('Failed to load email stats', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Campaigns', value: stats.totalCampaigns, icon: Mail, color: 'from-primary-500 to-primary-600' },
            { label: 'Sent This Month', value: stats.sentThisMonth?.toLocaleString(), icon: Send, color: 'from-green-500 to-green-600' },
            { label: 'Total Sent', value: stats.totalEmailsSent?.toLocaleString(), icon: CheckCircle, color: 'from-accent-500 to-accent-600' },
            { label: 'Failed', value: stats.totalFailed, icon: XCircle, color: 'from-red-400 to-red-500' },
            { label: 'Success Rate', value: `${stats.successRate}%`, icon: BarChart3, color: 'from-temco-500 to-temco-600' },
            { label: 'Active Schedules', value: stats.activeSchedules, icon: Clock, color: 'from-purple-500 to-purple-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${s.color}`} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <div className={`w-7 h-7 bg-gradient-to-br ${s.color} rounded-lg flex items-center justify-center`}>
                    <s.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daily Quota */}
      {stats?.quota && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-temco-500" /> Daily Sending Quota
            </h3>
            <span className="text-xs text-gray-500">{stats.quota.sent} / {stats.quota.limit} emails today</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${stats.quota.remaining < 50 ? 'bg-red-500' : stats.quota.remaining < 200 ? 'bg-temco-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (stats.quota.sent / stats.quota.limit) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{stats.quota.remaining} emails remaining today (Gmail limit: {stats.quota.limit}/day)</p>
        </div>
      )}

      {/* Recent Campaigns */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Recent Campaigns</h3>
          <button onClick={fetchAll} className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Group</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Recipients</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Sent</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Failed</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-medium text-gray-900">{c.campaignName}</td>
                  <td className="py-2.5 px-4 text-gray-600">{c.groupName}</td>
                  <td className="py-2.5 px-4 text-center text-gray-600">{c.totalRecipients}</td>
                  <td className="py-2.5 px-4 text-center text-green-600 font-medium">{c.totalSent}</td>
                  <td className="py-2.5 px-4 text-center text-red-500">{c.totalFailed}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.status === 'completed' ? 'bg-green-50 text-green-600' :
                      c.status === 'sending' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {c.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {c.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-400">{c.sentDate ? new Date(c.sentDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No campaigns yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Jobs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Scheduled Jobs</h3>
        </div>
        <div className="p-4">
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No scheduled campaigns</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Clock className={`w-4 h-4 ${s.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{s.campaignName}</span>
                      <span className="text-xs text-gray-500 ml-2">{s.frequency} — {s.templateName} → {s.groupName}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Templates Tab ───────────────────────────────────────────────────────────

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | { id?, name, subject, content }
  const [previewHtml, setPreviewHtml] = useState(null)

  useEffect(() => { fetchTemplates() }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/email/templates')
      setTemplates(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openEditor = async (tpl) => {
    if (tpl) {
      const res = await api.get(`/admin/email/templates/${tpl.id}`)
      setEditing(res.data)
    } else {
      setEditing({ name: '', subject: '', content: '' })
    }
  }

  const saveTemplate = async () => {
    try {
      if (editing.id) {
        await api.put(`/admin/email/templates/${editing.id}`, editing)
      } else {
        await api.post('/admin/email/templates', editing)
      }
      setEditing(null)
      fetchTemplates()
    } catch (err) { alert(err.response?.data?.error || 'Save failed') }
  }

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return
    try {
      await api.delete(`/admin/email/templates/${id}`)
      fetchTemplates()
    } catch (err) { alert(err.response?.data?.error || 'Delete failed') }
  }

  const previewTemplate = async (tpl) => {
    const res = await api.get(`/admin/email/templates/${tpl.id}`)
    setPreviewHtml(res.data.content)
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Email Templates</h3>
        <button onClick={() => openEditor(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
          <Plus className="w-3.5 h-3.5" /> New Template
        </button>
      </div>

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary-500" />
              <div>
                <div className="text-sm font-medium text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500">{t.subject}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => previewTemplate(t)} className="p-1.5 text-gray-400 hover:text-primary-500 transition" title="Preview">
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => openEditor(t)} className="p-1.5 text-gray-400 hover:text-temco-600 transition" title="Edit">
                <FileText className="w-4 h-4" />
              </button>
              <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No templates yet. Create your first template.</p>
        )}
      </div>

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{editing.id ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Template Name</label>
                <input
                  value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Welcome Email"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Subject Line</label>
                <input
                  value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Welcome to TemcoServers — {{customerName}}!"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">HTML Content</label>
                <div className="text-xs text-gray-400 mb-1">Placeholders: {'{{customerName}}'}, {'{{email}}'}, {'{{dashboardUrl}}'}, {'{{year}}'}</div>
                <textarea
                  value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  rows={16}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none resize-y"
                  placeholder="<div>Your HTML email content...</div>"
                />
              </div>
              {/* Live Preview */}
              {editing.content && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Live Preview</label>
                  <div className="mt-1 border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto max-h-64"
                       dangerouslySetInnerHTML={{ __html: editing.content.replace(/\{\{customerName\}\}/g, 'John Doe').replace(/\{\{email\}\}/g, 'john@example.com').replace(/\{\{dashboardUrl\}\}/g, '#').replace(/\{\{year\}\}/g, new Date().getFullYear()) }} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={saveTemplate} className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
                {editing.id ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
              <button onClick={() => setPreviewHtml(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div dangerouslySetInnerHTML={{ __html: previewHtml.replace(/\{\{customerName\}\}/g, 'John Doe').replace(/\{\{email\}\}/g, 'john@example.com') }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Groups Tab ──────────────────────────────────────────────────────────────

export function EmailGroupsTab() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [populateResult, setPopulateResult] = useState(null)

  useEffect(() => { fetchGroups() }, [])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/email/groups')
      setGroups(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      await api.post('/admin/email/groups', { name: newGroupName })
      setNewGroupName('')
      fetchGroups()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const deleteGroup = async (id) => {
    if (!confirm('Delete this group and all its members?')) return
    try {
      await api.delete(`/admin/email/groups/${id}`)
      if (selectedGroup?.id === id) { setSelectedGroup(null); setMembers([]) }
      fetchGroups()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const viewMembers = async (group) => {
    setSelectedGroup(group)
    setMembersLoading(true)
    try {
      const res = await api.get(`/admin/email/groups/${group.id}/members`)
      setMembers(res.data)
    } catch (err) { console.error(err) }
    finally { setMembersLoading(false) }
  }

  const removeMember = async (gupId) => {
    try {
      await api.delete(`/admin/email/groups/${selectedGroup.id}/members/${gupId}`)
      viewMembers(selectedGroup)
      fetchGroups()
    } catch (err) { alert('Failed') }
  }

  const autoPopulate = async (filter) => {
    setPopulateResult(null)
    try {
      const res = await api.post(`/admin/email/groups/${selectedGroup.id}/auto-populate`, { filter })
      setPopulateResult(res.data.message)
      viewMembers(selectedGroup)
      fetchGroups()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Groups List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Audience Groups</h3>

        {/* Create Group */}
        <div className="flex gap-2">
          <input
            value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name..." onKeyDown={(e) => e.key === 'Enter' && createGroup()}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button onClick={createGroup} className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                selectedGroup?.id === g.id ? 'border-primary-300 bg-primary-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
              onClick={() => viewMembers(g)}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-primary-500" />
                <div>
                  <span className="text-sm font-medium text-gray-900">{g.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{g.memberCount} members</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteGroup(g.id) }} className="p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Members Panel */}
      <div className="space-y-4">
        {selectedGroup ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Members of "{selectedGroup.name}"</h3>
              <span className="text-xs text-gray-500">{members.length} members</span>
            </div>

            {/* Auto-populate */}
            <div className="flex gap-2">
              <button onClick={() => autoPopulate('all_students')} className="flex-1 px-3 py-2 text-xs font-medium bg-accent-50 text-accent-600 border border-accent-200 rounded-lg hover:bg-accent-100 transition">
                + All Active Students
              </button>
              <button onClick={() => autoPopulate('temcoservers_customers')} className="flex-1 px-3 py-2 text-xs font-medium bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition">
                + TemcoServers Customers
              </button>
            </div>

            {populateResult && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> {populateResult}
              </div>
            )}

            {membersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
            ) : (
              <div className="overflow-y-auto max-h-96 space-y-1">
                {members.map((m) => (
                  <div key={m.gupId} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{m.firstName} {m.lastName}</span>
                      <span className="text-xs text-gray-500 ml-2">{m.email}</span>
                    </div>
                    <button onClick={() => removeMember(m.gupId)} className="text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {members.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No members. Use auto-populate above.</p>}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-10 h-10 mb-2" />
            <p className="text-sm">Select a group to view members</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Campaigns Tab (Send) ────────────────────────────────────────────────────

export function EmailCampaignsTab() {
  const [templates, setTemplates] = useState([])
  const [groups, setGroups] = useState([])
  const [bulkDefs, setBulkDefs] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [logs, setLogs] = useState(null) // { campaignId, data }
  const [newBulkName, setNewBulkName] = useState('')

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedBulk, setSelectedBulk] = useState('')
  const [ccEmail, setCcEmail] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [t, g, b, c] = await Promise.all([
        api.get('/admin/email/templates'),
        api.get('/admin/email/groups'),
        api.get('/admin/email/bulk-definitions'),
        api.get('/admin/email/campaigns'),
      ])
      setTemplates(t.data)
      setGroups(g.data)
      setBulkDefs(b.data)
      setCampaigns(c.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const createBulkDef = async () => {
    if (!newBulkName.trim()) return
    try {
      await api.post('/admin/email/bulk-definitions', { name: newBulkName })
      setNewBulkName('')
      const res = await api.get('/admin/email/bulk-definitions')
      setBulkDefs(res.data)
    } catch (err) { alert('Failed') }
  }

  const sendCampaign = async () => {
    if (!selectedTemplate || !selectedGroup || !selectedBulk) {
      alert('Select a template, group, and campaign definition.')
      return
    }
    if (!confirm('Send this campaign to all group members? This cannot be undone.')) return
    setSending(true)
    setResult(null)
    try {
      const res = await api.post('/admin/email/campaigns/send', {
        templateId: parseInt(selectedTemplate),
        groupId: parseInt(selectedGroup),
        bulkId: parseInt(selectedBulk),
        ccEmail: ccEmail || null,
      })
      setResult(res.data)
      fetchAll()
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Campaign failed' })
    } finally {
      setSending(false)
    }
  }

  const viewLogs = async (campaignId) => {
    try {
      const res = await api.get(`/admin/email/campaigns/${campaignId}/logs`)
      setLogs({ campaignId, data: res.data })
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Send Campaign Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-primary-500" /> Send Campaign (Manual)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Template</label>
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
              <option value="">Select template...</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Audience Group</label>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
              <option value="">Select group...</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.memberCount} members)</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Campaign Definition</label>
            <div className="flex gap-2 mt-1">
              <select value={selectedBulk} onChange={(e) => setSelectedBulk(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                <option value="">Select or create...</option>
                {bulkDefs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="flex gap-1">
                <input value={newBulkName} onChange={(e) => setNewBulkName(e.target.value)} placeholder="New..."
                  className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-xs outline-none" />
                <button onClick={createBulkDef} className="px-2 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">CC Email (optional)</label>
            <input value={ccEmail} onChange={(e) => setCcEmail(e.target.value)}
              placeholder="admin@example.com" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5" />
            Emails are sent immediately and count toward daily quota.
          </div>
          <button onClick={sendCampaign} disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Campaign'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            {result.error ? (
              <div className="flex items-center gap-2 text-sm text-red-700"><XCircle className="w-4 h-4" /> {result.error}</div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                Campaign #{result.campaignId} completed — {result.totalSent} sent, {result.totalFailed} failed out of {result.totalRecipients} recipients
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign History */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Campaign History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Template</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Sent</th>
                <th className="text-center py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Failed</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">By</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-400">#{c.id}</td>
                  <td className="py-2.5 px-4 font-medium text-gray-900">{c.campaignName}</td>
                  <td className="py-2.5 px-4 text-gray-600">{c.templateName}</td>
                  <td className="py-2.5 px-4 text-center text-green-600 font-medium">{c.totalSent}</td>
                  <td className="py-2.5 px-4 text-center text-red-500">{c.totalFailed}</td>
                  <td className="py-2.5 px-4 text-gray-500 text-xs">{c.sentByName}</td>
                  <td className="py-2.5 px-4 text-gray-400 text-xs">{c.sentDate ? new Date(c.sentDate).toLocaleString() : '—'}</td>
                  <td className="py-2.5 px-4">
                    <button onClick={() => viewLogs(c.id)} className="text-xs text-primary-500 hover:text-primary-700">Logs</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs Modal */}
      {logs && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Campaign #{logs.campaignId} — Delivery Logs</h3>
              <button onClick={() => setLogs(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">Recipient</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">Email</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.map((l) => (
                    <tr key={l.id} className="border-b border-gray-50">
                      <td className="py-2 px-4 text-gray-900">{l.recipientName}</td>
                      <td className="py-2 px-4 text-gray-500">{l.email}</td>
                      <td className="py-2 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${l.status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                          {l.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-400">{l.sentAt ? new Date(l.sentAt).toLocaleString() : '—'}</td>
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

// ─── Schedule Tab ────────────────────────────────────────────────────────────

export function EmailScheduleTab() {
  const [schedules, setSchedules] = useState([])
  const [templates, setTemplates] = useState([])
  const [groups, setGroups] = useState([])
  const [bulkDefs, setBulkDefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Form
  const [form, setForm] = useState({
    campaignName: '', templateId: '', groupId: '', bulkId: '',
    frequency: 'once', scheduledDate: '', batchSize: 50,
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [sc, t, g, b] = await Promise.all([
        api.get('/admin/email/schedules'),
        api.get('/admin/email/templates'),
        api.get('/admin/email/groups'),
        api.get('/admin/email/bulk-definitions'),
      ])
      setSchedules(sc.data)
      setTemplates(t.data)
      setGroups(g.data)
      setBulkDefs(b.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const createSchedule = async () => {
    if (!form.campaignName || !form.templateId || !form.groupId || !form.bulkId || !form.scheduledDate) {
      alert('Please fill all required fields.')
      return
    }
    try {
      await api.post('/admin/email/schedules', {
        ...form,
        templateId: parseInt(form.templateId),
        groupId: parseInt(form.groupId),
        bulkId: parseInt(form.bulkId),
        batchSize: parseInt(form.batchSize),
      })
      setShowCreate(false)
      setForm({ campaignName: '', templateId: '', groupId: '', bulkId: '', frequency: 'once', scheduledDate: '', batchSize: 50 })
      fetchAll()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const toggleSchedule = async (id, active) => {
    try {
      await api.put(`/admin/email/schedules/${id}/toggle`, { active })
      fetchAll()
    } catch (err) { console.error(err) }
  }

  const deleteSchedule = async (id) => {
    if (!confirm('Delete this schedule?')) return
    try {
      await api.delete(`/admin/email/schedules/${id}`)
      fetchAll()
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Scheduled Campaigns</h3>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
          <Plus className="w-3.5 h-3.5" /> New Schedule
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-yellow-700">
          <strong>Manual Mode:</strong> Scheduled campaigns are created as planned entries. Automatic execution will be enabled when the admin team is ready. For now, use the "Campaigns" tab to manually trigger sends.
        </p>
      </div>

      <div className="space-y-2">
        {schedules.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition">
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${s.isActive ? 'text-green-500' : 'text-gray-400'}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{s.campaignName}</div>
                <div className="text-xs text-gray-500">
                  {s.frequency} — {s.templateName} → {s.groupName} — Batch: {s.batchSize}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Scheduled: {s.scheduledDate ? new Date(s.scheduledDate).toLocaleString() : '—'}
                  {s.lastRun && <span className="ml-2">Last run: {new Date(s.lastRun).toLocaleString()}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSchedule(s.id, !s.isActive)}
                className={`p-1.5 rounded-lg transition ${s.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                title={s.isActive ? 'Pause' : 'Activate'}>
                {s.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => deleteSchedule(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No scheduled campaigns</p>
        )}
      </div>

      {/* Create Schedule Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">New Scheduled Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Campaign Name</label>
                <input value={form.campaignName} onChange={(e) => setForm({...form, campaignName: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Template</label>
                  <select value={form.templateId} onChange={(e) => setForm({...form, templateId: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="">Select...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Group</label>
                  <select value={form.groupId} onChange={(e) => setForm({...form, groupId: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="">Select...</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.memberCount})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Campaign Def</label>
                  <select value={form.bulkId} onChange={(e) => setForm({...form, bulkId: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="">Select...</option>
                    {bulkDefs.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({...form, frequency: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Scheduled Date</label>
                  <input type="datetime-local" value={form.scheduledDate} onChange={(e) => setForm({...form, scheduledDate: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase">Batch Size</label>
                  <input type="number" value={form.batchSize} onChange={(e) => setForm({...form, batchSize: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createSchedule} className="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition">
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
