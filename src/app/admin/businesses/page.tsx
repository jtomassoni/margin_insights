'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Business {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  user_count: number;
}

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/businesses');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBusinesses(data);
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
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create');
      }
      setNewName('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, business: Business) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Delete "${business.name}" and all ${business.user_count} associated user(s)? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(business.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to delete');
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-section">
      <h1 className="admin-section-title">Businesses</h1>
      <p className="admin-section-desc">
        Create and manage businesses (tenants) on the platform.
      </p>

      <form onSubmit={handleCreate} className="admin-form">
        <input
          type="text"
          placeholder="Business name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="admin-input"
          disabled={creating}
        />
        <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
          {creating ? 'Creating…' : 'Add business'}
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
                <th>Name</th>
                <th>Slug</th>
                <th className="num">Users</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {businesses
                .filter((b) => b.slug !== 'admin')
                .map((b) => (
                <tr
                  key={b.id}
                  className="admin-business-row"
                  onClick={() => router.push(`/dashboard/${b.slug}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/dashboard/${b.slug}`);
                    }
                  }}
                >
                  <td>
                    <Link
                      href={`/dashboard/${b.slug}`}
                      className="admin-business-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td><code>{b.slug}</code></td>
                  <td className="num">{b.user_count}</td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={(e) => handleDelete(e, b)}
                      disabled={deletingId === b.id}
                      title={`Delete ${b.name} and ${b.user_count} user(s)`}
                      aria-label={`Delete ${b.name}`}
                    >
                      {deletingId === b.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {businesses.length === 0 && (
            <p className="admin-empty">No businesses yet. Add one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
