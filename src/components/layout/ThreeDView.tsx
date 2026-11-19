'use client';

import { useRef } from 'react';
import { useBrake3dBridge } from '@/hooks/useBrake3dBridge';
import { useT } from '@/i18n/useT';
import { LocaleSwitch } from './LocaleSwitch';
import { NavTabs } from './NavTabs';
import { ThemeSwitch } from './ThemeSwitch';
import { WsChip } from './WsChip';

/** หน้า 3D: ฝัง public/brake-oil-filling-3d.html (หน้า standalone ที่มี HUD/กล้อง/เดินสำรวจของตัวเอง) — ส่งภาษาผ่าน ?lang= */
export function ThreeDView() {
  const { t, locale } = useT();
  const frameRef = useRef<HTMLIFrameElement>(null);
  useBrake3dBridge(frameRef);
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-none items-center gap-4 border-b border-border bg-surface px-5 py-2.5">
        <h1 className="m-0 text-[15px] font-[650] tracking-[0.2px]">{t('page3d.title')}</h1>
        <div className="ml-auto flex items-center gap-2">
          <NavTabs />
          <WsChip />
          <LocaleSwitch />
          <ThemeSwitch />
        </div>
      </header>
      <iframe
        ref={frameRef}
        key={locale}
        src={`/brake-oil-filling-3d.html?lang=${locale}`}
        title="Brake Oil Filling Machine 3D"
        className="min-h-0 w-full flex-1 border-0"
        allow="fullscreen"
      />
    </div>
  );
}
