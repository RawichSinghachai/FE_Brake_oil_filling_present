'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';

const TABS = [
  { href: '/', key: 'nav.dashboard' },
  { href: '/3d', key: 'nav.3d' },
  { href: '/production', key: 'nav.production' },
  { href: '/settings/alarm', key: 'nav.alarm' },
] as const satisfies readonly { href: string; key: MessageKey }[];

/** เมนูสลับหน้าหลัก (Dashboard / 3D) — ใช้ร่วมใน TopBar และหน้า 3D */
export function NavTabs() {
  const { t } = useT();
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-full border border-border bg-surface-2 p-[3px]" aria-label={t('nav.label')}>
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
              active ? 'bg-s1 text-white' : 'text-text-2 hover:text-text'
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
