'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API_KEY = process.env.NEXT_PUBLIC_SAASMAKER_API_KEY;

export function SaasMakerAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!API_KEY) return;
    fetch('https://api.sassmaker.com/v1/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Project-Key': API_KEY },
      body: JSON.stringify({ name: 'page_view', url: pathname }),
    }).catch(() => {});
  }, [pathname]);
  return null;
}
