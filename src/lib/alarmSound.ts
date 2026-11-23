import type { AlarmTone } from '@/stores/alarmStore';

let ctx: AudioContext | null = null;

/** AudioContext เดียวทั้งแอป — เบราว์เซอร์ต้องมีการโต้ตอบ (คลิก/แตะ) ในหน้าอย่างน้อย 1 ครั้งก่อนถึงจะส่งเสียงได้ */
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

/** ปลดล็อกเสียงเมื่อผู้ใช้โต้ตอบครั้งแรก (ติดตั้งครั้งเดียวทั้งแอป) */
export function installAudioUnlock() {
  const unlock = () => {
    void audioContext()?.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

function note(c: AudioContext, hz: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine', toHz?: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, start);
  if (toHz) osc.frequency.linearRampToValueAtTime(toHz, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** เล่นเสียงเตือน 1 รอบ (volume 0–1) */
export function playAlarmTone(tone: AlarmTone, volume: number) {
  const c = audioContext();
  if (!c) return;
  void c.resume();
  const t = c.currentTime;
  const vol = Math.min(1, Math.max(0, volume));
  if (tone === 'beep') {
    // เสียงเดียวกับ demo: sine 880 → 660 Hz ความดังคงที่ (ความดัง 50% = gain 0.08 เท่ากับ demo)
    [880, 660].forEach((hz, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.value = hz;
      gain.gain.value = vol * 0.16;
      osc.connect(gain).connect(c.destination);
      osc.start(t + i * 0.22);
      osc.stop(t + i * 0.22 + 0.18);
    });
    return;
  }
  const v = vol * 0.3;                                  // siren / chime: 1.0 ของผู้ใช้ = 0.3 ของสัญญาณ (ไม่ให้แตก)
  if (tone === 'siren') note(c, 600, t, 0.7, v, 'sawtooth', 1000);
  else [660, 880, 1100].forEach((hz, i) => note(c, hz, t + i * 0.25, 0.45, v));   // chime
}
