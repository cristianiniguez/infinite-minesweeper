import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/minesweeper-core', '@repo/supabase'],
};

export default nextConfig;
