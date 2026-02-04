import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // typedRoutes does not include dynamic page routes, i.e. /dashboard/[id]
  // typedRoutes: true,
};

export default nextConfig;
