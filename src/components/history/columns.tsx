import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useT } from '@/i18n/useT';
import { formatShortDateTime } from '@/lib/format';
import type { MachineCar } from '@/types/car';
import { ResultCell, type VerdictSource } from './ResultCell';

declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    verdicts: VerdictSource;
  }
}

const col = createColumnHelper<MachineCar>();

export function useColumns() {
  const { t } = useT();
  return useMemo(
    () => [
  col.accessor('dt', { header: t('history.col.dt'), cell: (c) => (c.getValue() ? formatShortDateTime(c.getValue()) : '—') }),
  col.accessor('bn', { header: 'bn' }),
  col.accessor('asn', { header: 'asn', cell: (c) => c.getValue() ?? '—' }),
  col.accessor('pgnum', { header: 'pgnum' }),
  col.accessor('side', { header: t('history.col.side'), cell: (c) => <span className="text-[11px] text-muted">{c.getValue()}</span> }),
  col.display({ id: 'result', header: t('history.col.result'), cell: (c) => <ResultCell bn={c.row.original.bn} verdicts={c.table.options.meta!.verdicts} /> }),
],
    [t],
  );
}
