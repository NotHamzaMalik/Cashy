import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import './refinement.css';
export const metadata: Metadata = {
  title: 'Cashy — Your money, a little clearer',
  description: 'Your personal and family finance companion. Expenses, income, budgets and a bigger picture.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#211a18' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || !process.env.CLERK_SECRET_KEY?.trim()) {
    return <html lang="en"><body><main style={{maxWidth:680,margin:'12vh auto',padding:32}}><h1>Cashy needs one setup step.</h1><p style={{marginTop:24}}>Authentication is not configured on this deployment. Your workspace is unavailable until setup is complete.</p><p style={{marginTop:20}}>In Vercel → Project Settings → Environment Variables, add both Clerk keys for the deployment environment:</p><ul><li><code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code></li><li><code>CLERK_SECRET_KEY</code></li></ul><p>Use the matching keys from your Clerk application, then redeploy. Keep the secret key in Vercel’s environment settings, never in Git.</p></main></body></html>;
  }
  return <html lang="en"><body><ClerkProvider>{children}</ClerkProvider></body></html>;
}
