'use client';

import type { ReactNode } from 'react';
import { LocaleSwitch } from '@/components/layout/LocaleSwitch';
import { NavTabs } from '@/components/layout/NavTabs';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';
import { WsChip } from '@/components/layout/WsChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Toggle } from '@/components/ui/Toggle';
import type { MessageKey } from '@/i18n/messages';
import { useT } from '@/i18n/useT';
import { playAlarmTone } from '@/lib/alarmSound';
import { useAlarmStore, type AlarmMode, type AlarmTone } from '@/stores/alarmStore';
import { useLiveStore } from '@/stores/liveStore';

const MODES: { value: AlarmMode; key: MessageKey }[] = [
  { value: 'fullscreen', key: 'settings.mode.fullscreen' },
  { value: 'banner', key: 'settings.mode.banner' },
];
const TONES: { value: AlarmTone; key: MessageKey }[] = [
  { value: 'beep', key: 'settings.tone.beep' },
  { value: 'siren', key: 'settings.tone.siren' },
  { value: 'chime', key: 'settings.tone.chime' },
];

const Help = ({ children }: { children: ReactNode }) => <p className="m-0 mt-1 text-[12px] text-muted">{children}</p>;

/** หน้าตั้งค่าการแจ้งเตือน machine fault (/settings/alarm) — ค่าบันทึกใน localStorage ของเบราว์เซอร์นี้ */
export function AlarmSettingsView() {
  const { t } = useT();
  const s = useAlarmStore((x) => x.settings);
  const update = useAlarmStore((x) => x.update);
  const reset = useAlarmStore((x) => x.reset);
  const testFault = useAlarmStore((x) => x.testFault);
  const setTestFault = useAlarmStore((x) => x.setTestFault);
  const phase = useAlarmStore((x) => x.phase);
  const acknowledged = useAlarmStore((x) => x.acknowledged);
  // machine_fault = true คือผิดปกติ → แจ้งเตือน ; false = ปกติ
  const signal = useLiveStore((x) => (x.common ? x.common.machine_fault : null));
  const liveFault = signal;

  const radio = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${
      active ? 'border-s1/55 bg-s1/18 text-text' : 'border-border bg-surface-2 text-text-2 hover:border-muted'
    }`;

  return (
    <div className="min-h-dvh">
      <header className="flex flex-wrap items-center gap-4 border-b border-border bg-surface px-5 py-2.5">
        <h1 className="m-0 text-[15px] font-[650] tracking-[0.2px]">{t('settings.alarm.title')}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <NavTabs />
          <WsChip />
          <LocaleSwitch />
          <ThemeSwitch />
        </div>
      </header>

      <main className="mx-auto flex max-w-[820px] flex-col gap-4 px-5 pb-[60px] pt-[18px]">
        <p className="m-0 text-[13px] text-muted">{t('settings.alarm.intro')}</p>

        <Card title={t('settings.test')}>
          <p className="m-0 mb-3 text-[13px] text-muted">{t('settings.testNote')}</p>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => setTestFault(!testFault)} className={testFault ? '!bg-crit' : '!bg-s1'}>
              {testFault ? t('settings.testStop') : t('settings.testStart')}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {t('settings.reset')}
            </Button>
          </div>

          {/* สถานะตอนนี้: ช่วยให้รู้ว่าทำไมกดแล้วเห็น/ไม่เห็นการแจ้งเตือน */}
          <div className="mt-3.5 flex flex-col gap-1 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[12px] text-text-2">
            <div>
              {t('settings.liveSignal')}:{' '}
              <b className={liveFault ? 'text-crit-soft' : 'text-pass-soft'}>
                {liveFault === null ? t('settings.live.none') : liveFault ? t('settings.live.fault') : t('settings.live.ok')}
              </b>
              {signal !== null && <span className="text-muted"> (machine_fault = {String(signal)})</span>}
            </div>
            <div>
              {t('settings.state')}:{' '}
              <b className="text-text">
                {phase === 'fault'
                  ? acknowledged
                    ? t('settings.state.acked')
                    : t('settings.state.alarm')
                  : phase === 'recovered'
                    ? t('settings.state.recovered')
                    : t('settings.state.ok')}
              </b>
              {testFault ? ` · ${t('alarm.testMode')}` : ''}
            </div>
            {!s.enabled && <div className="text-pending-soft">{t('settings.disabledNote')}</div>}
          </div>
        </Card>

        <Card title={t('settings.general')}>
          <div className="flex flex-col gap-4">
            <Toggle pressed={s.enabled} onToggle={() => update({ enabled: !s.enabled })}>
              {t('settings.enabled')}
            </Toggle>

            <Field label={t('settings.mode')}>
              <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                  <label key={m.value} className={radio(s.mode === m.value)}>
                    <input type="radio" name="alarm-mode" checked={s.mode === m.value} onChange={() => update({ mode: m.value })} />
                    {t(m.key)}
                  </label>
                ))}
              </div>
            </Field>

            <Field label={t('settings.titleText')} htmlFor="al-title">
              <input
                id="al-title"
                className="ctl !w-full max-w-[420px]"
                maxLength={40}
                value={s.title}
                onChange={(e) => update({ title: e.target.value })}
                onBlur={() => !s.title.trim() && update({ title: 'MACHINE FAULT' })}
              />
            </Field>

            <Field label={`${t('settings.debounce')}: ${s.debounceSec}`} htmlFor="al-debounce">
              <input
                id="al-debounce"
                type="range"
                min={0}
                max={10}
                step={1}
                value={s.debounceSec}
                onChange={(e) => update({ debounceSec: Number(e.target.value) })}
                className="w-full max-w-[420px]"
              />
              <Help>{t('settings.debounceHelp')}</Help>
            </Field>
          </div>
        </Card>

        <Card title={t('settings.sound')}>
          <div className="flex flex-col gap-4">
            <Toggle pressed={s.soundOn} onToggle={() => update({ soundOn: !s.soundOn })}>
              {t('settings.soundOn')}
            </Toggle>

            <Field label={t('settings.tone')}>
              <div className="flex flex-wrap items-center gap-2">
                {TONES.map((x) => (
                  <label key={x.value} className={radio(s.tone === x.value)}>
                    <input type="radio" name="alarm-tone" checked={s.tone === x.value} onChange={() => update({ tone: x.value })} />
                    {t(x.key)}
                  </label>
                ))}
                <Button variant="ghost" onClick={() => playAlarmTone(s.tone, s.volume)}>
                  ▶ {t('settings.preview')}
                </Button>
              </div>
            </Field>

            <Field label={`${t('settings.volume')}: ${Math.round(s.volume * 100)}%`} htmlFor="al-volume">
              <input
                id="al-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.volume}
                onChange={(e) => update({ volume: Number(e.target.value) })}
                className="w-full max-w-[420px]"
              />
            </Field>

            <Field label={`${t('settings.repeat')}: ${s.repeatSec}`} htmlFor="al-repeat">
              <input
                id="al-repeat"
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={s.repeatSec}
                onChange={(e) => update({ repeatSec: Number(e.target.value) })}
                className="w-full max-w-[420px]"
              />
              <Help>{t('settings.soundNote')}</Help>
            </Field>
          </div>
        </Card>

        <Card title={t('settings.other')}>
          <div className="flex flex-col gap-4">
            <Toggle pressed={s.blinkTitle} onToggle={() => update({ blinkTitle: !s.blinkTitle })}>
              {t('settings.blink')}
            </Toggle>

            <Field label={t('settings.remind')} htmlFor="al-remind">
              <input
                id="al-remind"
                className="ctl !w-[120px]"
                type="number"
                min={0}
                max={60}
                value={s.remindMin}
                onChange={(e) => update({ remindMin: Math.min(60, Math.max(0, Number(e.target.value) || 0)) })}
              />
            </Field>

            <Field label={t('settings.recoveredSec')} htmlFor="al-recovered">
              <input
                id="al-recovered"
                className="ctl !w-[120px]"
                type="number"
                min={0}
                max={30}
                value={s.recoveredSec}
                onChange={(e) => update({ recoveredSec: Math.min(30, Math.max(0, Number(e.target.value) || 0)) })}
              />
            </Field>
          </div>
        </Card>

      </main>
    </div>
  );
}
