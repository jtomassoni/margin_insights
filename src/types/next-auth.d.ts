import 'next-auth';

declare module 'next-auth' {
  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: 'admin' | 'owner';
  }

  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: 'admin' | 'owner';
      businessSlug?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: 'admin' | 'owner';
    businessSlug?: string | null;
  }
}
