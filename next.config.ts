import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/logos/aa-import/:file(.*\\.zip)",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
      {
        source: "/logos/aa-import/:file(.*\\.mp4)",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
      {
        source: "/logos/cleaners/:file(.*\\.zip)",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
      {
        source: "/logos/cleaners/:file(.*\\.mp4)",
        headers: [{ key: "Content-Disposition", value: "attachment" }],
      },
    ];
  },
};

export default nextConfig;
