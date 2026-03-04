'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function DashboardAdminProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="admin-section">
      <h1 className="admin-section-title">Profile &amp; settings</h1>
      <p className="admin-section-desc">
        View who is signed in and manage account-level settings.
      </p>
      <div className="profile-page-content" style={{ maxWidth: '32rem' }}>
        <section className="profile-user-card">
          <h2 className="profile-section-title">Signed-in user</h2>
          {user ? (
            <div className="profile-user-card-inner">
              <div className="profile-user-avatar-wrap">
                {user.image && !imgError ? (
                  <img
                    src={user.image}
                    alt=""
                    width={64}
                    height={64}
                    className="profile-user-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="profile-user-avatar-initial">
                    {(user.name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="profile-user-details">
                <div className="profile-user-field">
                  <span className="profile-user-label">Name</span>
                  <span className="profile-user-value">{user.name || '—'}</span>
                </div>
                <div className="profile-user-field">
                  <span className="profile-user-label">Email</span>
                  <span className="profile-user-value">{user.email || '—'}</span>
                </div>
                <div className="profile-user-field">
                  <span className="profile-user-label">Role</span>
                  <span className="profile-user-value">{(user as { role?: string }).role ?? '—'}</span>
                </div>
                <div className="profile-user-field">
                  <span className="profile-user-label">Sign-in method</span>
                  <span className="profile-user-value profile-user-value-muted">
                    {user.email ? 'Google or email-based sign-in' : 'Env-based admin/owner login'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="profile-page-empty">No active session found.</p>
          )}
        </section>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/dashboard" className="admin-business-link">
            ← Back to Admin Overview
          </Link>
        </p>
      </div>
    </div>
  );
}
