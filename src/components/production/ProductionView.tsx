'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NavTabs } from '@/components/layout/NavTabs';
import { WsChip } from '@/components/layout/WsChip';
import { useProductionScreen } from '@/hooks/useProductionScreen';
import { useT } from '@/i18n/useT';
import { SIDES } from '@/lib/constants';
import { useLiveStore } from '@/stores/liveStore';
import type { Side } from '@/types/car';
import { ProductionScreen, type ScreenText } from './ProductionScreen';

const DESIGN_W = 1920;
const DESIGN_H = 1080;
const HIDE_MS = 3000;

/** ย่อ/ขยายเวที 1920×1080 ให้พอดีหน้าต่าง (ไม่ใช้ค่าก่อน mount กันแสดงผลผิดขนาดตอน SSR) */
function useStageFit() {
  const [fit, setFit] = useState<string | null>(null);
  useEffect(() => {
    const apply = () => {
      const k = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      const x = (window.innerWidth - DESIGN_W * k) / 2;
      const y = (window.innerHeight - DESIGN_H * k) / 2;
      setFit(`translate(${x}px, ${y}px) scale(${k})`);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  return fit;
}

/**
 * หน้า /production — จอ production เต็มหน้าต่าง (เหมาะกับจอทีวีหน้าไลน์) ของเครื่องแต่ละฝั่ง
 * แสดงข้อมูลจริงเท่านั้น (WebSocket + ฐานข้อมูล) ; แถบเมนู/ตัวสลับฝั่งซ่อนอัตโนมัติ ขยับเมาส์หรือแตะจอเพื่อเรียก
 * ?side=LH|RH ตั้งฝั่งตั้งต้นผ่าน URL · คีย์ลัด: L / R = ฝั่ง
 */
export function ProductionView() {
  const { t } = useT();
  const fit = useStageFit();
  const [side, setSide] = useState<Side>('LH');
  const [show, setShow] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wsStatus = useLiveStore((s) => s.wsStatus);

  // ค่าตั้งต้นจาก URL (หลัง mount) และเขียนกลับเมื่อเปลี่ยน
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const sd = q.get('side')?.toUpperCase();
    if (sd === 'LH' || sd === 'RH') setSide(sd);
  }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    q.set('side', side);
    window.history.replaceState(null, '', `?${q}`);
  }, [side]);

  const reveal = useCallback(() => {
    setShow(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShow(false), HIDE_MS);
  }, []);
  useEffect(() => {
    reveal();
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'l') setSide('LH');
      else if (k === 'r') setSide('RH');
      else return;
      reveal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(hideTimer.current);
    };
  }, [reveal]);

  const data = useProductionScreen(side);

  const text: ScreenText = {
    fillingDollySite: 'Filling Dolly Site',
    date: 'Date',
    bodyNo: 'Body No.',
    defect: 'Defect',
    none: 'NONE',
    waiting: 'WAITING',
    brakeOilFilling: 'Brake Oil Filling',
    noModel: 'NO MODEL',
    noModelDetail: t('prod.noModel'),
    featureNames: { pres: 'Filling Pressure', vol: 'Filling Volume', vac: 'Vacuum Gun' },
  };

  const btn = (active: boolean) =>
    `min-h-10 rounded-[10px] border-2 px-4 text-[13px] font-bold tracking-[0.06em] ${
      active ? 'border-white bg-white text-black' : 'border-white/40 bg-transparent text-white hover:border-white'
    }`;
  const fade = `transition-opacity duration-200 ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black" onPointerMove={reveal} onPointerDown={reveal}>
      <div
        style={{ position: 'absolute', left: 0, top: 0, width: DESIGN_W, height: DESIGN_H, transformOrigin: '0 0', transform: fit ?? 'scale(0)' }}
      >
        <ProductionScreen data={data} text={text} />
      </div>

      {wsStatus !== 'open' && (
        <div className="fixed right-4 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-amber-300" role="status">
          ● {t('prod.offline')}
        </div>
      )}

      <div className={`fixed left-4 top-3 z-20 flex items-center gap-2 rounded-2xl bg-black/75 p-2 ${fade}`}>
        <NavTabs />
        <WsChip />
      </div>

      <nav
        className={`fixed bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/75 p-2 ${fade}`}
        aria-label={t('prod.side')}
      >
        {SIDES.map((s) => (
          <button key={s} type="button" className={btn(side === s)} aria-pressed={side === s} onClick={() => setSide(s)}>
            {s}
          </button>
        ))}
      </nav>
    </div>
  );
}
