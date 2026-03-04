'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardDataProvider, useDashboardData } from '@/context/DashboardDataContext';
import { SnapshotRefreshProvider } from '@/context/SnapshotRefreshContext';
import DashboardHeader from '@/components/DashboardHeader';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { data: session, status } = useSession();
  const { isLoading, saveError } = useDashboardData();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=/dashboard/${encodeURIComponent(slug)}`);
    }
  }, [status, router, slug]);

  if (status === 'unauthenticated') {
    return (
      <div className="landing demo-page">
        <div className="dashboard-loading">
          <p>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="landing demo-page">
        <div className="dashboard-loading">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing demo-page">
      <DashboardHeader slug={slug} />
      {isLoading ? (
        <div className="dashboard-loading">
          <p>Loading…</p>
        </div>
      ) : (
        <>
          {saveError && (
            <div className="dashboard-save-error" role="alert">
              Save failed: {saveError}
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
}

export default function DashboardSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardDataProvider>
      <SnapshotRefreshProvider>
        <DashboardContent>{children}</DashboardContent>
      </SnapshotRefreshProvider>
    </DashboardDataProvider>
  );
}
