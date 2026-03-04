'use client';

import { SessionProvider } from 'next-auth/react';

const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

export default AuthSessionProvider;

