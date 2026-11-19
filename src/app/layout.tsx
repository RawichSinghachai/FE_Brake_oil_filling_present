import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { THEME_INIT_SCRIPT } from '@/stores/themeStore';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Brake Oil Filling — Anomaly Monitor',
  description: 'Brake Oil Filling anomaly detection (LSTM Autoencoder) · ระบบตรวจจับความผิดปกติ',
};

// ฟอนต์ใช้ system-ui ตาม mockup (รองรับภาษาไทยจากฟอนต์ของระบบ) — กำหนดไว้ที่ --font-sans ใน globals.css
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" data-theme="dark" className="font-sans" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
