'use client';

import { useEffect, useRef, useState } from 'react';
import type { Ingredient } from '@/insight-engine/models/Ingredient';
import { useSnapshotRefresh } from '@/context/SnapshotRefreshContext';

/** Default snapshot name with timestamp, e.g. "Mar 15, 2025 2:30 PM" */
function defaultSnapshotName(): string {
  const d = new Date();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${month} ${day}, ${year} ${time}`;
}

export default function CreateSnapshotModal({
  ingredients,
  onClose,
  onCreated,
}: {
  ingredients: Ingredient[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const snapshotRefresh = useSnapshotRefresh();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(defaultSnapshotName());
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const last = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    setStartDate(first);
    setEndDate(last);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your snapshot a name.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/cost-snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          ingredients:
            ingredients.length > 0
              ? ingredients.map((i) => ({
                  id: i.id,
                  name: i.name,
                  unit_type: i.unit_type,
                  cost_per_unit: i.cost_per_unit,
                }))
              : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to create snapshot');
      }

      onCreated?.();
      snapshotRefresh?.notifySnapshotCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="menu-item-add-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-snapshot-modal-title"
    >
      <div
        className="menu-item-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-snapshot-modal-title" className="menu-item-add-modal-title">
          Create cost snapshot
        </h2>
        <p className="menu-item-add-modal-desc">
          Save your current ingredient costs. Use this to track cost drift over time.
        </p>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder={defaultSnapshotName()}
            className="menu-item-add-modal-input"
            aria-label="Snapshot name"
            disabled={submitting}
          />
        </label>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Date range (optional)</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="menu-item-add-modal-input"
              disabled={submitting}
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="menu-item-add-modal-input"
              disabled={submitting}
            />
          </div>
          <span className="menu-item-add-modal-hint" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            When this snapshot applies (e.g. January 2025). Used for seasonal insights.
          </span>
        </label>
        {ingredients.length === 0 && (
          <p className="create-snapshot-empty-hint">
            No ingredients yet. Add ingredients first to capture costs.
          </p>
        )}
        {error && (
          <p className="create-snapshot-error" role="alert">
            {error}
          </p>
        )}
        <div className="menu-item-add-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || ingredients.length === 0}
          >
            {submitting ? 'Creating…' : 'Create snapshot'}
          </button>
        </div>
      </div>
    </div>
  );
}
