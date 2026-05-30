import { UploadCloud } from "lucide-react";

export default function UploadSection() {
  return (
    <section id="upload" className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
      <div className="flex flex-col items-center mb-8">
        <div className="px-3 py-1.5 rounded-full border border-[#262626] bg-[#111] mb-6">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">LANGKAH 1 & 2</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Upload Gambar</h2>
        <p className="text-gray-400 text-center text-sm">
          Upload gambar design untuk diproses Gemini AI.
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-4">

        {/* Upload Dropzone */}
        <div className="w-full bg-[#0f0f0f] border border-[#222] rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[#141414] transition-colors group">
          <div className="bg-[#1a1a1a] p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-[#262626]">
            <UploadCloud className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-300 font-medium mb-2 text-sm">Drag & drop atau klik untuk upload</p>
          <p className="text-[#555] text-xs">PNG - JPG - WebP — Maks 20 MB</p>
        </div>
      </div>
    </section>
  );
}
