'use client';

import { useEffect } from 'react';
import { loadAlarmSettings, useAlarmStore } from '@/stores/alarmStore';

/**
 * โหลดค่าตั้งค่าแจ้งเตือนที่บันทึกไว้ (localStorage) เข้า store — ทำหลัง mount (ไม่ทำตอน SSR กัน hydration ไม่ตรงกัน)
 * ผูกกับ `loaded` แทนที่จะรันครั้งเดียวตอน mount: ถ้า store ถูกสร้างใหม่ (เช่น hot reload ตอนพัฒนา) loaded จะกลับเป็น false
 * แล้วโหลดซ้ำเอง — ไม่งั้นการแจ้งเตือนจะค้างไม่ทำงานจนกว่าจะรีเฟรชหน้า
 */
export function useAlarmSettingsLoader() {
  const loaded = useAlarmStore((s) => s.loaded);
  useEffect(() => {
    if (!loaded) useAlarmStore.setState({ settings: loadAlarmSettings(), loaded: true });
  }, [loaded]);
}
