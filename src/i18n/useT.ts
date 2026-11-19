'use client';

import { useCallback } from 'react';
import { useLocaleStore, type Locale } from '@/stores/localeStore';
import { MESSAGES, type MessageKey } from './messages';

export type Params = Record<string, string | number>;
export type TFunction = (key: MessageKey, params?: Params) => string;

const interpolate = (text: string, params?: Params) =>
  params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text;

export const translate = (locale: Locale, key: MessageKey, params?: Params) =>
  interpolate(MESSAGES[locale][key], params);

/** `const { t, locale } = useT()` — t(key, params) ตามภาษาปัจจุบัน; เปลี่ยนภาษาแล้ว component re-render เอง */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useCallback<TFunction>((key, params) => translate(locale, key, params), [locale]);
  return { t, locale };
}
