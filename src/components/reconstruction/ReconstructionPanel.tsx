'use client';

import { MAX_COMPARE, MAX_DETAIL_ROWS, SIDES } from '@/lib/constants';
import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';
import { useCompareStore, type ReconMode } from '@/stores/compareStore';
import { Card } from '@/components/ui/Card';
import { ComparePanel } from './ComparePanel';
import { LiveSection } from './LiveSection';
import { MachineStatusLine } from './MachineStatusLine';

const MODES: { value: ReconMode; key: MessageKey }[] = [
  { value: 'live', key: 'recon.mode.live' },
  { value: 'compare', key: 'recon.mode.compare' },
];

const segBtn =
  'rounded-[7px] px-[13px] py-[5px] text-[12px] font-bold text-muted aria-pressed:bg-s1 aria-pressed:text-white';
const segWrap =
  'inline-flex items-center gap-1 rounded-[9px] border border-border bg-surface-2 py-[3px] pl-2.5 pr-[3px]';

export function ReconstructionPanel() {
  const { t } = useT();
  const mode = useCompareStore((s) => s.mode);
  const visibleSides = useCompareStore((s) => s.visibleSides);
  const setMode = useCompareStore((s) => s.setMode);
  const toggleSide = useCompareStore((s) => s.toggleSide);

  return (
    <Card className="mb-4">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3.5">
        <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.3px] text-text-2">
          {t('recon.heading')}{' '}
          <span className="text-[12px] font-normal normal-case tracking-normal text-muted">
            {mode === 'live' ? t('recon.legendLive') : t('recon.legendCompare')}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className={segWrap}>
            <span className="mr-[3px] text-[11px] text-muted">{t('recon.view')}</span>
            {MODES.map((m) => (
              <button key={m.value} type="button" aria-pressed={mode === m.value} onClick={() => setMode(m.value)} className={segBtn}>
                {t(m.key)}
              </button>
            ))}
          </span>
          {mode === 'live' && (
            <span className={segWrap}>
              <span className="mr-[3px] text-[11px] text-muted">{t('recon.side')}</span>
              {SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  aria-pressed={visibleSides[side]}
                  onClick={() => toggleSide(side)}
                  className={segBtn}
                >
                  {side}
                </button>
              ))}
            </span>
          )}
        </div>
      </div>

      <MachineStatusLine />

      {mode === 'live' ? (
        <div>
          {SIDES.filter((side) => visibleSides[side]).map((side) => (
            <LiveSection key={side} side={side} />
          ))}
        </div>
      ) : (
        <ComparePanel />
      )}

      <div className="mt-2.5 text-[12px] text-muted">
        {mode === 'live'
          ? t('recon.footLive', { max: MAX_DETAIL_ROWS })
          : t('recon.footCompare', { maxCompare: MAX_COMPARE, max: MAX_DETAIL_ROWS, bn: '{bn}' })}
      </div>
    </Card>
  );
}
