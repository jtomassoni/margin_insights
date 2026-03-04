import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { isAdminEmail } from '@/lib/auth';
import { prisma } from '@/lib/db';

const providers: NextAuthOptions['providers'] = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
];

async function getDbUserByEmail(email: string): Promise<{ role: string; businessSlug: string | null } | null> {
  if (!process.env.DATABASE_URL || !email?.trim()) return null;
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      include: { business: true },
    });
    if (!user) return null;
    return {
      role: user.role,
      businessSlug: user.business?.slug ?? null,
    };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        const email =
          (user as { email?: string }).email ??
          (profile as { email?: string })?.email ??
          (typeof user.name === 'string' ? user.name : undefined);
        token.email = email;
        const dbUser = email ? await getDbUserByEmail(email) : null;
        if (isAdminEmail(email)) {
          token.role = 'admin';
        } else if (dbUser) {
          token.role = dbUser.role as 'admin' | 'owner';
          token.businessSlug = dbUser.businessSlug;
        } else {
          token.role = 'owner';
          if (email) {
            token.businessSlug = (await getDbUserByEmail(email))?.businessSlug ?? null;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        Object.assign(session.user, {
          id: token.sub ?? (token.id as string),
          name: (token.name as string) ?? undefined,
          email: (token.email as string) ?? undefined,
          role: token.role,
          businessSlug: token.businessSlug as string | null | undefined,
        });
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.APP_AUTH_SECRET,
};
