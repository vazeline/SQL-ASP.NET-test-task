import type { NextConfig } from "next";

/**
 * Адрес ASP.NET Core API (совпадает с http-профилем launchSettings.json).
 * Используется как в server-side коде, так и в прокси.
 */
const DEFAULT_API_ORIGIN = "http://localhost:5089";

function resolveApiOrigin(): string {
  return process.env.API_ORIGIN ?? DEFAULT_API_ORIGIN;
}

const nextConfig: NextConfig = {
  async rewrites() {
    // API_ORIGIN читается именно здесь, а не на верхнем уровне модуля:
    // при `next start` файл .env.local ещё не загружен в момент вычисления
    // конфига, и константа уровня модуля получила бы фолбэк вместо .env.local.
    const apiOrigin = resolveApiOrigin();

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;