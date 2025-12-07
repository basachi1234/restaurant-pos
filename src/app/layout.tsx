import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ตั้งค่า Metadata ของเว็บ
export const metadata: Metadata = {
  title: "Restaurant POS",
  description: "ระบบจัดการร้านอาหาร",
  manifest: "/manifest.json", // ลิงก์ไปยังไฟล์ manifest (PWA)
};

// ตั้งค่า Viewport (สำหรับมือถือและการแสดงผลเต็มจอ)
export const viewport: Viewport = {
  themeColor: "#2563eb", // สีธีมของ Browser bar
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // ห้ามขยายหน้าจอ (ให้ความรู้สึกเหมือนแอป)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}