import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Profile photos up to 4 MB plus multipart overhead, under Vercel's 4.5 MB request cap.
    serverActions: { bodySizeLimit: '4.4mb' },
  },
};

export default nextConfig;
