// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // BlogTeaser (Unsplash)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // VendorCard avatar dummy
      { protocol: 'https', hostname: 'i.pravatar.cc' },

      // (Siapkan untuk data produksi nanti, aman untuk dibiarkan)
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
};

export default nextConfig;
