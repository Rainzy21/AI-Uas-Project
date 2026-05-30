import { Image as ImageIcon, Send, FileJson, Code, ArrowDown } from "lucide-react";

export default function PipelineSection() {
  const steps = [
    {
      id: "01",
      icon: <ImageIcon className="w-5 h-5 text-gray-400" />,
      title: "Upload Gambar",
      description: "Upload screenshot, mockup, atau foto design apapun — PNG, JPG, WebP hingga 20 MB.",
      note: "Gambar dikonversi ke base64 di sisi server. Tidak ada gambar yang disimpan permanen.",
    },
    {
      id: "02",
      icon: <Send className="w-5 h-5 text-gray-400" />,
      title: "Kirim ke Gemini API",
      description: "Gambar dikirim ke Google Gemini 2.0 Flash bersama prompt terstruktur untuk analisis mendalam.",
      note: "Menggunakan model multimodal Gemini dengan temperature 0.2 untuk output yang konsisten dan terstruktur.",
    },
    {
      id: "03",
      icon: <FileJson className="w-5 h-5 text-gray-400" />,
      title: "Ekstraksi JSON",
      description: "Gemini mengurai komponen UI, hierarki layout, palet warna, tipografi, dan gaya desain ke dalam JSON.",
      note: "JSON terstruktur mencakup: title, layout, components[], colorPalette, typography, style.",
    },
    {
      id: "04",
      icon: <Code className="w-5 h-5 text-gray-400" />,
      title: "Generate HTML + Tailwind",
      description: "Dari analisis tersebut, Gemini menghasilkan kode HTML lengkap dengan Tailwind CDN yang mereproduksi desain.",
      note: "Output berupa file HTML standalone — bisa langsung dibuka di browser tanpa setup apapun.",
    },
  ];

  return (
    <section id="cara-kerja" className="py-24 px-4 flex flex-col items-center">
      <div className="max-w-3xl w-full flex flex-col items-center gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="w-full flex flex-col items-center">
            <div className="w-full bg-[#0a0a0a] border border-[#222] p-8 rounded-3xl flex gap-6 hover:border-[#333] transition-colors">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-[#161616] border border-[#262626] w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
                  {step.icon}
                </div>
                <span className="text-[#444] font-mono text-xs font-semibold">{step.id}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{step.description}</p>
                <div className="inline-block bg-[#161616] border border-[#262626] rounded-lg px-4 py-2">
                  <p className="text-gray-500 text-xs italic">{step.note}</p>
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="py-4">
                <ArrowDown className="w-5 h-5 text-[#333]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
