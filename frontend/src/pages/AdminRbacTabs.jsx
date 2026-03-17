import { useState, useEffect, useCallback } from 'react'
import {
  Users, Shield, Package, FileText, Search, Plus, Edit3, Trash2,
  RotateCcw, ChevronDown, ChevronUp, Eye, Pencil, PlusCircle, X,
  Check, Loader2, Lock, Unlock, UserPlus, AlertCircle, EyeOff
} from 'lucide-react'
import api from '../api/config'

// TemcoServers-only filters — hide inherited Recovery modules/pages from the shared DB
const TS_MODULE_IDS = [157]  // TemcoServers Platform
const TS_ROLE_IDS = [51, 52, 57]  // Super Admin, System Admin, Server Customer
const isTemcoPage = (p) => p.interfaceName?.startsWith('TS')
const isTemcoModule = (m) => TS_MODULE_IDS.includes(m.id)
const isTemcoRole = (r) => TS_ROLE_IDS.includes(r.id)

// ─────────────────────────────────────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────────────────────────────────────
export function UsersTab() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [privileges, setPrivileges] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        api.get('/admin/rbac/users'),
        api.get('/admin/rbac/roles'),
        api.get('/admin/rbac/privileges'),
      ])
      setUsers(uRes.data)
      setRoles(rRes.data.filter(isTemcoRole))
      setPrivileges(pRes.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
  })

  const handleToggleActive = async (u) => {
    const newStatus = u.isActive === 1 ? 0 : 1
    const action = newStatus === 1 ? 'activate' : 'deactivate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.firstName || u.username}?`)) return
    try {
      await api.put(`/admin/rbac/users/${u.loginId}`, { ...u, roleId: u.roleId, isActive: newStatus, privileges: (u.privileges || []).map(p => p.id) })
      fetchAll()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleResetAttempts = async (id) => {
    try {
      await api.post(`/admin/rbac/users/${id}/reset-attempts`)
      fetchAll()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-accent-500 animate-spin" /></div>

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="flex items-center justify-between mb-6">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none" />
        </div>
        <button onClick={() => { setEditUser(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition font-medium">
          <UserPlus className="w-4 h-4" /> Create User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">User</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Privileges</th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.loginId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-accent-400 to-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(u.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-xs">{u.firstName} {u.lastName}</div>
                      <div className="text-[10px] text-gray-400">{u.email || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-gray-600 text-xs font-mono">{u.username}</td>
                <td className="py-3 px-3">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-full">
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-1 flex-wrap">
                    {(u.privileges || []).map(p => (
                      <span key={p.id} className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <button onClick={() => handleToggleActive(u)} title={u.isActive === 1 ? 'Click to deactivate' : 'Click to activate'}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${u.isActive === 1 ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${u.isActive === 1 ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditUser(u); setShowModal(true) }} title="Edit"
                      className="p-1.5 text-gray-400 hover:text-accent-500 hover:bg-accent-50 rounded transition">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {u.countAttempt > 0 && (
                      <button onClick={() => handleResetAttempts(u.loginId)} title="Reset login attempts"
                        className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <UserModal
          user={editUser}
          roles={roles}
          privileges={privileges}
          onClose={() => { setShowModal(false); setEditUser(null) }}
          onSaved={() => { setShowModal(false); setEditUser(null); fetchAll() }}
        />
      )}
    </div>
  )
}

function UserModal({ user, roles, privileges, onClose, onSaved }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    username: user?.username || '',
    password: '',
    gupId: user?.gupId || '',
    roleId: user?.roleId || (roles[0]?.id || ''),
    isActive: user?.isActive ?? 1,
    privileges: (user?.privileges || []).map(p => p.id),
  })
  const [gupSearch, setGupSearch] = useState('')
  const [gupResults, setGupResults] = useState([])
  const [gupSelected, setGupSelected] = useState(user ? { firstName: user.firstName, lastName: user.lastName, gupId: user.gupId } : null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (gupSearch.length < 2) { setGupResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/admin/rbac/gup-search', { params: { q: gupSearch } })
        setGupResults(res.data)
      } catch (_) {}
    }, 400)
    return () => clearTimeout(timer)
  }, [gupSearch])

  const togglePriv = (id) => {
    setForm(f => ({
      ...f,
      privileges: f.privileges.includes(id) ? f.privileges.filter(p => p !== id) : [...f.privileges, id]
    }))
  }

  const handleSave = async () => {
    if (!form.username) { setError('Username required'); return }
    if (!isEdit && !form.password) { setError('Password required'); return }
    if (!form.gupId) { setError('Select a person profile (GUP)'); return }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await api.put(`/admin/rbac/users/${user.loginId}`, form)
      } else {
        await api.post('/admin/rbac/users', form)
      }
      onSaved()
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{error}</div>}

          {/* GUP Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Person Profile (GUP)</label>
            {gupSelected ? (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span className="font-medium">{gupSelected.firstName} {gupSelected.lastName}</span>
                <span className="text-gray-400">#{gupSelected.gupId}</span>
                {!isEdit && <button onClick={() => { setGupSelected(null); setForm(f => ({ ...f, gupId: '' })) }}
                  className="ml-auto text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
              </div>
            ) : (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={gupSearch} onChange={e => setGupSearch(e.target.value)} placeholder="Search by name, NIC, or email..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-500 outline-none" />
                {gupResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {gupResults.map(g => (
                      <button key={g.gupId} onClick={() => {
                        setGupSelected(g); setForm(f => ({ ...f, gupId: g.gupId })); setGupResults([]); setGupSearch('')
                      }} className="w-full text-left px-3 py-2 hover:bg-accent-50 text-sm border-b border-gray-100 last:border-0">
                        <div className="font-medium text-gray-900">{g.firstName} {g.lastName}</div>
                        <div className="text-xs text-gray-400">{g.nic || '—'} · {g.email || '—'} · #{g.gupId}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-500 outline-none" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password {isEdit && <span className="text-gray-400">(leave blank to keep current)</span>}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-500 outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: Number(e.target.value) }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-accent-500 outline-none bg-white">
              {roles.map(r => <option key={r.id} value={r.id}>{r.roleName}</option>)}
            </select>
          </div>

          {/* Privileges */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Privileges</label>
            <div className="flex flex-wrap gap-2">
              {privileges.map(p => (
                <button key={p.id} onClick={() => togglePriv(p.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
                    form.privileges.includes(p.id)
                      ? 'bg-accent-500 text-white border-accent-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-accent-300'
                  }`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Toggle */}
          {isEdit && (
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Active Status</label>
              <button onClick={() => setForm(f => ({ ...f, isActive: f.isActive === 1 ? 0 : 1 }))}
                className={`relative w-11 h-6 rounded-full transition ${form.isActive === 1 ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive === 1 ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permissions Tab
// ─────────────────────────────────────────────────────────────────────────────
export function RolesTab() {
  const [roles, setRoles] = useState([])
  const [pages, setPages] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, pRes, mRes] = await Promise.all([
        api.get('/admin/rbac/roles'),
        api.get('/admin/rbac/pages'),
        api.get('/admin/rbac/modules'),
      ])
      setRoles(rRes.data.filter(isTemcoRole))
      setPages(pRes.data.filter(isTemcoPage))
      setModules(mRes.data.filter(isTemcoModule))
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const togglePage = async (roleId, pageId, currentPages) => {
    const newPages = currentPages.includes(pageId)
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId]
    try {
      await api.put(`/admin/rbac/roles/${roleId}/pages`, { pageIds: newPages })
      fetchAll()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const toggleModule = async (roleId, modId, currentModules) => {
    const newMods = currentModules.includes(modId)
      ? currentModules.filter(m => m !== modId)
      : [...currentModules, modId]
    try {
      await api.put(`/admin/rbac/roles/${roleId}/modules`, { moduleIds: newMods })
      fetchAll()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-accent-500 animate-spin" /></div>

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="space-y-3">
        {roles.map(role => (
          <div key={role.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button onClick={() => setExpanded(expanded === role.id ? null : role.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary-500" />
                <span className="font-medium text-gray-900 text-sm">{role.roleName}</span>
                <span className="text-[10px] text-gray-400">Order: {role.roleOrder}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{role.pages?.length || 0} pages · {role.modules?.length || 0} modules</span>
                {expanded === role.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expanded === role.id && (
              <div className="px-5 pb-4 border-t border-gray-100 space-y-4">
                {/* Page Access */}
                <div className="pt-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Page Access</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {pages.map(p => (
                      <button key={p.id} onClick={() => togglePage(role.id, p.id, role.pages || [])}
                        className={`px-2.5 py-1 text-[11px] rounded-md border transition font-medium ${
                          (role.pages || []).includes(p.id)
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300'
                        }`}>
                        {p.displayName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module Access */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Module Access</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {modules.map(m => (
                      <button key={m.id} onClick={() => toggleModule(role.id, m.id, role.modules || [])}
                        className={`px-2.5 py-1 text-[11px] rounded-md border transition font-medium ${
                          (role.modules || []).includes(m.id)
                            ? 'bg-accent-500 text-white border-accent-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-accent-300'
                        }`}>
                        {m.caseName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modules & Pages Tab
// ─────────────────────────────────────────────────────────────────────────────
export function ModulesPagesTab() {
  const [modules, setModules] = useState([])
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showPageForm, setShowPageForm] = useState(false)
  const [newPage, setNewPage] = useState({ interfaceName: '', displayName: '', url: '', icon: '' })
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, pRes] = await Promise.all([
        api.get('/admin/rbac/modules'),
        api.get('/admin/rbac/pages'),
      ])
      setModules(mRes.data.filter(isTemcoModule))
      setPages(pRes.data.filter(isTemcoPage))
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleModulePage = async (modId, pageId, currentPages) => {
    const newPages = currentPages.includes(pageId)
      ? currentPages.filter(p => p !== pageId)
      : [...currentPages, pageId]
    try {
      await api.put(`/admin/rbac/modules/${modId}/pages`, { pageIds: newPages })
      fetchAll()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  const handleCreatePage = async () => {
    if (!newPage.interfaceName || !newPage.displayName || !newPage.url) return
    try {
      await api.post('/admin/rbac/pages', newPage)
      setNewPage({ interfaceName: '', displayName: '', url: '', icon: '' })
      setShowPageForm(false)
      fetchAll()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-accent-500 animate-spin" /></div>

  return (
    <div className="space-y-6">
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

      {/* Modules */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-accent-500" /> Modules
        </h3>
        <div className="space-y-2">
          {modules.map(mod => (
            <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <button onClick={() => setExpanded(expanded === mod.id ? null : mod.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-accent-500" />
                  <span className="font-medium text-gray-900 text-sm">{mod.caseName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{mod.pages?.length || 0} pages</span>
                  {expanded === mod.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </div>
              </button>

              {expanded === mod.id && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {pages.map(p => (
                      <button key={p.id} onClick={() => toggleModulePage(mod.id, p.id, mod.pages || [])}
                        className={`px-2.5 py-1 text-[11px] rounded-md border transition font-medium ${
                          (mod.pages || []).includes(p.id)
                            ? 'bg-accent-500 text-white border-accent-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-accent-300'
                        }`}>
                        {p.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" /> Registered Pages
          </h3>
          <button onClick={() => setShowPageForm(!showPageForm)}
            className="flex items-center gap-1 text-xs text-accent-500 hover:text-accent-600 font-medium">
            <PlusCircle className="w-3.5 h-3.5" /> Add Page
          </button>
        </div>

        {showPageForm && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-4 gap-2 mb-2">
              <input value={newPage.interfaceName} onChange={e => setNewPage(p => ({ ...p, interfaceName: e.target.value }))}
                placeholder="InterfaceName" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-accent-500" />
              <input value={newPage.displayName} onChange={e => setNewPage(p => ({ ...p, displayName: e.target.value }))}
                placeholder="Display Name" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-accent-500" />
              <input value={newPage.url} onChange={e => setNewPage(p => ({ ...p, url: e.target.value }))}
                placeholder="/url-path" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-accent-500" />
              <input value={newPage.icon} onChange={e => setNewPage(p => ({ ...p, icon: e.target.value }))}
                placeholder="icon-name" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-accent-500" />
            </div>
            <button onClick={handleCreatePage}
              className="px-3 py-1.5 text-xs bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium transition">
              Register Page
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase">ID</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase">Interface Name</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase">Display Name</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase">URL</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 uppercase">Icon</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-400">{p.id}</td>
                  <td className="py-2 px-3 font-mono text-gray-700">{p.interfaceName}</td>
                  <td className="py-2 px-3 text-gray-900 font-medium">{p.displayName}</td>
                  <td className="py-2 px-3 font-mono text-primary-600">{p.url}</td>
                  <td className="py-2 px-3 text-gray-500">{p.icon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
