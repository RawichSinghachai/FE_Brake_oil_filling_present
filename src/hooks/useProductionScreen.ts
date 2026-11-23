'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ScreenData } from '@/components/production/ProductionScreen';
import { carMachineQueryOptions } from '@/hooks/useCarMachines';
import { useLivePrediction } from '@/hooks/usePrediction';
import { computePgnums, useRecentPredictions } from '@/hooks/useRecentPredictions';
import { useLiveStore } from '@/stores/liveStore';
import type { CarRecord, Side } from '@/types/car';

/**
 * ข้อมูลจอ production ของเครื่อง 1 ฝั่ง (ใช้ข้อมูลจริงจากฐานข้อมูล):
 *  - รถปัจจุบัน (bn, pgnum, stepnum) จาก WebSocket realtime
 *  - stepnum 1/2 (ดูดสุญญากาศ/เติม) → WAITING
 *  - เครื่องว่าง → ผลตรวจของ bn นั้นจาก /api/predictions/{bn}: PASS → OK, NG → NG (ค้างจอไว้จนรถคันถัดไปเริ่มเติม)
 *  - ไม่มีผลและ pgnum ของรถไม่เคยมีผล predict (7 วันล่าสุด) = ไม่มีโมเดล → NO MODEL ; นอกนั้นรอผล → WAITING
 *  - วันที่/body no. ของรถอ่านจากตาราง machine (recorded_at เหมือนตารางประวัติ)
 */
export function useProductionScreen(side: Side): ScreenData {
  const live = useLiveStore((s) => s.live[side]);
  const bn = live?.bn ?? null;
  const filling = live?.stepnum === 1 || live?.stepnum === 2;

  const modeled = useRecentPredictions(computePgnums).data;
  const noModel = !!live && !!modeled && !modeled.includes(live.pgnum);

  // รถที่กำลังเติม / ไม่มีโมเดล ไม่ต้องถามผล (กันยิง 404 ซ้ำ ๆ)
  const pred = useLivePrediction(filling || noModel ? null : bn);
  const rec = pred.detail?.record ?? null;

  // ผลล่าสุดที่เคยได้ — ค้างบนจอระหว่างเครื่องว่าง จนกว่ารถคันใหม่จะเริ่มเติม
  const [last, setLast] = useState<CarRecord | null>(null);
  useEffect(() => {
    if (rec) setLast(rec);
  }, [rec]);
  useEffect(() => setLast(null), [side]);

  const shown: CarRecord | null = filling || noModel ? null : (rec ?? (last?.side === side ? last : null));
  const carBn = shown?.bn ?? (noModel ? bn : null);

  const machine = useQuery({
    ...carMachineQueryOptions(side, carBn ?? 0),
    enabled: carBn !== null,
  }).data;
  const date = machine ? new Date(machine.recorded_at) : null;

  if (!live) return { kind: 'wait', side, date: null, bn: null };
  if (filling) return { kind: 'wait', side, date: null, bn };
  if (noModel) return { kind: 'nomodel', side, date, bn };
  if (shown) return { kind: shown.verdict === 'PASS' ? 'ok' : 'ng', side, date, bn: shown.bn, features: shown.features };
  return { kind: 'wait', side, date: null, bn };
}
