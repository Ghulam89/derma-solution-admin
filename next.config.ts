import type { NextConfig } from "next";

const enableAnalyzer = process.env.ANALYZE === 'true';

let withBundleAnalyzer: (cfg: NextConfig) => NextConfig = (c) => c;
if (enableAnalyzer) {
  try {
    // require only when ANALYZE is enabled so builds don't fail if the package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    withBundleAnalyzer = bundleAnalyzer;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('@next/bundle-analyzer not installed — skipping analyzer.');
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Suppress webpack warnings for Supabase (known Edge Runtime warnings)
  webpack: (config, { isServer }) => {
    // Suppress warnings for all builds (both server and client)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@supabase/ },
      { message: /A Node\.js API is used/ },
      { message: /process\.version/ },
      { message: /process\.versions/ },
      // Suppress webpack cache performance warnings
      { message: /Serializing big strings/ },
      { message: /PackFileCacheStrategy/ },
    ];
    
    // Optimize webpack cache settings to reduce serialization warnings
    if (config.cache && typeof config.cache === 'object') {
      config.cache = {
        ...config.cache,
        compression: 'gzip', // Use compression for cache
        maxMemoryGenerations: 1, // Reduce memory generations
      };
    }
    
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
