'use client';

import { useT } from '@/i18n/useT';
import type { MessageKey } from '@/i18n/messages';
import { useLiveStore } from '@/stores/liveStore';
import type { WsStatus } from '@/types/ws';
import { Chip, type DotTone } from '@/components/ui/Chip';

const WS_CHIP: Record<WsStatus, { tone: DotTone; key: MessageKey }> = {
  open: { tone: 'ok', key: 'ws.open' },
  connecting: { tone: 'warn', key: 'ws.connecting' },
  reconnecting: { tone: 'warn', key: 'ws.reconnecting' },
  disabled: { tone: 'bad', key: 'ws.disabled' },
};

/** สถานะการเชื่อมต่อ WebSocket (Real-time) — ใช้ร่วมใน TopBar และหน้า 3D */
export function WsChip() {
  const { t } = useT();
  const wsStatus = useLiveStore((s) => s.wsStatus);
  const ws = WS_CHIP[wsStatus];
  return <Chip dot={ws.tone}>{t(ws.key)}</Chip>;
}
