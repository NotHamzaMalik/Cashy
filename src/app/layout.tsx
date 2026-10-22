import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthControls from '@/components/auth-controls';
export const metadata: Metadata = {
  title: 'Cashy — Your money, a little clearer',
  description: 'Your personal and family finance companion. Expenses, income, budgets and a bigger picture.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#211a18' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ClerkProvider><AuthControls />{children}</ClerkProvider></body></html>;
}
