'use client';

import { useMemo } from 'react';
import { usePgnumOptions } from '@/hooks/useRecentPredictions';
import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';
import { useHistoryFilterStore, type RangePreset, type ResultFilter } from '@/stores/historyFilterStore';
import type { MachineCar, Side } from '@/types/car';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ExportCsvButton } from './ExportCsvButton';

const PRESETS: { value: Exclude<RangePreset, 'custom'>; key: MessageKey }[] = [
  { value: 'all', key: 'common.all' },
  { value: 'today', key: 'filter.today' },
  { value: '7d', key: 'filter.7d' },
];

export function HistoryFilters({ cars, note }: { cars: MachineCar[]; note: string }) {
  const { t } = useT();
  const filters = useHistoryFilterStore((s) => s.filters);
  const setFilter = useHistoryFilterStore((s) => s.setFilter);
  const setPreset = useHistoryFilterStore((s) => s.setPreset);
  const reset = useHistoryFilterStore((s) => s.reset);
  // ไม่มี endpoint รายการ pgnum → รวมจากผลตรวจล่าสุด + รถที่โหลดอยู่ในตาราง ใช้เป็นตัวช่วยเดา (พิมพ์ pgnum อื่นได้เองเสมอ)
  // ไม่ยิง /api/machines เพิ่ม — endpoint นั้นช้า (~2 วินาที/ครั้ง) และจะไปแย่งคิวกับตารางหลัก
  const { data: predPgnums = [] } = usePgnumOptions();
  const pgnumOptions = useMemo(
    () => [...new Set([...predPgnums, ...cars.map((c) => c.pgnum)])].sort((a, b) => a - b),
    [predPgnums, cars],
  );

  return (
    <div className="mb-3.5 flex flex-wrap items-end gap-3 rounded-[11px] border border-border bg-surface-2 p-3">
      <Field label="bn" htmlFor="t-bn">
        <input
          id="t-bn"
          className="ctl"
          type="search"
          inputMode="numeric"
          placeholder={t('filter.bnPh')}
          autoComplete="off"
          value={filters.bn}
          onChange={(e) => setFilter({ bn: e.target.value.replace(/\D/g, '') })}
        />
      </Field>
      <Field label="asn" htmlFor="t-asn">
        <input
          id="t-asn"
          className="ctl"
          type="search"
          inputMode="numeric"
          placeholder={t('filter.asnPh')}
          autoComplete="off"
          value={filters.asn}
          onChange={(e) => setFilter({ asn: e.target.value.replace(/\D/g, '') })}
        />
      </Field>
      <Field label="pgnum" htmlFor="t-pg">
        <input
          id="t-pg"
          className="ctl"
          type="search"
          inputMode="numeric"
          placeholder={t('filter.pgnumPh')}
          autoComplete="off"
          list="t-pg-options"
          value={filters.pgnum}
          onChange={(e) => setFilter({ pgnum: e.target.value.replace(/\D/g, '') })}
        />
        <datalist id="t-pg-options">
          {pgnumOptions.map((pg) => (
            <option key={pg} value={pg} />
          ))}
        </datalist>
      </Field>
      <Field label={t('filter.side')} htmlFor="t-side">
        <select
          id="t-side"
          className="ctl !min-w-[90px]"
          value={filters.side}
          onChange={(e) => setFilter({ side: e.target.value as Side | '' })}
        >
          <option value="">LH + RH</option>
          <option>LH</option>
          <option>RH</option>
        </select>
      </Field>
      <Field label={t('filter.result')} htmlFor="t-res">
        <select
          id="t-res"
          className="ctl !min-w-[120px]"
          value={filters.result}
          onChange={(e) => setFilter({ result: e.target.value as ResultFilter })}
        >
          <option value="">{t('common.all')}</option>
          <option value="pass">{t('filter.pass')}</option>
          <option value="pending">{t('common.pendingPredict')}</option>
        </select>
      </Field>
      <Field label={t('filter.range')}>
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={filters.preset === p.value}
              onClick={() => setPreset(p.value)}
              className="h-[38px] rounded-lg border border-border bg-surface-2 px-3 text-[12px] text-text-2 hover:border-muted aria-pressed:border-s1/55 aria-pressed:bg-s1/18 aria-pressed:text-text"
            >
              {t(p.key)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('filter.from')} htmlFor="t-from">
        <input
          id="t-from"
          className="ctl !min-w-[185px]"
          type="datetime-local"
          value={filters.from}
          onChange={(e) => setFilter({ from: e.target.value, preset: 'custom' })}
        />
      </Field>
      <Field label={t('filter.to')} htmlFor="t-to">
        <input
          id="t-to"
          className="ctl !min-w-[185px]"
          type="datetime-local"
          value={filters.to}
          onChange={(e) => setFilter({ to: e.target.value, preset: 'custom' })}
        />
      </Field>
      <Button variant="ghost" onClick={reset}>
        {t('common.clear')}
      </Button>
      <ExportCsvButton cars={cars} note={note} />
    </div>
  );
}
