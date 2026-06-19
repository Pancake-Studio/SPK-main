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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
