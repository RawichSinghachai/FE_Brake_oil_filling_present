'use client';

import { useEffect, useRef, useState } from 'react';
import { useAlarmSettingsLoader } from '@/hooks/useAlarmSettingsLoader';
import { useT } from '@/i18n/useT';
import { installAudioUnlock, playAlarmTone } from '@/lib/alarmSound';
import { formatClock } from '@/lib/format';
import { useAlarmStore } from '@/stores/alarmStore';
import { useLiveStore } from '@/stores/liveStore';

type Phase = 'ok' | 'fault' | 'recovered';

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

/**
 * แจ้งเตือน machine fault ทุกหน้า (mount ครั้งเดียวใน Providers)
 *  - สัญญาณ: machine_fault จาก WebSocket — true = ผิดปกติ → แจ้งเตือน ; false = ปกติ ไม่แจ้ง (หรือโหมดทดสอบในหน้าตั้งค่า)
 *  - debounce: fault ต้องเป็นจริงต่อเนื่อง debounceSec ถึงแจ้ง (สัญญาณสั้นกว่านั้นถูกกรอง) ; พอ fault หายปิดการแจ้งเตือนทันที
 *  - fullscreen: Andon เต็มจอจนกว่าจะรับทราบ แล้วย่อเป็นป้ายเล็ก ; banner: แถบแดงบนสุด
 *  - เสียง / ชื่อแท็บกะพริบ / เตือนซ้ำ ปรับได้ที่ /settings/alarm
 */
export function FaultAlarm() {
  const { t } = useT();
  useAlarmSettingsLoader();
  const s = useAlarmStore((x) => x.settings);
  const loaded = useAlarmStore((x) => x.loaded);
  const testFault = useAlarmStore((x) => x.testFault);
  // machine_fault = true คือผิดปกติ → แจ้งเตือน ; false = เครื่องปกติ ไม่แจ้ง ; ยังไม่มีข้อมูล (null) = ไม่แจ้ง
  const liveFault = useLiveStore((x) => x.common?.machine_fault === true);
  // โหมดทดสอบทำงานเสมอ แม้ปิดการแจ้งเตือนจริงไว้ (เพื่อให้ลองรูปแบบ/เสียงได้)
  const raw = loaded && ((s.enabled && liveFault) || testFault);
  const setTestFault = useAlarmStore((x) => x.setTestFault);
  // โหมดทดสอบข้ามการกันสัญญาณสั่น (ต้องการลองหน้าตา/เสียงทันที) ; fault จริงใช้ค่าที่ตั้งไว้
  const debounceMs = testFault ? 0 : s.debounceSec * 1000;

  // กดทดสอบทุกครั้ง = เริ่มแจ้งใหม่ (ถ้ามี fault จริงที่รับทราบไปแล้วก็แจ้งซ้ำ ให้เห็น/ได้ยินแน่นอน)
  useEffect(() => {
    if (testFault) setAcknowledged(false);
  }, [testFault]);

  const [phase, setPhase] = useState<Phase>('ok');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [lastDurationSec, setLastDurationSec] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startedRef = useRef(startedAt);
  startedRef.current = startedAt;
  const recoveredSecRef = useRef(s.recoveredSec);
  recoveredSecRef.current = s.recoveredSec;

  // raw → phase (debounce ทั้งขาขึ้นและขาลง)
  useEffect(() => {
    const timer = setTimeout(() => {
      const ph = phaseRef.current;
      if (raw && ph !== 'fault') {
        setPhase('fault');
        setStartedAt(Date.now());
        setAcknowledged(false);
      } else if (!raw && ph === 'fault') {
        // fault หาย → ปิดการแจ้งเตือนทันที ; แสดงป้าย "กลับสู่ปกติ" สั้น ๆ ต่อเมื่อตั้งไว้ (recoveredSec > 0)
        setLastDurationSec(Math.round((Date.now() - (startedRef.current ?? Date.now())) / 1000));
        setPhase(recoveredSecRef.current > 0 ? 'recovered' : 'ok');
      }
    }, raw ? debounceMs : 0);                // debounce ใช้ตอน fault เกิดเท่านั้น ; ตอนหายปิดทันที
    return () => clearTimeout(timer);
  }, [raw, debounceMs]);

  // "กลับสู่ปกติ" แสดงชั่วคราวแล้วหายไป
  useEffect(() => {
    if (phase !== 'recovered') return;
    const timer = setTimeout(() => setPhase('ok'), s.recoveredSec * 1000);
    return () => clearTimeout(timer);
  }, [phase, s.recoveredSec]);

  // นาฬิกา (นับเวลาที่ fault)
  useEffect(() => {
    if (phase !== 'fault') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [phase]);

  // รับทราบแล้วแต่ยังไม่หาย → เตือนซ้ำหลัง remindMin นาที
  useEffect(() => {
    if (phase !== 'fault' || !acknowledged || s.remindMin <= 0) return;
    const timer = setTimeout(() => setAcknowledged(false), s.remindMin * 60_000);
    return () => clearTimeout(timer);
  }, [phase, acknowledged, s.remindMin]);

  useEffect(() => {
    useAlarmStore.setState({ phase, acknowledged });
  }, [phase, acknowledged]);

  const active = phase === 'fault' && !acknowledged;   // fault ที่ยังไม่รับทราบ → เสียง + ชื่อแท็บกะพริบ

  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    if (!active || !s.soundOn) return;
    playAlarmTone(s.tone, s.volume);
    const timer = setInterval(() => playAlarmTone(s.tone, s.volume), s.repeatSec * 1000);
    return () => clearInterval(timer);
  }, [active, s.soundOn, s.tone, s.volume, s.repeatSec]);

  useEffect(() => {
    if (!active || !s.blinkTitle) return;
    const original = document.title;
    let on = false;
    const timer = setInterval(() => {
      on = !on;
      document.title = on ? `⚠ ${s.title}` : original;
    }, 800);
    return () => {
      clearInterval(timer);
      document.title = original;
    };
  }, [active, s.blinkTitle, s.title]);

  // โหมดแถบแดง: ดันเนื้อหาทั้งหน้าลงเท่าความสูงแถบ (แถบเป็น fixed จึงไม่ดันเอง)
  const bannerRef = useRef<HTMLDivElement>(null);
  const bannerShown = phase === 'fault' && s.mode === 'banner';
  useEffect(() => {
    if (!bannerShown) return;
    const el = bannerRef.current;
    const apply = () => {
      document.body.style.paddingTop = `${el?.offsetHeight ?? 0}px`;
    };
    apply();
    const ro = el ? new ResizeObserver(apply) : null;
    if (el) ro?.observe(el);
    return () => {
      ro?.disconnect();
      document.body.style.paddingTop = '';
    };
  }, [bannerShown, acknowledged]);

  const elapsedSec = phase === 'fault' && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const since = startedAt ? formatClock(startedAt) : '—';

  if (phase === 'ok') return null;

  const stopTestButton = testFault ? (
    <button
      type="button"
      onClick={() => setTestFault(false)}
      className="rounded-md border border-white/70 bg-transparent px-3 py-1 text-[12px] font-bold text-white hover:bg-white/15"
    >
      ■ {t('alarm.stopTest')}
    </button>
  ) : null;

  if (phase === 'recovered') {
    return (
      <div
        className="fixed inset-x-0 top-6 z-[90] mx-auto flex w-fit items-center gap-3 rounded-2xl bg-good px-8 py-4 text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        role="status"
      >
        <span className="text-[28px]">✓</span>
        <div>
          <div className="text-[20px] font-black">{t('alarm.recovered')}</div>
          <div className="text-[13px] opacity-90">{t('alarm.recoveredDetail', { dur: mmss(lastDurationSec) })}</div>
        </div>
      </div>
    );
  }

  // phase === 'fault'
  if (s.mode === 'banner') {
    return (
      <div
        ref={bannerRef}
        className="fixed inset-x-0 top-0 z-[90] flex flex-wrap items-center gap-x-5 gap-y-1 bg-crit px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        role="alert"
      >
        <span className={`text-[18px] ${acknowledged ? '' : 'animate-pulse'}`}>⚠</span>
        <span className="tracking-wide">{s.title}</span>
        <span className="font-normal opacity-90">{t('alarm.since', { time: since })}</span>
        <span className="font-mono text-[16px] tabular-nums">{mmss(elapsedSec)}</span>
        <span className="ml-auto flex items-center gap-3">
          {stopTestButton}
          {acknowledged ? (
            <span className="text-[12px] font-normal opacity-90">{t('alarm.bannerAck')}</span>
          ) : (
            <button type="button" onClick={() => setAcknowledged(true)} className="rounded-md bg-white px-3.5 py-1 text-[13px] font-bold text-crit">
              {t('alarm.acknowledge')}
            </button>
          )}
        </span>
      </div>
    );
  }

  if (!acknowledged) {
    return (
      <div
        className="fixed inset-0 z-[90] flex animate-pulse flex-col items-center justify-center gap-6 bg-crit/95 px-6 text-center text-white"
        role="alertdialog"
        aria-live="assertive"
      >
        <div className="text-[28px] tracking-[0.3em] opacity-90">⚠ {t('alarm.badge')}{testFault ? ` · ${t('alarm.testMode')}` : ''}</div>
        <div className="max-w-full break-words text-[clamp(40px,8vw,112px)] font-black leading-none tracking-wide">{s.title}</div>
        <div className="font-mono text-[clamp(40px,7vw,96px)] font-bold tabular-nums">{mmss(elapsedSec)}</div>
        <div className="text-[18px] opacity-90">{t('alarm.since', { time: since })}</div>
        <button
          type="button"
          autoFocus
          onClick={() => setAcknowledged(true)}
          className="mt-4 rounded-xl bg-white px-10 py-4 text-[22px] font-black text-crit shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        >
          {t('alarm.acknowledge')}
        </button>
        {stopTestButton}
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-[90] flex items-center gap-3 rounded-xl bg-crit px-4 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.45)]" role="status">
      <span className="size-2.5 animate-pulse rounded-full bg-white" />
      <div>
        <div className="text-[13px] font-bold">{t('alarm.acked', { title: s.title })}</div>
        <div className="font-mono text-[18px] font-bold tabular-nums">{mmss(elapsedSec)}</div>
      </div>
      {stopTestButton}
    </div>
  );
}
