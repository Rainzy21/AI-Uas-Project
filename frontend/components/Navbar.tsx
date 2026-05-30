"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Beranda", path: "/" },
    { name: "Cara Kerja", path: "/cara-kerja" },
    { name: "Upload", path: "/upload" },
    { name: "Hasil", path: "/hasil" },
  ];

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-[#111111]/80 backdrop-blur-md border border-[#262626] rounded-full px-4 py-2 flex items-center gap-8 shadow-2xl">
        <div className="flex items-center gap-2 pr-4 border-r border-[#262626]">
          <div className="bg-[#262626] p-1.5 rounded-md">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">VisAI</span>
        </div>
        
        <ul className="flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <li key={link.path}>
                <Link
                  href={link.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-white border border-[#444] bg-[#222]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
