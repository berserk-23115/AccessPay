import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AccessPay",
    short_name: "AccessPay",
    description: "Your accessible payment review workspace",
    start_url: "/workspace",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#3930a5",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
