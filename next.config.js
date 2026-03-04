/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // In development, always use localhost for OAuth callbacks (avoids redirect to prod)
    NEXTAUTH_URL:
      process.env.NODE_ENV === 'development'
        ? process.env.NEXTAUTH_URL?.startsWith('http://localhost')
          ? process.env.NEXTAUTH_URL
          : 'http://localhost:3000'
        : process.env.NEXTAUTH_URL,
  },
};
module.exports = nextConfig;
