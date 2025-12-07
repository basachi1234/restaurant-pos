// @ts-nocheck

/** @type {import('next').NextConfig} */
const nextConfig = {
  // อนุญาตให้โหลดรูปจาก Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;