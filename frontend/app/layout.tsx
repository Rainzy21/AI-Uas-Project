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
  description: "Upload screenshot atau mockup design — OpenRouter AI akan menganalisis, membuat struktur JSON, lalu menghasilkan kode HTML + Tailwind siap pakai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Lewati ke konten
        </a>
        <Navbar />
        <div
          id="main-content"
          className="flex-1 w-full max-w-7xl mx-auto flex flex-col pt-32"
        >
          {children}
        </div>
        <footer className="w-full py-8 text-center text-gray-500 text-xs border-t border-[#111] mt-auto">
          <p>&copy; {new Date().getFullYear()} VisAI. All rights reserved.</p>
          <p className="mt-2">
            <a href="/kebijakan-privasi" className="hover:text-gray-300 transition-colors">
              Kebijakan Privasi &amp; Penggunaan Data AI
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
