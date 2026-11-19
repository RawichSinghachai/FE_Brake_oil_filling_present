'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLiveStream } from '@/hooks/useLiveStream';
import { detectLocale, useLocaleStore } from '@/stores/localeStore';
import { useThemeStore } from '@/stores/themeStore';

function LiveStreamBootstrap() {
  useLiveStream();
  return null;
}

/** อ่านภาษาที่บันทึกไว้หลัง mount (ไม่ทำตอน SSR เพื่อไม่ให้ hydration ไม่ตรงกัน) + ตั้ง <html lang> */
function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    useLocaleStore.setState({ locale: detectLocale() });
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

/** อ่านธีมที่ script ใน <head> ตั้งไว้บน <html> มาไว้ใน store (หลัง mount) */
function ThemeSync() {
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    useThemeStore.setState({ theme: t === 'light' ? 'light' : 'dark' });
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleSync />
      <ThemeSync />
      <LiveStreamBootstrap />
      {children}
    </QueryClientProvider>
  );
}
