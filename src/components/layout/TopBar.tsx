'use client';

import { useRecentPredictions } from '@/hooks/useRecentPredictions';
import { formatClock } from '@/lib/format';
import { useT } from '@/i18n/useT';
import { useLiveStore } from '@/stores/liveStore';
import { Chip, type DotTone } from '@/components/ui/Chip';
import { LocaleSwitch } from './LocaleSwitch';
import { NavTabs } from './NavTabs';
import { ThemeSwitch } from './ThemeSwitch';
import { WsChip } from './WsChip';

export function TopBar() {
  const { t } = useT();
  const lastUpdate = useLiveStore((s) => s.lastUpdate);
  const { isError, isSuccess } = useRecentPredictions();
  const apiTone: DotTone = isError ? 'bad' : isSuccess ? 'ok' : 'warn';

  return (
    <header className="mb-4 flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface px-[18px] py-3.5">
      <div>
        <h1 className="m-0 text-[16px] font-[650] tracking-[0.2px]">
          {t('top.title')}
        </h1>
        <div className="text-[12px] text-muted">
          {t('top.subtitle', { time: lastUpdate ? formatClock(lastUpdate) : '—' })}
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <NavTabs />
        <WsChip />
        <Chip dot={apiTone}>{isError ? t('top.apiDown') : 'API'}</Chip>
        <LocaleSwitch />
        <ThemeSwitch />
      </div>
    </header>
  );
}
