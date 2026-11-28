'use client';

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { carMachineQueryOptions, useCarMachines } from '@/hooks/useCarMachines';
import { fetchMachines, fetchPredictions } from '@/lib/api';
import { HISTORY_PAGE_SIZE, POLL_HISTORY_MS } from '@/lib/constants';
import { fromDatetimeLocal } from '@/lib/format';
import { useT } from '@/i18n/useT';
import { groupCars } from '@/lib/machines';
import { useHistoryFilterStore, type ResultFilter } from '@/stores/historyFilterStore';
import type { MachineParams } from '@/types/api';
import type { MachineCar, Verdict } from '@/types/car';

/** จำนวนแถวรายวินาทีต่อการดึง 1 ก้อน (backend รับ limit สูงสุด 1000; 1 คัน ยาว ~11–500 แถว ไม่คงที่, LH/RH สลับกัน) */
const CHUNK = 1000;
/** poll รถล่าสุดดึงแค่ส่วนหัว (รถใหม่ที่เข้ามาใน 1 รอบ poll มีไม่กี่แถว) — เล็กกว่า CHUNK มาก ลดข้อมูลต่อรอบ */
const HEAD_CHUNK = 200;
/** ตอนกรองด้วย "ผล" (pass / ng / pending) backend กรองให้ไม่ได้ → สแกนก้อนข้อมูลได้กี่ก้อนต่อครั้งก่อนให้ผู้ใช้กด "โหลดเพิ่ม" */
const SCAN_CHUNKS = 6;
/** ตัวกรอง "ผล": รอบ refetch verdict map (ดึง /api/predictions ทั้งหมด จึงถี่น้อยกว่ารถล่าสุด) */
const POLL_VERDICT_MS = 30_000;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const NO_CARS: MachineCar[] = [];
/** โหมดกรอง PASS/NG: predicted_at ช้ากว่า recorded_at ไม่กี่วินาที → ขอบช่วงเวลาที่ต้องตรวจ recorded_at จริง = ±15 นาที */
const BOUNDARY_MS = 15 * 60_000;

const toInt = (v: string) => (/^\d+$/.test(v) ? Number(v) : undefined);

/** params ที่ส่งให้ GET /api/machines (bn/asn/pgnum debounce เพื่อไม่ยิงทุกตัวอักษร) */
export function useHistoryParams(): MachineParams {
  const filters = useHistoryFilterStore((s) => s.filters);
  const bn = useDebounced(filters.bn.trim(), 300);
  const asn = useDebounced(filters.asn.trim(), 300);
  const pgnum = useDebounced(filters.pgnum.trim(), 300);
  const { side, from, to } = filters;

  return useMemo(
    () => ({
      bn: toInt(bn),
      asn: toInt(asn),
      pgnum: toInt(pgnum),
      side: side || undefined,
      dt_from: fromDatetimeLocal(from),
      dt_to: fromDatetimeLocal(to),
    }),
    [bn, asn, pgnum, side, from, to],
  );
}

/** bn → ผลตรวจ (ใช้กรองตาม "ผล" และ export) — bn ที่ไม่อยู่ใน map = ยังไม่มีผล */
export async function fetchVerdictMap(): Promise<Map<number, Verdict>> {
  return new Map((await fetchPredictions()).map((r) => [r.bn, r.verdict]));
}

function useVerdictMap(enabled: boolean, poll: boolean) {
  return useQuery({
    queryKey: ['verdict-map'],
    queryFn: fetchVerdictMap,
    staleTime: 30_000,
    enabled,
    // รถที่เพิ่งได้ผลจะได้เข้าตัวกรองตามผลโดยไม่ต้องรีเฟรชหน้า (อยู่หน้า 1 เท่านั้น)
    refetchInterval: poll ? POLL_VERDICT_MS : false,
  });
}

export interface HistoryView {
  /** รถในหน้าปัจจุบัน */
  rows: MachineCar[];
  pageCount: number;
  /** true = pageCount เป็นแค่ค่าต่ำสุด (ยังมีข้อมูลที่ไม่ได้โหลด → ไม่รู้หน้าสุดท้าย) */
  more: boolean;
  /** ข้อความสรุปข้างปุ่มหน้า */
  summary: string;
  /** ข้อความ hint ของ Card */
  hint: string;
  loading: boolean;
  fetching: boolean;
  /** กำลังแสดงรายการเดิมระหว่างรอข้อมูลใหม่ */
  stale: boolean;
  isError: boolean;
  /** รถที่ใช้ export (หน้านี้ / ที่โหลดแล้ว) + หมายเหตุขอบเขต */
  exportCars: MachineCar[];
  exportNote: string;
  /** กรองด้วย "ผล" แล้วยังไม่ครบหน้า แต่หมดโควตาสแกน → ให้ผู้ใช้กดโหลดเพิ่ม */
  canLoadMore: boolean;
  loadMore: () => void;
}

/**
 * ตารางประวัติรถ: ดึง /api/machines ทีละก้อนจากใหม่สุด แล้วรวมเป็นรถ (side,bn) + แบ่งหน้าละ HISTORY_PAGE_SIZE คันฝั่ง client
 * (1 คันยาวไม่คงที่ ~11–500 แถว จึงแบ่งหน้าด้วย offset ของแถวไม่ได้ — รถที่คาบเส้นหน้าจะหายหรือซ้ำ)
 * จึงรู้จำนวนหน้าเท่าที่โหลด (+1 หน้าถ้ายังมีข้อมูลเหลือ)
 * กรองด้วย "ผล" (result !== ''): backend กรองผลให้ไม่ได้ → เทียบกับ verdict map ฝั่ง client
 */
function useHistoryCars(params: MachineParams, page: number, result: ResultFilter): HistoryView {
  const { t } = useT();
  // pass / ng: ตาราง predict บอกว่ารถ (side, bn) ไหนผ่าน/ไม่ผ่าน (backend กรองให้ ครอบคลุมทุกรถ ไม่ต้องไล่อ่าน machine ย้อนหลัง)
  //   → รายการรถมาจากตาราง predict แต่ "ข้อมูลที่แสดง" (เวลา recorded_at / asn / pgnum) ดึงจาก machine ของรถแต่ละคัน เหมือนตารางปกติ
  const predMode = result === 'pass';
  // pending (รอ predict): ไม่มี endpoint → สแกน machines แล้วตัดรถที่มีผลแล้วออก
  const filtering = result === 'pending';
  const [budget, setBudget] = useState(SCAN_CHUNKS);
  useEffect(() => setBudget(SCAN_CHUNKS), [params, result]);

  const live = page === 1;
  // backend กรองช่วงเวลาของ /api/predictions ด้วย predicted_at (เวลา predict เสร็จ) แต่ตารางกรองด้วย recorded_at (เวลาที่เครื่องบันทึก)
  // → ขอกว้างกว่าเดิมข้างละ BOUNDARY_MS (predict เกิดหลังบันทึกไม่กี่วินาที) แล้วตัดสินด้วย recorded_at จริงเฉพาะรถที่อยู่ใกล้ขอบช่วง
  const fromMs = params.dt_from ? Date.parse(params.dt_from) : null;
  const toMs = params.dt_to ? Date.parse(params.dt_to) : null;
  const preds = useQuery({
    queryKey: ['history-predictions', params, result],
    queryFn: () =>
      fetchPredictions({
        ...params,
        dt_from: fromMs === null ? undefined : new Date(fromMs - BOUNDARY_MS).toISOString(),
        dt_to: toMs === null ? undefined : new Date(toMs + BOUNDARY_MS).toISOString(),
        // ทุกผลแสดงเป็น PASS → "ผ่าน" = รถทุกคันที่มีผล predict (ไม่กรอง overall_pass จาก backend)
      }),
    enabled: predMode,
    placeholderData: keepPreviousData,
    refetchInterval: predMode && live ? POLL_HISTORY_MS : false,
  });
  // รถจาก predictions (ไม่ซ้ำ) ; dt เว้นว่างจนกว่าจะได้ recorded_at จาก machine (เวลา predict ใช้แค่ตัดสินใกล้ขอบช่วง ไม่แสดง)
  const predAll = useMemo(() => {
    const seen = new Map<string, { car: MachineCar; at: number }>();
    for (const r of preds.data ?? []) {
      const key = `${r.side}-${r.bn}`;
      if (!seen.has(key)) seen.set(key, { car: { key, bn: r.bn, asn: r.asn, pgnum: r.pgnum, side: r.side, dt: '' }, at: Date.parse(r.dt) });
    }
    return [...seen.values()];
  }, [preds.data]);
  const nearEdge = (at: number) => (fromMs !== null && at < fromMs + BOUNDARY_MS) || (toMs !== null && at > toMs - BOUNDARY_MS);
  const boundary = useMemo(
    () => predAll.filter((p) => nearEdge(p.at)).map((p) => p.car),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [predAll, fromMs, toMs],
  );
  const boundaryMachines = useQueries({ queries: boundary.map((c) => carMachineQueryOptions(c.side, c.bn)) });
  const boundaryKey = boundaryMachines.map((r) => r.data?.recorded_at ?? '').join('|');
  const predCars = useMemo<MachineCar[]>(() => {
    const recorded = new Map(boundary.map((c, i) => [c.key, boundaryMachines[i]?.data?.recorded_at ?? null]));
    return predAll
      .filter(({ car, at }) => {
        if (!nearEdge(at)) return true;                  // อยู่ลึกในช่วง → ผ่านแน่นอน
        const rec = recorded.get(car.key);
        if (!rec) return false;                          // ยังไม่ทราบ recorded_at → รอ (ยังไม่แสดง)
        const ms = Date.parse(rec);
        return (fromMs === null || ms >= fromMs) && (toMs === null || ms <= toMs);
      })
      .map((p) => p.car);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predAll, boundary, boundaryKey, fromMs, toMs]);

  const q = useInfiniteQuery({
    queryKey: ['machines', params],
    enabled: !predMode,
    queryFn: ({ pageParam }) => fetchMachines({ ...params, limit: CHUNK, offset: pageParam }),
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    // แถวใหม่เข้ามาด้านบนตลอดทำให้ offset เหลื่อม → ก้อนอาจซ้ำ แต่ groupCars รวมตาม (side,bn) อยู่แล้ว
    getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + CHUNK : undefined),
  });
  // real-time: อยู่หน้า 1 → ดึงก้อนใหม่สุดก้อนเดียวทุก POLL_HISTORY_MS แล้วรวมไว้หน้าสุด (ไม่ refetch ทุกก้อนที่โหลดไว้)
  // ไม่ poll หน้าอื่น เพื่อไม่ให้แถวเลื่อนใต้มือผู้ใช้ที่กำลังดูหน้าลึก ๆ
  const head = useQuery({
    queryKey: ['machines-head', params],
    queryFn: () => fetchMachines({ ...params, limit: HEAD_CHUNK, offset: 0 }),
    enabled: !predMode && q.isSuccess && !q.isPlaceholderData,
    refetchInterval: live ? POLL_HISTORY_MS : false,
    // กลับมาที่แท็บหลังพักนาน (poll หยุดตอนซ่อนแท็บ) → ดึงก้อนใหม่ทันที
    refetchOnWindowFocus: live,
  });
  const verdicts = useVerdictMap(filtering, live);

  // head อยู่หน้าสุด → groupCars ใช้แถวที่เจอก่อน (ใหม่สุด) ; ก้อนเก่าที่ offset เหลื่อมทับกัน groupCars รวมตาม (side,bn) ให้
  const loaded = useMemo<MachineCar[]>(
    () => groupCars([...(head.data?.items ?? []), ...(q.data?.pages.flatMap((p) => p.items) ?? [])]),
    [head.data, q.data],
  );
  const cars = useMemo(() => {
    if (!filtering) return loaded;
    if (!verdicts.data) return [];
    return loaded.filter((c) => (verdicts.data.get(c.bn)?.toLowerCase() ?? 'pending') === result);
  }, [loaded, filtering, result, verdicts.data]);

  const needed = page * HISTORY_PAGE_SIZE + 1; // +1 เพื่อรู้ว่ายังมีหน้าถัดไป
  const chunks = q.data?.pages.length ?? 0;
  // ไม่กรอง: ดึงเท่าที่จำเป็นต่อหน้า (cars.length < needed คุมอยู่แล้ว) ; กรอง: จำกัดโควตาสแกนกันดึงทั้งตาราง (ล้านแถว)
  const budgetLeft = !filtering || chunks < budget;
  const verdictsReady = !filtering || verdicts.isSuccess;
  const { hasNextPage, isFetchingNextPage, isError, isPlaceholderData, fetchNextPage } = q;

  useEffect(() => {
    if (!predMode && verdictsReady && budgetLeft && cars.length < needed && hasNextPage && !isFetchingNextPage && !isError && !isPlaceholderData) {
      void fetchNextPage();
    }
  }, [predMode, verdictsReady, budgetLeft, cars.length, needed, hasNextPage, isFetchingNextPage, isError, isPlaceholderData, fetchNextPage]);

  // predMode: ได้ครบทุกรายการในครั้งเดียว (ไม่มีข้อมูลเหลือ)
  const shown = predMode ? predCars : cars;
  const more = !predMode && !!hasNextPage;
  const pageCount = Math.max(1, Math.ceil(shown.length / HISTORY_PAGE_SIZE)) + (more ? 1 : 0);
  const current = Math.min(page, pageCount);
  const from = shown.length ? (current - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const to = Math.min(current * HISTORY_PAGE_SIZE, shown.length);
  // ต้อง memo: เป็น `data` ของ useReactTable — array ใหม่ทุก render ทำให้ตารางสั่ง auto-reset แล้ว re-render วนไม่จบ (CPU 100% / navigate ค้าง)
  const rows = useMemo(() => shown.slice((current - 1) * HISTORY_PAGE_SIZE, current * HISTORY_PAGE_SIZE), [shown, current]);

  // โหมดกรอง PASS/NG: เติมข้อมูลจาก machine (recorded_at / asn / pgnum) ให้รถในหน้านี้
  const machineRows = useCarMachines(predMode ? rows : NO_CARS);

  if (predMode) {
    return {
      rows: machineRows,
      pageCount,
      more: false,
      summary: shown.length ? t('history.summary', { from, to, total: shown.length }) : '',
      hint: preds.isPending ? '—' : t('common.unit.cars', { n: shown.length }),
      loading: preds.isPending,
      fetching: preds.isFetching,
      stale: preds.isPlaceholderData,
      isError: preds.isError,
      exportCars: predCars,
      exportNote: '',
      canLoadMore: false,
      loadMore: () => {},
    };
  }
  return {
    rows,
    pageCount,
    more,
    summary: cars.length ? t('history.summary', { from, to, total: `${cars.length}${more ? '+' : ''}` }) : '',
    hint: q.isPending || (filtering && verdicts.isPending) ? '—' : t('common.unit.cars', { n: `${cars.length}${more ? '+' : ''}` }),
    loading: q.isPending || (filtering && verdicts.isPending),
    fetching: isFetchingNextPage,
    stale: isPlaceholderData,
    isError: q.isError || (filtering && verdicts.isError),
    exportCars: cars,
    exportNote: more ? t('history.exportNote', { n: cars.length }) : '',
    canLoadMore: filtering && !budgetLeft && more && cars.length < needed,
    loadMore: () => setBudget((b) => b + SCAN_CHUNKS),
  };
}

/** ตารางประวัติรถ (แบ่งหน้าตามจำนวนรถ ไม่ใช่จำนวนแถว) */
export function useHistory(): HistoryView {
  const params = useHistoryParams();
  const page = useHistoryFilterStore((s) => s.page);
  const result = useHistoryFilterStore((s) => s.filters.result);
  return useHistoryCars(params, page, result);
}
