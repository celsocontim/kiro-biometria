/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://personal-zx6yray0.outsystemscloud.com"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
