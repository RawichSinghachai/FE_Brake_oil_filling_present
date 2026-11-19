'use client';

import { useLiveStore } from '@/stores/liveStore';
import { useT } from '@/i18n/useT';
import type { RealtimeCommon } from '@/types/ws';

const ITEMS: { key: keyof RealtimeCommon; label: string }[] = [
  { key: 'continue', label: 'continue' },
  { key: 'master_on', label: 'Master on' },
  { key: 'machine_fault', label: 'machine fault' },
];

/** สถานะเครื่องที่ใช้ร่วมทั้ง LH/RH จาก WS `common` — เขียว = ทำงาน (true), แดง = ไม่ทำงาน (false), เทา = ยังไม่มีข้อมูล */
export function MachineStatusLine() {
  const { t } = useT();
  const common = useLiveStore((s) => s.common);

  return (
    <div className="mb-3.5 flex w-fit max-w-full flex-wrap items-center gap-4 rounded-[9px] border border-border bg-surface-2 px-3 py-2">
      <span className="text-[13px] font-bold text-text">{t('status.title')}</span>
      {ITEMS.map(({ key, label }) => {
        const value = common ? common[key] : null;
        const dot =
          value === null
            ? 'border border-muted'
            : value
              ? 'bg-good shadow-[0_0_0_3px_rgba(12,163,12,0.18)]'
              : 'bg-crit shadow-[0_0_0_3px_rgba(208,59,59,0.16)]';
        return (
          <span key={key} className="flex items-center gap-[7px] text-[12px] text-text-2">
            <span aria-hidden className={`size-[9px] flex-none rounded-full ${dot}`} />
            {label}
            <span className="sr-only">{value === null ? t('status.unknown') : value ? t('status.on') : t('status.off')}</span>
          </span>
        );
      })}
      <span className="ml-1.5 text-[11px] text-muted">
        {common ? t('status.legend') : t('status.legendNone')}
      </span>
    </div>
  );
}
