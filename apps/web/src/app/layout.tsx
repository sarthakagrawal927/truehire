import { SaaSMakerFeedback } from '@/components/saasmaker-feedback';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/organisms/site-header';
import { SiteFooter } from '@/components/organisms/site-footer';
import { VitalsReporter } from '@/components/VitalsReporter';
import { Providers } from './providers';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_DESCRIPTION =
  'Costly, verifiable signals instead of AI-tailored resumes. Your GitHub becomes a credential recruiters can trust.';

export const metadata: Metadata = {
  title: 'TrueHire — the verified-candidate layer',
  description: SITE_DESCRIPTION,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'TrueHire',
    title: 'TrueHire — the verified-candidate layer',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrueHire — the verified-candidate layer',
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <SaaSMakerFeedback />
        <VitalsReporter />
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
