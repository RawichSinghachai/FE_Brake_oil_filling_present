import { create } from 'zustand';

/** รูปแบบการแจ้งเตือนตอน machine fault */
export type AlarmMode = 'fullscreen' | 'banner';
/** เสียงเตือน */
export type AlarmTone = 'beep' | 'siren' | 'chime';

export interface AlarmSettings {
  /** เปิด/ปิดการแจ้งเตือนทั้งระบบ */
  enabled: boolean;
  /** fullscreen = Andon เต็มจอ (ต้องกดรับทราบ) · banner = แถบแดงบนสุด (ไม่บังข้อมูล) */
  mode: AlarmMode;
  /** ข้อความหลักที่แสดง */
  title: string;
  /** fault ต้องเป็นจริงต่อเนื่องกี่วินาทีถึงแจ้ง (กันสัญญาณสั่น) */
  debounceSec: number;
  soundOn: boolean;
  tone: AlarmTone;
  /** 0–1 */
  volume: number;
  /** เสียงเตือนซ้ำทุกกี่วินาที */
  repeatSec: number;
  /** ชื่อแท็บเบราว์เซอร์กะพริบ */
  blinkTitle: boolean;
  /** รับทราบแล้วแต่ยังไม่หาย → เตือนซ้ำหลังกี่นาที (0 = ไม่เตือนซ้ำ) */
  remindMin: number;
  /** แสดงป้าย "กลับสู่ปกติ" กี่วินาที (0 = ไม่แสดง — ปิดการแจ้งเตือนเฉยๆ) */
  recoveredSec: number;
}

export const DEFAULT_ALARM: AlarmSettings = {
  enabled: true,
  mode: 'fullscreen',
  title: 'MACHINE FAULT',
  debounceSec: 3,
  soundOn: true,
  tone: 'beep',
  volume: 0.5,
  repeatSec: 1.4,
  blinkTitle: true,
  remindMin: 0,
  recoveredSec: 3,
};

const STORAGE_KEY = 'alarmSettings';

interface AlarmState {
  settings: AlarmSettings;
  /** โหลดค่าที่บันทึกไว้แล้วหรือยัง (ก่อนโหลดไม่ควรแจ้งเตือนด้วยค่าเริ่มต้นที่อาจต่างจากที่ผู้ใช้ตั้งไว้) */
  loaded: boolean;
  update: (patch: Partial<AlarmSettings>) => void;
  reset: () => void;
  /** ทดสอบ: จำลองว่า machine fault เกิดขึ้น (ไม่ผ่านการเชื่อมต่อจริง) */
  testFault: boolean;
  setTestFault: (v: boolean) => void;
  /** สถานะของ alarm ขณะนี้ (FaultAlarm เป็นผู้เขียน) — แสดงในหน้าตั้งค่าให้รู้ว่าตอนนี้เกิดอะไรอยู่ */
  phase: 'ok' | 'fault' | 'recovered';
  acknowledged: boolean;
}

const persist = (s: AlarmSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode ฯลฯ — ใช้ได้โดยไม่จำค่า */
  }
};

export const useAlarmStore = create<AlarmState>((set, get) => ({
  settings: DEFAULT_ALARM,
  loaded: false,
  testFault: false,
  phase: 'ok',
  acknowledged: false,
  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    persist(settings);
  },
  reset: () => {
    set({ settings: DEFAULT_ALARM });
    persist(DEFAULT_ALARM);
  },
  setTestFault: (testFault) => set({ testFault }),
}));

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** อ่านค่าที่บันทึกไว้ (ตรวจชนิด/ช่วงค่า กันข้อมูลเสีย) — เรียกหลัง mount เท่านั้น */
export function loadAlarmSettings(): AlarmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ALARM;
    const j = JSON.parse(raw) as Partial<AlarmSettings>;
    const d = DEFAULT_ALARM;
    return {
      enabled: typeof j.enabled === 'boolean' ? j.enabled : d.enabled,
      mode: j.mode === 'banner' ? 'banner' : 'fullscreen',
      title: typeof j.title === 'string' && j.title.trim() ? j.title.slice(0, 40) : d.title,
      debounceSec: clamp(j.debounceSec, 0, 10, d.debounceSec),
      soundOn: typeof j.soundOn === 'boolean' ? j.soundOn : d.soundOn,
      tone: j.tone === 'siren' || j.tone === 'chime' ? j.tone : 'beep',
      volume: clamp(j.volume, 0, 1, d.volume),
      repeatSec: clamp(j.repeatSec, 0.5, 10, d.repeatSec),
      blinkTitle: typeof j.blinkTitle === 'boolean' ? j.blinkTitle : d.blinkTitle,
      remindMin: clamp(j.remindMin, 0, 60, d.remindMin),
      recoveredSec: clamp(j.recoveredSec, 0, 30, d.recoveredSec),
    };
  } catch {
    return DEFAULT_ALARM;
  }
}
