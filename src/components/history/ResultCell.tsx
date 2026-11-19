'use client';

import { verdictStatus, type PredictionStatus } from '@/hooks/usePrediction';
import { Badge } from '@/components/ui/Badge';
import { useT } from '@/i18n/useT';

const VERDICT = { pass: 'PASS', ng: 'NG', pending: 'PENDING' } as const;

export interface VerdictSource {
  data?: Map<number, 'PASS' | 'NG'>;
  isError: boolean;
}

/** tag ผลของรถ 1 คัน — อ่านจาก map ผลของทั้งหน้า (usePageVerdicts); ไม่อยู่ใน map = "รอ predict" */
export function ResultCell({ bn, verdicts }: { bn: number; verdicts: VerdictSource }) {
  const { t } = useT();
  const status: PredictionStatus = verdictStatus(verdicts, bn);
  if (status === 'loading') return <span className="text-[12px] text-muted">…</span>;
  if (status === 'error') {
    return (
      <span className="text-[12px] text-muted" title={t('history.resultFailed')}>
        —
      </span>
    );
  }
  return <Badge verdict={VERDICT[status]} />;
}
