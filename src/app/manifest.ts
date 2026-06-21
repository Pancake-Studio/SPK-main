import type { MetadataRoute } from "next";
import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${SCHOOL_NAME}`,
    short_name: "SPK",
    description:
      "แพลตฟอร์มดิจิทัลกลางของโรงเรียน — ตารางสอน การแลกคาบ และการแจ้งเตือน",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F7FC",
    theme_color: "#7C3AED",
    categories: ["education", "productivity"],
    lang: "th",
    icons: [
      // Raster PNGs first — required for Android/iOS install + notification icons.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // SVG fallback for browsers that prefer scalable icons.
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
