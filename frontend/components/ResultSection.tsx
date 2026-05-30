"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileCode2, Copy, Check, LayoutTemplate, Code2, UploadCloud } from "lucide-react";

interface Analysis {
  title: string;
  layout: string;
  components: { name: string; description: string; position: string }[];
  colorPalette: string[];
  typography: { headings: string; body: string; style: string };
  style: string;
}

interface VisAIResult {
  analysis: Analysis;
  html: string;
  timestamp: number;
}

export default function ResultSection() {
  const router = useRouter();
  const [result, setResult] = useState<VisAIResult | null>(null);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("visai_result");
    if (stored) {
      try {
        // Client-only localStorage read after mount avoids hydration mismatch;
        // setting state here is intentional.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult(JSON.parse(stored));
      } catch {
        // corrupted data, ignore
      }
    }
  }, []);

  // Q4: Await the clipboard promise; only show success if it actually succeeded.
  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed (permissions / non-secure context) — fail silently.
    }
  }

  function handleNewUpload() {
    localStorage.removeItem("visai_result");
    router.push("/upload");
  }

  // Empty state
  if (!result) {
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

  // S2: Apply defensive defaults so a partially-shaped response doesn't crash the render.
  const analysis: Analysis = {
    title: result.analysis?.title ?? "Untitled",
    layout: result.analysis?.layout ?? "",
    components: result.analysis?.components ?? [],
    colorPalette: result.analysis?.colorPalette ?? [],
    typography: result.analysis?.typography ?? { headings: "", body: "", style: "" },
    style: result.analysis?.style ?? "",
  };
  const html = result.html ?? "";

  return (
    <section id="hasil" className="py-24 px-4 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="px-3 py-1.5 rounded-full border border-[#262626] bg-[#111] inline-block mb-3">
              <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">HASIL ANALISIS</span>
            </div>
            <h2 className="text-2xl font-bold text-white">{analysis.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{analysis.style}</p>
          </div>
          <button
            onClick={handleNewUpload}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] transition-colors text-gray-300 px-4 py-2 rounded-lg text-sm font-medium shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Baru
          </button>
        </div>

        {/* Metadata cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Color palette */}
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Color Palette</p>
            <div className="flex flex-wrap gap-2">
              {analysis.colorPalette.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-md border border-[#333]"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-gray-400 text-xs font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Typography</p>
            <p className="text-gray-400 text-xs mb-1"><span className="text-gray-600">Headings:</span> {analysis.typography.headings}</p>
            <p className="text-gray-400 text-xs mb-1"><span className="text-gray-600">Body:</span> {analysis.typography.body}</p>
            <p className="text-gray-400 text-xs"><span className="text-gray-600">Style:</span> {analysis.typography.style}</p>
          </div>

          {/* Layout */}
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Layout</p>
            <p className="text-gray-400 text-xs leading-relaxed">{analysis.layout}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#1a1a1a]">
            <button
              onClick={() => setTab("preview")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === "preview"
                  ? "text-white border-b-2 border-white -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setTab("code")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === "code"
                  ? "text-white border-b-2 border-white -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Code2 className="w-4 h-4" />
              Kode HTML
            </button>
          </div>

          {tab === "preview" && (
            <div className="w-full bg-white" style={{ height: "600px" }}>
              {/* S1: Label the iframe as AI-generated, untrusted content. */}
              <div className="bg-yellow-950/60 border-b border-yellow-800/50 text-yellow-400 text-xs px-4 py-1.5 font-medium">
                ⚠ Konten berikut dihasilkan oleh AI dan tidak diverifikasi. Jalankan hanya jika Anda mempercayai hasilnya.
              </div>
              <iframe
                srcDoc={html}
                className="w-full border-0"
                style={{ height: "calc(100% - 32px)" }}
                sandbox="allow-scripts"
                title="Preview"
              />
            </div>
          )}

          {tab === "code" && (
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors z-10"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin!" : "Salin"}
              </button>
              <pre className="overflow-auto p-5 text-xs text-gray-400 font-mono leading-relaxed max-h-[600px]">
                <code>{html}</code>
              </pre>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
