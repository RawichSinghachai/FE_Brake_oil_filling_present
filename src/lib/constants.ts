import type { FeatureConfig, Side } from '@/types/car';

/** จำนวนชุด compare สูงสุด */
export const MAX_COMPARE = 5;

/** ตารางประวัติ: จำนวนรถต่อหน้า (ตัดหน้าฝั่ง client) */
export const HISTORY_PAGE_SIZE = 10;
/** หน้ารายละเอียดรถ: แสดงไม่เกินกี่จุด/แถวต่อกราฟ (1 แถว ≈ 1 รอบอ่านค่า) — เกินแล้วเอาล่าสุด */
export const MAX_DETAIL_ROWS = 150;
/** vacuumgun: ค่าที่พุ่งเกินนี้แสดงผลเป็นค่านี้ (ทั้ง LH และ RH) */
export const VACUUM_DISPLAY_MAX = 1200;
/** vacuumpump: เพดานแสดงผล (ทั้ง LH และ RH) */
export const VACUUM_PUMP_DISPLAY_MAX = 1200;
/** เส้น standard ของ vacuumgun (ตีเส้นในกราฟ vacuumgun ที่ไม่ได้ plot ซ้อนกัน) */
export const VACUUM_GUN_STANDARD = 130;
/** เส้นประอ้างอิงของกราฟ filling pressure (ตีทุกกราฟ pressure: Dashboard, หน้ารายละเอียดรถ, หน้า 3D) */
export const PRESSURE_STANDARDS: readonly number[] = [250, 300];
export const NG_DAYS = 7;

/** รอบ polling (ms) */
export const POLL_RECENT_MS = 30_000;
/** รอบดึงรถล่าสุดของตารางประวัติ (เฉพาะตอนอยู่หน้า 1) */
export const POLL_HISTORY_MS = 5_000;
/** รอบถามผล predict ของ bn ที่กำลังวิ่งอยู่ จนกว่าจะได้ผล */
export const POLL_PREDICTION_MS = 3_000;
/** รอบถามผล predict ของรถในตารางประวัติทั้งหน้า (1 request) */
export const POLL_VERDICT_PAGE_MS = 10_000;

/**
 * สีสำหรับ SVG/recharts — series/predict/standard เป็น hex (ใช้ร่วมสองธีม); สีโทนพื้น (grid/muted/…) อ้าง CSS variable ตามธีม (ดู app/globals.css)
 */
export const COLORS = {
  s1: '#3987e5',
  s2: '#d95926',
  s3: '#199e70',
  grid: 'var(--color-grid)',
  baseline: 'var(--color-baseline)',
  muted: 'var(--color-muted)',
  text2: 'var(--color-text-2)',
  surface: 'var(--color-surface)',
  predict: '#e34948',
  /** เส้น standard (vacuumgun) */
  standard: '#c98500',
  /** สีของ input line ตามลำดับชุด (slot) */
  series: ['#3987e5', '#199e70', '#c98500', '#d55181', '#6250d6'],
} as const;

export const SIDES: readonly Side[] = ['LH', 'RH'];

export const SIDE_COLOR: Record<Side, string> = {
  LH: COLORS.s1,
  RH: COLORS.s3,
};

export const FEATURES: readonly FeatureConfig[] = [
  { key: 'pres', name: 'filling pressure', rawName: 'fillingpressure', apiKey: 'pressure', unit: 'kPa' },
  { key: 'vol', name: 'filling volume', rawName: 'fillingvolume', apiKey: 'volume', unit: 'CC' },
  { key: 'vac', name: 'vacuumgun', rawName: 'vacuumgun', apiKey: 'vacuumgun', unit: 'Pa' },
];
