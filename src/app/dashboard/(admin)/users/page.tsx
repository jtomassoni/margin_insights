'use client';

import { useCallback, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  business_id: string | null;
  business_name: string | null;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
}

function EditUserModal({
  user,
  businesses,
  onSave,
  onClose,
}: {
  user: User;
  businesses: Business[];
  onSave: (user: User) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState<'owner' | 'admin'>(user.role as 'owner' | 'admin');
  const [businessId, setBusinessId] = useState(user.business_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role,
          business_id: businessId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to update');
      }
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="menu-item-add-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-modal-title"
    >
      <div
        className="menu-item-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-user-modal-title" className="menu-item-add-modal-title">
          Edit user
        </h2>
        <form onSubmit={handleSubmit} className="admin-form" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem', marginTop: '1rem' }}>
          <label className="menu-item-add-modal-field">
            <span className="menu-item-add-modal-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
              style={{ width: '100%' }}
              required
              disabled={saving}
            />
          </label>
          <label className="menu-item-add-modal-field">
            <span className="menu-item-add-modal-label">Name (optional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              style={{ width: '100%' }}
              disabled={saving}
            />
          </label>
          <label className="menu-item-add-modal-field">
            <span className="menu-item-add-modal-label">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'owner' | 'admin')}
              className="admin-select"
              style={{ width: '100%' }}
              disabled={saving}
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="menu-item-add-modal-field">
            <span className="menu-item-add-modal-label">Business</span>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="admin-select"
              style={{ width: '100%' }}
              disabled={saving}
            >
              <option value="">No business</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          <div className="menu-item-add-modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || !email.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'admin'>('owner');
  const [newBusinessId, setNewBusinessId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/businesses'),
      ]);
      if (uRes.ok) {
        const data = await uRes.json();
        setUsers(data);
      }
      if (bRes.ok) {
        const data = await bRes.json();
        setBusinesses(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: newName.trim() || undefined,
          role: newRole,
          business_id: newBusinessId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create');
      }
      setNewEmail('');
      setNewName('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="admin-section">
      <h1 className="admin-section-title">Users</h1>
      <p className="admin-section-desc">
        Create and manage users. Assign them to businesses as owners. Click a user to edit.
      </p>

      <form onSubmit={handleCreate} className="admin-form admin-form-users">
        <input
          type="email"
          placeholder="Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="admin-input"
          disabled={creating}
          required
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="admin-input"
          disabled={creating}
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as 'owner' | 'admin')}
          className="admin-select"
          disabled={creating}
        >
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={newBusinessId}
          onChange={(e) => setNewBusinessId(e.target.value)}
          className="admin-select"
          disabled={creating}
        >
          <option value="">No business</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" disabled={creating || !newEmail.trim()}>
          {creating ? 'Creating…' : 'Add user'}
        </button>
      </form>

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Business</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="admin-business-row"
                  onClick={() => setEditingUser(u)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingUser(u);
                    }
                  }}
                >
                  <td>{u.email}</td>
                  <td>{u.name ?? '—'}</td>
                  <td><span className="admin-badge">{u.role}</span></td>
                  <td>{u.business_name ?? '—'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="admin-empty">No users yet. Add one above.</p>
          )}
        </div>
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          businesses={businesses}
          onSave={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          }}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}
