'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';

const ProfilePage = () => {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const user = session?.user;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="demo-layout">
      <main className="demo-main">
        <div className="profile-page">
          <header className="profile-page-header">
            <Link href={`/dashboard/${slug}`} className="link-home">
              ← Back to dashboard
            </Link>
            <h1 className="profile-page-title">Profile &amp; settings</h1>
            <p className="profile-page-subtitle">
              View who is signed in and manage account-level settings here.
            </p>
          </header>

          <div className="profile-page-content">
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

            <section className="profile-account-section">
              <h2 className="profile-section-title">Account controls</h2>
              <p className="profile-account-description">
                In the future this is where you&apos;ll manage things like billing, team members, and
                authentication options.
              </p>
              <ul className="profile-account-tips">
                <li>Confirm who is currently signed in.</li>
                <li>Use the &quot;Sign out&quot; button in the header to switch accounts.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
