'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';

/** Default redirect for owner: /dashboard (invalid) — login will redirect to /dashboard/{slug} */

const GoogleIcon = () => (
  <svg className="auth-google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const isLocal = process.env.NODE_ENV === 'development';

const LoginContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirectTo') || '/auth/redirect';

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError('Could not sign in.');
        setSubmitting(false);
        return;
      }
      const session = await getSession();
      const role = (session?.user as { role?: string })?.role;
      const businessSlug = (session?.user as { businessSlug?: string | null })?.businessSlug;
      // Admin → /admin. Owner → /dashboard/{slug} (requires business slug from DB)
      const targetUrl =
        role === 'admin'
          ? '/admin'
          : businessSlug
            ? `/dashboard/${businessSlug}`
            : '/login';
      router.push(targetUrl);
      router.refresh();
    } catch {
      setError('Could not sign in.');
      setSubmitting(false);
    }
  };

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
          <h1>Log in</h1>
          <p className="auth-subtitle">
            Sign in with your Google account to get started. New users can create a free account.
          </p>
          <button
            type="button"
            className="auth-google-btn"
            onClick={() => {
              setSubmitting(true);
              signIn('google', { callbackUrl });
            }}
            disabled={submitting}
          >
            <GoogleIcon />
            {submitting ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          <p className="auth-google-note">
            Gmail accounts are free and secure. That&apos;s why we require Google sign-in — it helps keep your data safe and prevents spam.
          </p>
          {isLocal && (
            <>
              <p className="auth-divider">or (local dev)</p>
              <p className="auth-dev-hint">
                Test accounts: <code>admin</code> / <code>test</code> • <code>owner</code> / <code>test</code>
              </p>
              <form onSubmit={handleCredentialsSubmit} className="auth-form">
                <label className="auth-label">
                  <span>Username</span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </label>
                <label className="auth-label">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                {error && <p className="auth-error">{error}</p>}
                <button type="submit" className="btn btn-secondary auth-submit" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Admin / owner sign in'}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}

