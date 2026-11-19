'use client';

import { useLivePrediction } from '@/hooks/usePrediction';
import { useT } from '@/i18n/useT';
import { FEATURES } from '@/lib/constants';
import { formatClock } from '@/lib/format';
import { useLiveStore } from '@/stores/liveStore';
import type { Side } from '@/types/car';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { FeatureBar } from './FeatureBar';

function Reading({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-[9px] border border-border bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums">{value ?? '—'}</div>
    </div>
  );
}

/**
 * การ์ดเครื่อง: ค่าสดจาก WebSocket + ผล threshold ของ bn ปัจจุบัน
 * ผลมาจาก GET /api/predictions/{bn} หลังจบ process — ยังไม่มีผล (404) = ไม่แสดงส่วนผลเลย (poll จนกว่าจะได้)
 */
export function MachineCard({ side }: { side: Side }) {
  const { t } = useT();
  const live = useLiveStore((s) => s.live[side]);
  const { detail } = useLivePrediction(live?.bn ?? null);
  // ผลต้องเป็นของ bn ที่เครื่องกำลังทำอยู่เท่านั้น (กันค้างผลคันเก่าตอน bn เปลี่ยน)
  const result = detail && detail.record.bn === live?.bn ? detail.record : null;
  const failed = result ? FEATURES.find((f) => !result.features[f.key].pass) : undefined;

  return (
    <Card>
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="text-[15px] font-[650]">{t(`side.${side}`)}</span>
        {result && <Badge verdict={result.verdict} size="lg" />}
        {result && (
          <span className="ml-auto rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[12px] text-text-2">
            {t('machine.checkedAt', { time: formatClock(new Date(result.dt).getTime()) })}
          </span>
        )}
      </div>

      {live ? (
        <>
          <div className="mb-2.5 flex gap-[22px] text-[13px] text-text-2">
            <span>
              {t('machine.car')} <b className="font-semibold tabular-nums text-text">{live.bn}</b>
            </span>
            <span>
              {t('machine.model')} <b className="font-semibold tabular-nums text-text">{live.pgnum}</b>
            </span>
            <span className="text-muted">{t('machine.liveNow')}</span>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <Reading label="filling pressure" value={live.filling_pressure} />
            <Reading label="filling volume" value={live.filling_volume} />
            <Reading label="vacuumgun" value={live.vacuumgun} />
          </div>
        </>
      ) : (
        <div className="py-6 text-center text-[13px] text-muted">{t('machine.waitLive')}</div>
      )}

      {result && (
        <>
          <div className="mb-1 text-[12px] text-muted">
            {t('machine.result')} <b className="tabular-nums text-text-2">{result.bn}</b>
          </div>
          {FEATURES.map((f) => (
            <FeatureBar key={f.key} feature={f} result={result.features[f.key]} />
          ))}
          <div className="mt-1 text-[11px] text-muted">
            {failed ? t('machine.noteFailed', { name: failed.rawName }) : t('machine.noteDefault')}
          </div>
        </>
      )}
    </Card>
  );
}
