'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKpi } from '@/hooks/useRecentPredictions';
import { fetchMachinesByBn, fetchPredictions } from '@/lib/api';
import { useLiveStore } from '@/stores/liveStore';
import type { Side } from '@/types/car';
import type { RealtimeMessage } from '@/types/ws';

/**
 * สะพานข้อมูลสด Dashboard → หน้า 3D (public/brake-oil-filling-3d.html ใน iframe, same-origin)
 *  - live:    ข้อความ WebSocket ล่าสุดทุกข้อความ (bn / stepnum / สัญญาณ / สถานะเครื่อง)
 *  - history: ค่ารายวินาทีของ bn ปัจจุบันในแต่ละฝั่ง (เผื่อเปิดหน้ากลาง cycle → รู้ว่าแต่ละ step เริ่มเมื่อไหร่)
 *  - results: ผลตรวจ PASS/NG ล่าสุด
 * iframe ส่ง { source: 'brake-3d', type: 'ready' } เมื่อพร้อมรับ → ส่งสถานะปัจจุบันให้ทั้งหมด
 */
const FROM_DASHBOARD = 'brake-dashboard';
const FROM_3D = 'brake-3d';
/** ดึงมาเผื่อแถวซ้ำ แล้วแสดงแค่ RESULTS_SHOWN คันล่าสุด */
const RESULTS_LIMIT = 30;
const RESULTS_SHOWN = 8;

interface KpiPayload {
  carsToday: number;
  carsYesterday: number;
  passRate: number;
  ngToday: number;
  latest: { side: Side; bn: number; verdict: 'PASS' | 'NG' } | null;
}

interface ResultRow {
  bn: number;
  side: Side;
  pgnum: number;
  ok: boolean;
  /** % diff ของ filling volume */
  volPct: number;
}

export function useBrake3dBridge(frameRef: RefObject<HTMLIFrameElement | null>) {
  const ready = useRef(false);
  const sentBn = useRef<Record<Side, number | null>>({ LH: null, RH: null });
  const resultsRef = useRef<ResultRow[]>([]);

  const post = useCallback(
    (payload: Record<string, unknown>) =>
      frameRef.current?.contentWindow?.postMessage({ source: FROM_DASHBOARD, ...payload }, window.location.origin),
    [frameRef],
  );

  const results = useQuery({
    queryKey: ['3d-results'],
    queryFn: () => fetchPredictions({ limit: RESULTS_LIMIT }),
    refetchInterval: 10_000,
  });

  // สรุปการผลิตวันนี้ (ตัวเดียวกับ KPI ของ Dashboard) → แผงข้อมูล production ใน iframe
  const { data: kpi } = useKpi();
  const kpiRef = useRef<KpiPayload | null>(null);
  useEffect(() => {
    if (!kpi) return;
    kpiRef.current = {
      carsToday: kpi.carsToday,
      carsYesterday: kpi.carsYesterday,
      passRate: kpi.passRate,
      ngToday: kpi.ngToday,
      latest: kpi.latest ? { side: kpi.latest.side, bn: kpi.latest.bn, verdict: kpi.latest.verdict } : null,
    };
    if (ready.current) post({ type: 'kpi', kpi: kpiRef.current });
  }, [kpi, post]);

  // ผลตรวจ → iframe (เมื่อมีข้อมูลใหม่ และเมื่อ iframe ready)
  useEffect(() => {
    if (!results.data) return;
    // backend อาจเก็บผลของรถคันเดียวซ้ำหลายแถว → เหลือแถวล่าสุดของแต่ละ (side, bn)
    const seen = new Set<string>();
    resultsRef.current = results.data
      .filter((r) => {
        const key = `${r.side}-${r.bn}`;
        return seen.has(key) ? false : (seen.add(key), true);
      })
      .slice(0, RESULTS_SHOWN)
      .map((r) => ({
        bn: r.bn,
        side: r.side,
        pgnum: r.pgnum,
        ok: r.verdict === 'PASS',
        volPct: r.features.vol.percent,
      }));
    if (ready.current) post({ type: 'results', rows: resultsRef.current });
  }, [results.data, post]);

  useEffect(() => {
    // backend สะดุดชั่วคราว (เช่น ECONNRESET) → ลองใหม่ 2 ครั้งห่างกัน 1.5 วินาที ก่อนยอมแพ้
    const fetchRowsWithRetry = async (bn: number, side: Side) => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await fetchMachinesByBn(bn);
        } catch (e) {
          if (attempt >= 2 || sentBn.current[side] !== bn) throw e;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    };

    const sendHistory = async (side: Side, bn: number) => {
      try {
        const rows = await fetchRowsWithRetry(bn, side);
        const p = side.toLowerCase();
        const col = (r: object, c: string) => (r as Record<string, unknown>)[`${p}_${c}`];
        const samples = rows
          .filter((r) => col(r, 'bn') === bn)
          .map((r) => ({
            ts: Date.parse(r.recorded_at),
            step: (col(r, 'stepnum') as number | null) ?? null,
            vac: Number(col(r, 'vacuumgun')),
            pr: Number(col(r, 'fillingpressure')),
            vol: Number(col(r, 'fillingvolume')),
          }))
          .sort((a, b) => a.ts - b.ts);
        // bn เปลี่ยนไปแล้วระหว่างรอ → ทิ้ง
        if (sentBn.current[side] === bn) post({ type: 'history', side, bn, samples });
      } catch {
        /* ไม่มีประวัติ (404 / ต่อไม่ได้) → iframe นับจากข้อความสดอย่างเดียว */
      }
    };

    const sendLive = (msg: RealtimeMessage | null) => {
      if (!msg) return;
      post({ type: 'live', msg });
      for (const side of ['LH', 'RH'] as const) {
        const bn = (side === 'LH' ? msg.lh : msg.rh)?.bn;
        if (bn !== undefined && bn !== sentBn.current[side]) {
          sentBn.current[side] = bn;
          void sendHistory(side, bn);
        }
      }
    };

    // continue = false → ให้ iframe ค้างภาพ (ดู liveStore.handleMessage ที่หยุดส่งข้อมูลสดแล้ว)
    const sendPause = (paused: boolean) => post({ type: 'pause', paused });
    const unsubscribe = useLiveStore.subscribe((s, prev) => {
      if (!ready.current) return;
      const paused = s.common?.continue === false;
      if (paused !== (prev.common?.continue === false)) sendPause(paused);
      if (s.lastMessage !== prev.lastMessage) sendLive(s.lastMessage);
    });

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.source !== FROM_3D || e.data.type !== 'ready') return;
      ready.current = true;
      sentBn.current = { LH: null, RH: null };
      sendLive(useLiveStore.getState().lastMessage);
      sendPause(useLiveStore.getState().common?.continue === false);
      post({ type: 'results', rows: resultsRef.current });
      if (kpiRef.current) post({ type: 'kpi', kpi: kpiRef.current });
    };
    window.addEventListener('message', onMessage);
    // iframe อาจโหลดเสร็จ (และส่ง 'ready') ก่อนที่หน้านี้จะ hydrate → ทักไปให้ iframe ตอบ 'ready' อีกครั้ง
    // (ถ้า iframe ยังโหลดไม่เสร็จ มันจะส่ง 'ready' เองตอนพร้อม)
    post({ type: 'hello' });

    return () => {
      unsubscribe();
      window.removeEventListener('message', onMessage);
      ready.current = false;
    };
  }, [frameRef, post]);
}
