import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { themeInitScript } from "@/lib/theme";
import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${SCHOOL_NAME}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "ศูนย์กลางข้อมูลและเครื่องมือสำหรับครูและนักเรียน โรงเรียนสันติสุขพิยาคม",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "โรงเรียนสันติสุขพิยาคม" },
  icons: {
    icon: [
      { url: "/icon-192-ro.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512-ro.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS ignores SVG — needs a PNG apple-touch-icon (also used as PWA home-screen icon).
    apple: [{ url: "/icon-512-full-apple.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0b1a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${inter.variable} ${notoThai.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
