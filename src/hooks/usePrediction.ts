'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError, fetchPredictionByBn, fetchPredictions } from '@/lib/api';
import { POLL_PREDICTION_MS, POLL_VERDICT_PAGE_MS } from '@/lib/constants';
import type { MachineCar, Verdict } from '@/types/car';

/** ผลตรวจที่จบแล้วไม่เปลี่ยน → cache นาน; 404 (ยังไม่มีผล/ไม่มี bn) ไม่ retry */
export const predictionQueryOptions = (bn: number) => ({
  queryKey: ['prediction', bn] as const,
  queryFn: () => fetchPredictionByBn(bn),
  staleTime: 5 * 60_000,
  retry: false,
});

/** ผลตรวจ + curve ของ bn เดียว — ส่ง null เพื่อปิด query */
export function usePredictionDetail(bn: number | null) {
  return useQuery({
    ...predictionQueryOptions(bn ?? 0),
    enabled: bn !== null,
  });
}

/**
 * ผลตรวจของ bn ที่กำลังวิ่งอยู่ — backend ตอบ 404 จนกว่า cycle จะจบและ predict เสร็จ
 * จึง poll ซ้ำจนได้ผล (ได้แล้วหยุด) ; `pending` = ยังรอผล (404 ไม่นับเป็น error)
 */
export function useLivePrediction(bn: number | null) {
  const query = useQuery({
    ...predictionQueryOptions(bn ?? 0),
    enabled: bn !== null,
    refetchInterval: (q) => (q.state.data ? false : POLL_PREDICTION_MS),
  });
  const notFound = query.error instanceof ApiError && query.error.status === 404;
  return {
    detail: query.data,
    pending: !query.data && (query.isPending || notFound),
    isError: !!query.error && !notFound,
  };
}

export type PredictionStatus = 'loading' | 'pass' | 'ng' | 'pending' | 'error';

/** รถที่เก่ากว่านี้ยังไม่มีผล = ไม่น่าจะมีผลมาแล้ว → ไม่ต้อง poll ถามซ้ำ */
const PENDING_FRESH_MS = 15 * 60_000;

/**
 * ผลตรวจของรถในตารางประวัติ (หน้าปัจจุบัน) ด้วย 1 request: GET /api/predictions?dt_from=<รถเก่าสุดของหน้า>
 * (ผล predict เกิดหลังรถบันทึก จึงไม่พลาด) แทนการถาม /api/predictions/{bn} ทีละแถว
 * bn ที่ไม่อยู่ใน map = ยังไม่มีผล (pending) ; poll เฉพาะเมื่อมีรถใหม่ ๆ ที่ยังรอผล
 */
export function usePageVerdicts(cars: MachineCar[]) {
  let oldest = Infinity;
  let pendingFresh = false;
  const now = Date.now();
  for (const c of cars) {
    const t = new Date(c.dt).getTime();
    if (t < oldest) oldest = t;
    if (now - t < PENDING_FRESH_MS) pendingFresh = true;
  }
  const dtFrom = Number.isFinite(oldest) ? new Date(oldest).toISOString() : null;

  return useQuery({
    queryKey: ['page-verdicts', dtFrom],
    queryFn: async () => new Map((await fetchPredictions({ dt_from: dtFrom ?? undefined })).map((r) => [r.bn, r.verdict])),
    enabled: dtFrom !== null,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
    // มีรถใหม่ในหน้า → ถามซ้ำเผื่อเพิ่ง predict เสร็จ
    refetchInterval: pendingFresh ? POLL_VERDICT_PAGE_MS : false,
  });
}

/** สถานะผลของ bn จาก map ของหน้า */
export function verdictStatus(q: { data?: Map<number, Verdict>; isError: boolean }, bn: number): PredictionStatus {
  if (q.data) {
    const v = q.data.get(bn);
    return v === 'PASS' ? 'pass' : v === 'NG' ? 'ng' : 'pending';
  }
  return q.isError ? 'error' : 'loading';
}
