import { AlarmSettingsView } from '@/components/settings/AlarmSettingsView';

export const metadata = { title: 'Alarm settings · ตั้งค่าแจ้งเตือน — Brake Oil Filling' };

/** ตั้งค่าการแจ้งเตือน machine fault: /settings/alarm */
export default function AlarmSettingsPage() {
  return <AlarmSettingsView />;
}
