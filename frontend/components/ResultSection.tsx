import Link from "next/link";
import { FileCode2 } from "lucide-react";

export default function ResultSection() {
  return (
    <section id="hasil" className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="bg-[#111] border border-[#222] p-4 rounded-2xl mb-6">
          <FileCode2 className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">Belum Ada Hasil</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Proses gambar terlebih dahulu untuk melihat hasil di sini.
        </p>
        <Link 
          href="/upload"
          className="bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] transition-colors text-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium"
        >
          Ke Upload &rarr;
        </Link>
      </div>
    </section>
  );
}
