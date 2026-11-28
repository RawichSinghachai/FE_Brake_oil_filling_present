'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useHistory } from '@/hooks/useHistory';
import { usePageVerdicts } from '@/hooks/usePrediction';
import { useT } from '@/i18n/useT';
import { useHistoryFilterStore } from '@/stores/historyFilterStore';
import type { MachineCar } from '@/types/car';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useColumns } from './columns';
import { HistoryFilters } from './HistoryFilters';
import { Pagination } from './Pagination';

const EMPTY: MachineCar[] = [];

export function HistoryTable() {
  const { t } = useT();
  const columns = useColumns();
  const page = useHistoryFilterStore((s) => s.page);
  const setPage = useHistoryFilterStore((s) => s.setPage);
  const h = useHistory();
  const router = useRouter();

  const { rows: pageRows, pageCount, more, loading, fetching, stale, isError, canLoadMore, loadMore } = h;
  const current = Math.min(page, pageCount);

  // จำนวนหน้าลดลง (เช่น กรอง/ข้อมูลเปลี่ยน) ขณะอยู่หน้าท้าย ๆ → ถอยมาหน้าสุดท้ายจริง
  useEffect(() => {
    if (!loading && !stale && page > pageCount) setPage(pageCount);
  }, [loading, stale, page, pageCount, setPage]);

  const busy = loading || fetching || stale;
  // ข้ามไปหน้าที่ยังไม่โหลด/เปลี่ยน filter → คงแถวล่าสุดไว้ (จางลง) จนกว่าข้อมูลใหม่มา แทนที่จะให้ตารางว่างกะพริบ
  const lastRows = useRef<MachineCar[]>(EMPTY);
  useEffect(() => {
    if (pageRows.length > 0) lastRows.current = pageRows;
  }, [pageRows]);
  const holding = pageRows.length === 0 && busy && lastRows.current.length > 0;
  const shownRows = holding ? lastRows.current : pageRows;

  // กรอง PASS/NG: รายการรถทั้งหมดมาจากผล predict ที่ตรงกับตัวกรองอยู่แล้ว → ใช้ผลนั้นเลย (ไม่ต้องถามช่วงเวลาซ้ำ)
  // ไม่กรอง / รอ predict: ถามผลของรถในหน้านี้ด้วย 1 request (ช่วงเวลา = รถเก่าสุดของหน้า)
  const resultFilter = useHistoryFilterStore((s) => s.filters.result);
  const known = resultFilter === 'pass';
  const pageVerdicts = usePageVerdicts(known ? EMPTY : shownRows);
  const knownVerdicts = useMemo(
    () => ({ data: new Map(shownRows.map((r) => [r.bn, 'PASS' as const])), isError: false }),
    [shownRows, resultFilter],
  );
  const verdicts = known ? knownVerdicts : pageVerdicts;

  const table = useReactTable({
    data: shownRows,
    meta: { verdicts },
    columns,
    getCoreRowModel: getCoreRowModel(),
    // แบ่งหน้าเองนอกตาราง — ไม่ให้ตาราง auto-reset state เมื่อ data เปลี่ยน
    autoResetPageIndex: false,
  });

  const noRows = shownRows.length === 0;

  return (
    <Card title={t('history.title')} hint={h.hint}>
      <HistoryFilters cars={h.exportCars} note={h.exportNote} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="whitespace-nowrap border-b border-border px-2.5 py-[9px] text-left text-[12px] font-semibold uppercase tracking-[0.3px] text-muted"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className={holding || stale ? 'pointer-events-none opacity-50 transition-opacity' : 'transition-opacity'}>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.original.key}
                title={t('history.rowTitle', { side: row.original.side })}
                onClick={() => router.push(`/cars/${row.original.side}/${row.original.bn}`)}
                className="cursor-pointer hover:bg-surface-2"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap border-b border-border px-2.5 py-[9px]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isError && <div className="py-[26px] text-center text-[13px] text-crit-soft">{t('history.loadFailed')}</div>}
      {!isError && noRows && busy && <div className="py-[26px] text-center text-[13px] text-muted">{t('common.loading')}</div>}
      {!isError && !busy && canLoadMore && (
        <div className={`${noRows ? 'py-[26px]' : 'pt-4'} text-center text-[13px] text-muted`}>
          {t(noRows ? 'history.notFoundLoaded' : 'history.partialLoaded', { n: h.exportCars.length })}
          <div className="mt-2.5">
            <Button variant="ghost" onClick={loadMore}>
              {t('history.loadMore')}
            </Button>
          </div>
        </div>
      )}
      {!isError && noRows && !busy && !canLoadMore && !more && (
        <div className="py-[26px] text-center text-[13px] text-muted">
          {t('history.empty')}
        </div>
      )}

      <Pagination
        page={current}
        pageCount={pageCount}
        more={more}
        summary={h.summary}
        onPage={setPage}
      />
    </Card>
  );
}
