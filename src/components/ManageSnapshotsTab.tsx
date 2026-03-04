'use client';

/**
 * Manage cost snapshots — list, edit date ranges, delete.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSnapshotRefresh } from '@/context/SnapshotRefreshContext';

interface SnapshotSummary {
  id: string;
  name: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  line_count: number;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

export default function ManageSnapshotsTab() {
  const snapshotRefresh = useSnapshotRefresh();
  const refreshTrigger = snapshotRefresh?.snapshotCreatedCount ?? 0;
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SnapshotSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-snapshots');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSnapshots(data);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots, refreshTrigger]);

  const handleEdit = (s: SnapshotSummary) => {
    setEditing(s);
    setEditName(s.name);
    setEditStart(s.start_date ? s.start_date.slice(0, 10) : '');
    setEditEnd(s.end_date ? s.end_date.slice(0, 10) : '');
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cost-snapshots/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || undefined,
          start_date: editStart || null,
          end_date: editEnd || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update');
      }
      setEditing(null);
      await loadSnapshots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/cost-snapshots/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      await loadSnapshots();
    } catch {
      setError('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <p className="manage-snapshots-loading">Loading snapshots…</p>;
  }

  return (
    <div className="manage-snapshots-tab">
      <p className="manage-snapshots-hint" style={{ margin: '0 0 0.75rem' }}>
        Assign date ranges to snapshots so Liquor variance and insights can correlate costs with sales by period.
      </p>
      {snapshots.length === 0 ? (
        <p className="manage-snapshots-empty">No cost snapshots yet. Create one using the button in the header.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date range</th>
                <th>Created</th>
                <th>Ingredients</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{formatDateRange(s.start_date, s.end_date)}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="num">{s.line_count}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEdit(s)}
                    >
                      Edit
                    </button>
                    {' '}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                    >
                      {deleting === s.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div
          className="menu-item-add-modal-backdrop"
          onClick={() => !submitting && setEditing(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-snapshot-modal-title"
        >
          <div className="menu-item-add-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="edit-snapshot-modal-title" className="menu-item-add-modal-title">
              Edit snapshot
            </h2>
            <p className="menu-item-add-modal-desc">
              Set the date range this snapshot represents (e.g. January 2025 costs).
            </p>
            <label className="menu-item-add-modal-field">
              <span className="menu-item-add-modal-label">Name</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="menu-item-add-modal-input"
                disabled={submitting}
              />
            </label>
            <label className="menu-item-add-modal-field">
              <span className="menu-item-add-modal-label">Start date</span>
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="menu-item-add-modal-input"
                disabled={submitting}
              />
            </label>
            <label className="menu-item-add-modal-field">
              <span className="menu-item-add-modal-label">End date</span>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="menu-item-add-modal-input"
                disabled={submitting}
              />
            </label>
            {error && (
              <p className="create-snapshot-error" role="alert">
                {error}
              </p>
            )}
            <div className="menu-item-add-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => !submitting && setEditing(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
