import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.trychannel3.com',
      },
      // Allow product images from various retailer CDNs
      // Channel3 returns product images from many different retailers
      // We allow HTTPS images from any domain for product images
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Additional security: only allow HTTPS images
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
  },
};

export default nextConfig;
