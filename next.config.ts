import type { NextConfig } from 'next';

/** backend ที่ /api/* ถูก proxy ไป (อ่านตอน start/build ฝั่ง server) — เครื่องอื่นใน tailnet ตั้งเป็น http://<tailscale-ip>:8001 */
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');

/**
 * dev server: origin อื่นที่เปิดหน้าเว็บได้ (เช่น เปิดจากมือถือ/เครื่องอื่นใน LAN → http://192.168.1.114:3000)
 * ไม่ใส่ = Next เตือน "Cross origin request detected" (เฉพาะ dev ไม่กระทบ production) ; หลายค่าคั่นด้วย ,
 */
const ALLOWED_DEV_ORIGINS = (process.env.ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ALLOWED_DEV_ORIGINS,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
