'use client';

import { Moon, Sun } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useThemeStore } from '@/stores/themeStore';

/** ปุ่มสลับธีม light / dark — ไอคอนแสดงธีมที่จะเปลี่ยนไป */
export function ThemeSwitch() {
  const { t } = useT();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = t(next === 'light' ? 'theme.toLight' : 'theme.toDark');
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setTheme(next)}
      className="flex size-[34px] items-center justify-center rounded-full border border-border bg-surface-2 text-text-2 hover:text-text"
    >
      {next === 'light' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
