'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchMachines } from '@/lib/api';
import type { ApiMachine } from '@/types/api';
import type { MachineCar, Side } from '@/types/car';

/**
 * แถวล่าสุดของรถ 1 คัน (side, bn) ใน /api/machines — ให้ recorded_at / asn / pgnum "ตามที่ machine บันทึก"
 * ใช้ในตารางประวัติโหมดกรองผล PASS/NG: รายการรถ (bn ไหนผ่าน/ไม่ผ่าน) มาจากตาราง predict
 * แต่ข้อมูลที่แสดงในตารางต้องเป็นของ machine เหมือนตารางปกติ (ตาราง predict รุ่นเก่ามี asn เป็น null)
 * รถที่จบ cycle แล้วค่าไม่เปลี่ยน → cache นาน
 */
export const carMachineQueryOptions = (side: Side, bn: number) => ({
  queryKey: ['car-machine', side, bn] as const,
  queryFn: async (): Promise<ApiMachine | null> => (await fetchMachines({ side, bn, limit: 1 })).items[0] ?? null,
  staleTime: 5 * 60_000,
  retry: 1,
});

/** เติมข้อมูลจาก machine (เวลา recorded_at, asn, pgnum) ให้รถในหน้าปัจจุบัน — ยังไม่ได้ค่า = dt ว่าง ('') ตารางแสดง "—" */
export function useCarMachines(cars: MachineCar[]): MachineCar[] {
  const results = useQueries({ queries: cars.map((c) => carMachineQueryOptions(c.side, c.bn)) });
  // dependency ใช้ข้อมูลจริง ไม่ใช่ array `results` (เปลี่ยนทุก render) → ตารางไม่ re-render วน
  const key = results.map((r) => (r.data ? `${r.data.id}:${r.data.recorded_at}` : '')).join('|');
  return useMemo(
    () =>
      cars.map((c, i) => {
        const m = results[i]?.data;
        return m ? { ...c, dt: m.recorded_at, asn: m.asn, pgnum: m.pgnum } : c;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cars, key],
  );
}
