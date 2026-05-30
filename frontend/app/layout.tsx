import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VisAI - Ubah Gambar UI Menjadi Kode HTML",
  description: "Upload screenshot atau mockup design — Gemini AI akan menganalisis, membuat struktur JSON, lalu menghasilkan kode HTML + Tailwind siap pakai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <Navbar />
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col pt-32">
          {children}
        </div>
        <footer className="w-full py-8 text-center text-[#555] text-xs border-t border-[#111] mt-auto">
          &copy; {new Date().getFullYear()} VisAI. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
