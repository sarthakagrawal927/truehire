'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { SessionProvider } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';

import { installBrowserMonitoring } from '@/lib/foundry-monitoring';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    return installBrowserMonitoring();
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <SessionProvider>{children}</SessionProvider>
    </PostHogProvider>
  );
}
