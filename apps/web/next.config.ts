import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: [
    "@accesspay/core",
    "@accesspay/react",
    "@accesspay/a11y",
    "@accesspay/merchant-adapter",
    "@accesspay/paypal",
    "@accesspay/ai",
  ],
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "development" ? "'unsafe-eval' " : ""}https://*.paypal.com https://*.paypalobjects.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com; font-src 'self'; connect-src 'self' https://*.paypal.com https://*.paypalobjects.com; frame-src https://*.paypal.com https://*.paypalobjects.com; object-src 'none'; base-uri 'self'; form-action 'self' https://*.paypal.com; frame-ancestors 'none'`,
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};
export default config;
