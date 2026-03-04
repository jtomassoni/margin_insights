'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getSession().then((session) => {
      setChecking(false);
      if (!session?.user) {
        router.replace('/login?callbackUrl=/signup');
        return;
      }
      const role = (session.user as { role?: string }).role;
      const businessSlug = (session.user as { businessSlug?: string | null }).businessSlug;
      if (role === 'admin') {
        router.replace('/admin');
        return;
      }
      if (role === 'owner' && businessSlug) {
        router.replace(`/dashboard/${businessSlug}`);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create business');
      }
      // Redirect to dashboard; middleware allows access via signed cookie
      window.location.href = data.redirect ?? `/dashboard/${data.slug}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="landing auth-page">
        <main className="auth-main">
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing auth-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-logo">
            Margin Insights
          </Link>
        </div>
      </header>
      <main className="auth-main">
        <section className="auth-card">
          <h1>Create your business</h1>
          <p className="auth-subtitle">
            You&apos;re signed in. Create a business to get started with Margin Insights.
          </p>
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              <span>Business name</span>
              <input
                type="text"
                placeholder="e.g. My Bar & Grill"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Creating…' : 'Create business'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
