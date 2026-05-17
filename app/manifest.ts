import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zyber Dashboard",
    short_name: "Zyber",
    description: "Zyber organization dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#1a0a29",
    theme_color: "#1a0a29",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
