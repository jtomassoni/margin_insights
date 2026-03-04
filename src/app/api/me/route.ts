import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

/** Returns current user's business info (owners and admins with a business) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email ?? session.user.name ?? '';

  const user = await prisma.user.findFirst({
    where: { email },
    include: { business: true },
  });

  if (!user?.business) {
    return NextResponse.json({ businessName: null, businessSlug: null });
  }

  return NextResponse.json({
    businessName: user.business.name,
    businessSlug: user.business.slug,
  });
}
