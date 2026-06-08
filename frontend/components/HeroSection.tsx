import Link from "next/link";
import { Sparkles, Zap, FileJson, Code, Globe, ArrowRight } from "lucide-react";

export default function HeroSection() {
  const features = [
    {
      icon: <Zap className="w-5 h-5 text-gray-400" />,
      title: "Upload Gambar",
      description: "Drag & drop atau pilih file gambar UI/design Anda",
    },
    {
      icon: <FileJson className="w-5 h-5 text-gray-400" />,
      title: "Analisis JSON",
      description: "OpenRouter AI mengurai komponen, warna, dan layout",
    },
    {
      icon: <Code className="w-5 h-5 text-gray-400" />,
      title: "Generate HTML",
      description: "Kode HTML + Tailwind CDN siap pakai otomatis",
    },
    {
      icon: <Globe className="w-5 h-5 text-gray-400" />,
      title: "Live Preview",
      description: "Pratinjau hasil render langsung di browser",
    },
  ];

  return (
    <section id="beranda" className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-4">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#333] bg-[#111] mb-8">
        <Sparkles className="w-3 h-3 text-gray-400" />
        <span className="text-xs font-semibold tracking-wider text-gray-400">POWERED BY OPENROUTER</span>
      </div>

      <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight mb-6 tracking-tight">
        Ubah Gambar UI <br />
        <span className="text-gray-500">Menjadi Kode HTML</span>
      </h1>

      <p className="text-gray-400 text-center max-w-2xl text-lg mb-10 leading-relaxed">
        Upload screenshot atau mockup design — OpenRouter AI akan <br className="hidden md:block"/>
        menganalisis, membuat struktur JSON, lalu menghasilkan <br className="hidden md:block"/>
        kode HTML + Tailwind siap pakai.
      </p>

      <div className="flex items-center gap-4 mb-24">
        <Link href="/upload" className="flex items-center gap-2 bg-[#262626] hover:bg-[#333] transition-colors text-white px-6 py-3 rounded-xl font-medium border border-[#333]">
          Mulai Sekarang <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/cara-kerja" className="flex items-center gap-2 bg-transparent hover:bg-[#111] transition-colors text-gray-300 px-6 py-3 rounded-xl font-medium border border-[#262626]">
          Cara Kerja
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl w-full">
        {features.map((feature, index) => (
          <div key={index} className="bg-[#111] border border-[#222] p-6 rounded-2xl hover:border-[#333] transition-colors">
            <div className="bg-[#1a1a1a] w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-[#262626]">
              {feature.icon}
            </div>
            <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
