import { create } from 'zustand';

export type Locale = 'th' | 'en';

export const LOCALES: readonly Locale[] = ['th', 'en'];
const STORAGE_KEY = 'locale';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

/**
 * ภาษาของ UI — เริ่มที่ 'th' เสมอ (ให้ SSR กับ render แรกตรงกัน) แล้ว LocaleSync อ่านค่าที่บันทึกไว้/ภาษาของเบราว์เซอร์มาแทนหลัง mount
 */
export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'th',
  setLocale: (locale) => {
    set({ locale });
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* private mode ฯลฯ — ใช้ได้โดยไม่จำค่า */
    }
  },
}));

/** ภาษาที่ควรใช้ตอนเปิดหน้า: ที่ผู้ใช้เลือกไว้ → ภาษาของเบราว์เซอร์ (th* = ไทย, อื่น ๆ = อังกฤษ) */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'th' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en';
}
