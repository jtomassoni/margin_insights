'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export interface SnapshotRefreshContextValue {
  /** Increment counter when a snapshot is created; consumers can use this to refetch. */
  snapshotCreatedCount: number;
  notifySnapshotCreated: () => void;
}

const SnapshotRefreshContext = createContext<SnapshotRefreshContextValue | null>(null);

export function SnapshotRefreshProvider({ children }: { children: ReactNode }) {
  const [snapshotCreatedCount, setSnapshotCreatedCount] = useState(0);
  const notifySnapshotCreated = useCallback(() => {
    setSnapshotCreatedCount((c) => c + 1);
  }, []);
  const value: SnapshotRefreshContextValue = {
    snapshotCreatedCount,
    notifySnapshotCreated,
  };
  return (
    <SnapshotRefreshContext.Provider value={value}>
      {children}
    </SnapshotRefreshContext.Provider>
  );
}

export function useSnapshotRefresh() {
  return useContext(SnapshotRefreshContext);
}
