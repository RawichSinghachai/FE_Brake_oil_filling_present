'use client';

import type { ReactNode } from 'react';
import { useKpi } from '@/hooks/useRecentPredictions';
import { useT } from '@/i18n/useT';
import { arrow, formatClock, formatInt } from '@/lib/format';
import { Card } from '@/components/ui/Card';

type Tone = 'good' | 'crit';

interface TileProps {
  value: ReactNode;
  label: string;
  delta?: string;
  tone?: Tone;
}

function Tile({ value, label, delta, tone = 'good' }: TileProps) {
  return (
    <Card>
      <div className="text-[30px] font-[680] tabular-nums tracking-[-0.5px]">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
      <div className={`mt-1.5 min-h-[18px] text-[12px] tabular-nums ${tone === 'good' ? 'text-good' : 'text-crit'}`}>
        {delta}
      </div>
    </Card>
  );
}

/** KPI คำนวณจาก /api/predictions (backend ไม่มี endpoint สรุป) */
export function KpiRow() {
  const { t } = useT();
  const { data: kpi } = useKpi();

  const carsPct = kpi && kpi.carsYesterday > 0 ? ((kpi.carsToday - kpi.carsYesterday) / kpi.carsYesterday) * 100 : 0;
  const passDelta = kpi ? kpi.passRate - kpi.passRatePrev : 0;
  const ngDelta = kpi ? kpi.ngToday - kpi.ngYesterday : 0;

  return (
    <div className="mb-4 grid gap-4 max-[980px]:grid-cols-2 min-[981px]:grid-cols-4">
      <Tile
        value={kpi ? formatInt(kpi.carsToday) : '—'}
        label={t('kpi.cars.label')}
        delta={kpi ? t('kpi.cars.delta', { arrow: arrow(carsPct), pct: Math.abs(carsPct).toFixed(0) }) : undefined}
        tone={carsPct >= 0 ? 'good' : 'crit'}
      />
      <Tile
        value={kpi ? `${kpi.passRate.toFixed(1)}%` : '—'}
        label={t('kpi.pass.label')}
        delta={kpi ? t('kpi.pass.delta', { arrow: arrow(passDelta), pts: Math.abs(passDelta).toFixed(1) }) : undefined}
        tone={passDelta >= 0 ? 'good' : 'crit'}
      />
      <Tile
        value={kpi ? formatInt(kpi.ngToday) : '—'}
        label={t('kpi.ng.label')}
        delta={kpi ? t('kpi.ng.delta', { arrow: arrow(ngDelta), n: Math.abs(ngDelta) }) : undefined}
        tone={ngDelta <= 0 ? 'good' : 'crit'}
      />
      <Tile
        value={kpi?.latest ? formatClock(new Date(kpi.latest.dt).getTime()) : '—'}
        label={t('kpi.latest.label')}
        delta={kpi?.latest ? `${kpi.latest.side} · bn ${kpi.latest.bn} · ${kpi.latest.verdict}` : undefined}
        tone={kpi?.latest?.verdict === 'NG' ? 'crit' : 'good'}
      />
    </div>
  );
}
