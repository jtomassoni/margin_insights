import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthSessionProvider from '@/components/AuthSessionProvider';

export const metadata: Metadata = {
  title: 'Margin Insights — POS Profit Intelligence',
  description: 'See where your restaurant is losing money. Free ingredient-level costing, margin reports, and price suggestions.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
        rel="stylesheet"
      />
    </head>
    <body>
      <div className="app-root">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </div>
    </body>
  </html>
);

export default RootLayout;

