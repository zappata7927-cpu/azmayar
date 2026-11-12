import type { Metadata, Viewport } from "next";
import Vazirmatn from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { BASE_PATH } from "@/lib/types";

const vazir = Vazirmatn({
  src: [
    { path: "../fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "آزمـیار | مرجع آموزشی آزمایش‌های آزمایشگاهی",
  description:
    "اپلیکیشن آموزشی آزمایش‌های آزمایشگاهی برای دانشجویان و کادر درمان (پرستاران و پزشکان) با دسته‌بندی موضوعی، جعبه لایتنر و آزمون مباحث خوانده‌شده. طراحی و ساخت: سید مجتبی کاظمی، عضو هیأت علمی گروه پرستاری دانشکده علوم پزشکی بهبهان",
  keywords: [
    "آزمایشگاه",
    "آزمایش‌های تشخیصی",
    "پرستاری",
    "پزشکی",
    "جعبه لایتنر",
    "آموزش علوم پزشکی",
    "تفسیر آزمایش خون",
  ],
  authors: [{ name: "سید مجتبی کاظمی" }],
  manifest: `${BASE_PATH}/manifest.json`,
  icons: {
    icon: `${BASE_PATH}/icons/favicon-64.png`,
    apple: `${BASE_PATH}/icons/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "آزمـیار",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f9488",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazir.variable} antialiased bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
