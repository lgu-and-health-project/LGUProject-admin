import type { NextConfig } from "next";

const secureHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY' // Prevents clickjacking by denying iframe embedding
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff' // Prevents MIME type sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()' // Disables access to hardware features
  }
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        // Apply these headers to all routes in the application
        source: '/(.*)',
        headers: secureHeaders,
      },
    ];
  },
};

export default nextConfig;
