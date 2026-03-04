import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { checkCredentials, isAdminEmail } from '@/lib/auth';
import { prisma } from '@/lib/db';

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const username = credentials?.username ?? '';
      const password = credentials?.password ?? '';

      if (!username || !password) {
        return null;
      }

      const match = checkCredentials(username, password);
      if (!match) {
        return null;
      }

      return {
        id: match.matchedUsername,
        name: match.matchedUsername,
        role: match.role,
      } as any;
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

async function getBusinessSlugForOwner(email: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.trim() },
      include: { business: true },
    });
    return user?.business?.slug ?? null;
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        const email = (user as { email?: string }).email ?? user.name;
        token.email = email;
        const explicitRole = (user as { role?: 'admin' | 'owner' }).role;
        token.role =
          explicitRole ?? (isAdminEmail(email) ? 'admin' : 'owner');
        if (token.role === 'owner' && email) {
          token.businessSlug = await getBusinessSlugForOwner(email);
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
