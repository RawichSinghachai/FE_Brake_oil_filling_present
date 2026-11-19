import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

/**
 * ธีมของ UI — ค่าจริงถูกตั้งบน <html data-theme> ก่อน paint โดย script ใน layout (กันจอวาบ)
 * store เริ่มที่ 'dark' เหมือน SSR แล้ว ThemeSync อ่านค่าจริงจาก <html> หลัง mount
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode ฯลฯ — ใช้ได้โดยไม่จำค่า */
    }
  },
}));

/** script ที่รันใน <head> ก่อน hydrate: ธีมที่เลือกไว้ → ไม่เคยเลือก = ตามระบบ (prefers-color-scheme) */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){}})()`;
