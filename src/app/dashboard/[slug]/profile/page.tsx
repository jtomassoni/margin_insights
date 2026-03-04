'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useDashboardData } from '@/context/DashboardDataContext';

const ProfilePage = () => {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const user = session?.user;
  const [imgError, setImgError] = useState(false);
  const {
    menuCategories,
    setMenuCategories,
    menuItemCategories,
    setMenuItemCategories,
    uniqueItemNames,
  } = useDashboardData();
  const [newCategoryName, setNewCategoryName] = useState('');

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

            <section className="profile-section profile-menu-categories">
              <h2 className="profile-section-title">Menu categories</h2>
              <p className="profile-account-description">
                Group menu items into categories (e.g. Drinks, Food, Entrees, Apps) to organize reports
                and compare margins by category.
              </p>
              <div className="profile-categories-add">
                <input
                  type="text"
                  placeholder="Add category (e.g. Drinks, Entrees)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const name = newCategoryName.trim();
                      if (name && !menuCategories.includes(name)) {
                        setMenuCategories((prev) => [...prev, name].sort());
                        setNewCategoryName('');
                      }
                    }
                  }}
                  className="profile-categories-input"
                  aria-label="New category name"
                />
                <button
                  type="button"
                  className="btn btn-primary profile-categories-add-btn"
                  onClick={() => {
                    const name = newCategoryName.trim();
                    if (name && !menuCategories.includes(name)) {
                      setMenuCategories((prev) => [...prev, name].sort());
                      setNewCategoryName('');
                    }
                  }}
                >
                  Add
                </button>
              </div>
              {menuCategories.length > 0 && (
                <ul className="profile-categories-list">
                  {menuCategories.map((cat) => (
                    <li key={cat} className="profile-category-item">
                      <span className="profile-category-name">{cat}</span>
                      <button
                        type="button"
                        className="profile-category-remove"
                        onClick={() => {
                          setMenuCategories((prev) => prev.filter((c) => c !== cat));
                          setMenuItemCategories((prev) => {
                            const next = { ...prev };
                            for (const [item, c] of Object.entries(next)) {
                              if (c === cat) delete next[item];
                            }
                            return next;
                          });
                        }}
                        aria-label={`Remove category ${cat}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {uniqueItemNames.length > 0 && menuCategories.length > 0 && (
                <div className="profile-item-assignments">
                  <h3 className="profile-subsection-title">Assign items to categories</h3>
                  <div className="profile-item-assignments-table-wrap">
                    <table className="profile-item-assignments-table">
                      <thead>
                        <tr>
                          <th>Menu item</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueItemNames.map((item) => (
                          <tr key={item}>
                            <td>{item}</td>
                            <td>
                              <select
                                value={menuItemCategories[item] ?? ''}
                                onChange={(e) => {
                                  const cat = e.target.value;
                                  setMenuItemCategories((prev) => {
                                    const next = { ...prev };
                                    if (cat) next[item] = cat;
                                    else delete next[item];
                                    return next;
                                  });
                                }}
                                className="profile-category-select"
                                aria-label={`Category for ${item}`}
                              >
                                <option value="">—</option>
                                {menuCategories.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {uniqueItemNames.length === 0 && (
                <p className="profile-categories-hint">
                  Add menu items in the dashboard to assign them to categories.
                </p>
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
