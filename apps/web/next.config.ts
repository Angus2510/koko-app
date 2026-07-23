import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js to compile workspace packages (which ship TypeScript source)
  transpilePackages: ["@koko/database", "@koko/types", "@koko/utils"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  // Silence Prisma's require() warnings in Next.js edge runtime
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
