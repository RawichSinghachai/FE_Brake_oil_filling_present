'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { carMachineQueryOptions } from '@/hooks/useCarMachines';
import { fetchVerdictMap } from '@/hooks/useHistory';
import { useT } from '@/i18n/useT';
import { downloadHistoryCsv } from '@/lib/csv';
import type { MachineCar } from '@/types/car';
import { Button } from '@/components/ui/Button';

interface ExportCsvButtonProps {
  cars: MachineCar[];
  /** ขอบเขตของรายการที่ export (ว่าง = ไม่ต้องแจ้ง) */
  note: string;
}

/**
 * export รายการที่แสดงอยู่ (หน้าปัจจุบัน / ที่โหลดแล้ว) — /api/machines มีข้อมูลหลักล้านแถว จึงไม่ดึงทั้งหมดเพื่อ export
 * คอลัมน์ result ได้จาก /api/predictions (bn ที่ไม่มีผล = pending)
 */
/** รถที่ยังไม่มีข้อมูลจาก machine (โหมดกรอง PASS/NG ได้รายการจาก predict) → เติม recorded_at / asn / pgnum ทีละไม่เกิน 6 คำขอ (ใช้ cache ร่วมกับตาราง) */
async function withMachineData(cars: MachineCar[], qc: QueryClient): Promise<MachineCar[]> {
  const out = [...cars];
  const todo = out.map((_, i) => i).filter((i) => !out[i].dt);
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const i = todo[next++];
      const m = await qc.fetchQuery(carMachineQueryOptions(out[i].side, out[i].bn)).catch(() => null);
      if (m) out[i] = { ...out[i], dt: m.recorded_at, asn: m.asn, pgnum: m.pgnum };
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, todo.length) }, worker));
  return out;
}

export function ExportCsvButton({ cars, note }: ExportCsvButtonProps) {
  const { t } = useT();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const onClick = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const verdicts = await fetchVerdictMap();
      const full = await withMachineData(cars, qc);
      downloadHistoryCsv(full.map((c) => ({ ...c, result: verdicts.get(c.bn)?.toLowerCase() ?? 'pending' })));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ml-auto flex items-center gap-2.5">
      {failed && <span className="text-[12px] text-crit-soft">{t('export.failed')}</span>}
      {note && <span className="text-[12px] text-muted">{note}</span>}
      <Button onClick={onClick} disabled={busy || cars.length === 0} className="inline-flex items-center gap-1.5">
        <Download size={14} /> {busy ? t('export.preparing') : t('export.csv')}
      </Button>
    </div>
  );
}
