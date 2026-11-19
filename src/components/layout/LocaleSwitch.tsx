'use client';

import { useT } from '@/i18n/useT';
import { LOCALES, useLocaleStore } from '@/stores/localeStore';

const LABEL = { th: 'TH', en: 'EN' } as const;

/** ปุ่มสลับภาษา TH / EN */
export function LocaleSwitch() {
  const { t, locale } = useT();
  const setLocale = useLocaleStore((s) => s.setLocale);
  return (
    <div role="group" aria-label={t('lang.label')} className="flex gap-1 rounded-full border border-border bg-surface-2 p-[3px]">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-text-2 hover:text-text aria-pressed:bg-s1 aria-pressed:text-white"
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
