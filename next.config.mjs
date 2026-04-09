/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // FFmpeg packages should only be bundled on the client
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@ffmpeg/ffmpeg': 'commonjs @ffmpeg/ffmpeg',
        '@ffmpeg/util': 'commonjs @ffmpeg/util',
      });
    }
    return config;
  },
  // Required for SharedArrayBuffer (needed by FFmpeg.wasm)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
}

export default nextConfig
