import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

/**
 * Post-OAuth redirect handler. NextAuth sends users here when no explicit callbackUrl.
 * Routes: admin → /dashboard, owner with business → /dashboard/{slug}, new owner → /signup
 */
export default async function AuthRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as { role?: string }).role;
  const businessSlug = (session.user as { businessSlug?: string | null }).businessSlug;

  if (role === 'admin') {
    redirect('/dashboard');
  }

  if (role === 'owner' && businessSlug) {
    redirect(`/dashboard/${businessSlug}`);
  }

  // New owner (no business yet) → signup flow
  redirect('/signup');
}
