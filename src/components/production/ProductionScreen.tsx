import type { CSSProperties, ReactNode } from 'react';
import { FEATURES } from '@/lib/constants';
import type { FeatureKey, FeatureResults, Side } from '@/types/car';

/**
 * จอ production (ออกแบบที่ 1920×1080 — ดู brake-oil-filling-screens.html) แสดงผลตรวจของรถ 1 คัน
 *  ok = PASS · ng = NG (ระบุฟีเจอร์ที่ไม่ผ่านในช่อง Defect) · wait = รอผล/รถกำลังเติม · nomodel = ไม่มีโมเดลสำหรับรถรุ่นนี้
 * เป็น presentational ล้วน — ข้อมูลจริงมาจาก useProductionScreen, ตัวอย่างมาจาก PRODUCTION_DEMO
 */
export type ScreenKind = 'ok' | 'ng' | 'wait' | 'nomodel';

export interface ScreenData {
  kind: ScreenKind;
  side: Side;
  /** วันที่ของรถ (จากตาราง machine) — null = ยังไม่รู้ */
  date: Date | null;
  bn: number | null;
  /** ok / ng เท่านั้น */
  features?: FeatureResults;
}

export interface ScreenText {
  fillingDollySite: string;
  date: string;
  bodyNo: string;
  defect: string;
  none: string;
  waiting: string;
  brakeOilFilling: string;
  noModel: string;
  noModelDetail: string;
  featureNames: Record<FeatureKey, string>;
}

const BG: Record<ScreenKind, string> = { ok: '#0E7C3A', ng: '#C62828', wait: '#1D4E89', nomodel: '#B45309' };
const WHITE = '#FFFFFF';
const NG_RED = '#C62828';

const upper: CSSProperties = { textTransform: 'uppercase' };
const panel: CSSProperties = {
  boxSizing: 'border-box',
  padding: '20px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  background: 'rgba(0, 0, 0, 0.28)',
  borderRadius: 20,
  minWidth: 0,
};
const label: CSSProperties = { fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', ...upper };
const bigValue: CSSProperties = { fontSize: 60, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' };

const fmtDate = (d: Date | null) =>
  d ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}` : '—';

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...panel, ...style }}>{children}</div>;
}

function ResultScreen({ d, text }: { d: ScreenData; text: ScreenText }) {
  const ng = d.kind === 'ng';
  const failed = d.features ? FEATURES.filter((f) => !d.features![f.key].pass) : [];
  const cell: CSSProperties = { justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 10 };
  const value: CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' };
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 756, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 700, fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em' }}>{ng ? 'NG' : 'OK'}</h1>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          bottom: 40,
          display: 'grid',
          gridTemplateColumns: '300px minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateRows: '172px 150px',
          gap: 24,
        }}
      >
        <Panel style={{ gridColumn: '1 / -1', gridRow: 2, paddingTop: 16, paddingBottom: 16, gap: 8 }}>
          <span style={label}>{text.defect}</span>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {failed.length === 0 ? (
              <span
                style={{
                  minWidth: 520,
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  padding: '8px 40px',
                  borderRadius: 14,
                  background: WHITE,
                  color: BG.ok,
                  fontSize: 52,
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                  ...upper,
                }}
              >
                <svg role="img" aria-label={text.none} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {text.none}
              </span>
            ) : (
              failed.map((f) => (
                <span
                  key={f.key}
                  style={{ padding: '10px 28px', borderRadius: 14, background: WHITE, color: NG_RED, fontSize: 36, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.2, ...upper }}
                >
                  {text.featureNames[f.key]}
                </span>
              ))
            )}
          </div>
        </Panel>
        <Panel style={{ gridColumn: 1, gridRow: 1, alignItems: 'center', textAlign: 'center' }}>
          <span style={{ ...label, alignSelf: 'flex-start', textAlign: 'left' }}>{text.fillingDollySite}</span>
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 900, lineHeight: 1 }}>{d.side}</span>
        </Panel>
        <Panel style={{ gridColumn: 2, gridRow: 1, ...cell }}>
          <span style={label}>{text.date}</span>
          <span style={value}>{fmtDate(d.date)}</span>
        </Panel>
        <Panel style={{ gridColumn: 3, gridRow: 1, ...cell }}>
          <span style={label}>{text.bodyNo}</span>
          <span style={value}>{d.bn ?? '—'}</span>
        </Panel>
      </div>
    </>
  );
}

function WaitScreen({ d, text }: { d: ScreenData; text: ScreenText }) {
  const dot = (delay: number): CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: WHITE,
    animation: 'prod-pulse 1.2s ease-in-out infinite',
    animationDelay: `${delay}s`,
  });
  return (
    <>
      <div style={{ position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.14em', ...upper }}>{text.brakeOilFilling}</span>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.1em', padding: '4px 18px', border: `3px solid ${WHITE}`, borderRadius: 10 }}>{d.side}</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
        <h1 style={{ margin: 0, fontSize: 340, fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em' }}>{text.waiting}</h1>
        <div role="img" aria-label={text.waiting} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {[0, 0.25, 0.5].map((x) => (
            <span key={x} className="prod-dot" style={dot(x)} />
          ))}
        </div>
      </div>
    </>
  );
}

function NoModelScreen({ d, text }: { d: ScreenData; text: ScreenText }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 868, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 280, fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em' }}>{text.noModel}</h1>
        <p style={{ margin: 0, fontSize: 64, fontWeight: 700, lineHeight: 1.3 }}>{text.noModelDetail}</p>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 120,
          right: 120,
          bottom: 40,
          display: 'grid',
          gridTemplateColumns: '300px minmax(0, 1fr) minmax(0, 1fr)',
          gridTemplateRows: '172px',
          gap: 24,
        }}
      >
        <Panel>
          <span style={label}>{text.fillingDollySite}</span>
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, fontWeight: 900, lineHeight: 1 }}>{d.side}</span>
        </Panel>
        <Panel style={{ justifyContent: 'space-between' }}>
          <span style={label}>{text.date}</span>
          <span style={{ ...bigValue, fontSize: 72 }}>{fmtDate(d.date)}</span>
        </Panel>
        <Panel style={{ justifyContent: 'space-between' }}>
          <span style={label}>{text.bodyNo}</span>
          <span style={{ ...bigValue, fontSize: 72 }}>{d.bn ?? '—'}</span>
        </Panel>
      </div>
    </>
  );
}

/** ขนาดคงที่ 1920×1080 — ผู้เรียกย่อ/ขยายด้วย transform */
export function ProductionScreen({ data, text }: { data: ScreenData; text: ScreenText }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: BG[data.kind],
        color: WHITE,
        fontFamily: "'Noto Sans', 'Noto Sans Thai', system-ui, sans-serif",
      }}
    >
      {data.kind === 'wait' ? <WaitScreen d={data} text={text} /> : data.kind === 'nomodel' ? <NoModelScreen d={data} text={text} /> : <ResultScreen d={data} text={text} />}
    </div>
  );
}
