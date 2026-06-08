"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileCode2, Copy, Check, LayoutTemplate, Code2, UploadCloud } from "lucide-react";
import { parseVisAIResult, type VisAIResult } from "@/lib/analyzeSchema";
import { safeColor } from "@/lib/safeColor";

export default function ResultSection() {
  const router = useRouter();
  const [result, setResult] = useState<VisAIResult | null>(null);
  const tabs = ["preview", "code"] as const;
  type TabId = (typeof tabs)[number];
  const [tab, setTab] = useState<TabId>("preview");

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: TabId) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = tabs.indexOf(current);
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
    setTab(tabs[nextIndex]);
  }
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("visai_result");
      if (!stored) return;
      const parsed = parseVisAIResult(JSON.parse(stored));
      if (parsed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult(parsed);
      }
    } catch {
      // corrupted data
    }
  }, []);

  const html = result?.html ?? "";

  async function handleCopy() {
    if (!result) return;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
    }
  }

  function handleNewUpload() {
    localStorage.removeItem("visai_result");
    router.push("/upload");
  }

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

  const { analysis } = result;

  return (
    <section id="hasil" className="py-24 px-4 flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col gap-6">

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Color Palette</p>
            <div className="flex flex-wrap gap-2">
              {analysis.colorPalette.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-md border border-[#333]"
                    style={{ backgroundColor: safeColor(color) }}
                  />
                  <span className="text-gray-400 text-xs font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Typography</p>
            <p className="text-gray-400 text-xs mb-1"><span className="text-gray-600">Headings:</span> {analysis.typography.headings}</p>
            <p className="text-gray-400 text-xs mb-1"><span className="text-gray-600">Body:</span> {analysis.typography.body}</p>
            <p className="text-gray-400 text-xs"><span className="text-gray-600">Style:</span> {analysis.typography.style}</p>
          </div>

          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Layout</p>
            <p className="text-gray-400 text-xs leading-relaxed">{analysis.layout}</p>
          </div>
        </div>

        {analysis.components.length > 0 && (
          <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              Components
            </p>
            <ul className="space-y-3">
              {analysis.components.map((c, i) => (
                <li key={i} className="text-xs">
                  <span className="text-white font-medium">{c.name}</span>
                  <span className="text-gray-600"> · {c.position}</span>
                  <p className="text-gray-400 mt-0.5">{c.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl overflow-hidden">
          <div role="tablist" aria-label="Tampilan hasil" className="flex border-b border-[#1a1a1a]">
            <button
              type="button"
              role="tab"
              id="tab-preview"
              aria-selected={tab === "preview"}
              aria-controls="panel-preview"
              tabIndex={tab === "preview" ? 0 : -1}
              onClick={() => setTab("preview")}
              onKeyDown={(event) => handleTabKeyDown(event, "preview")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === "preview"
                  ? "text-white border-b-2 border-white -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutTemplate className="w-4 h-4" aria-hidden="true" />
              Preview
            </button>
            <button
              type="button"
              role="tab"
              id="tab-code"
              aria-selected={tab === "code"}
              aria-controls="panel-code"
              tabIndex={tab === "code" ? 0 : -1}
              onClick={() => setTab("code")}
              onKeyDown={(event) => handleTabKeyDown(event, "code")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                tab === "code"
                  ? "text-white border-b-2 border-white -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Code2 className="w-4 h-4" aria-hidden="true" />
              Kode HTML
            </button>
          </div>

          {tab === "preview" && (
            <div
              role="tabpanel"
              id="panel-preview"
              aria-labelledby="tab-preview"
              className="w-full bg-[#e5e5e5] rounded-b-2xl overflow-hidden"
              style={{ height: "min(80vh, 720px)" }}
            >
              <div className="bg-yellow-950/60 border-b border-yellow-800/50 text-yellow-400 text-xs px-4 py-1.5 font-medium">
                ⚠ Pratinjau AI — hasil bisa berbeda dari desain asli. Tailwind dimuat otomatis untuk styling.
              </div>
              <iframe
                srcDoc={html}
                className="w-full border-0 bg-white"
                style={{ height: "calc(100% - 32px)", minHeight: "480px" }}
                sandbox="allow-scripts"
                title="Preview"
              />
            </div>
          )}

          {tab === "code" && (
            <div
              role="tabpanel"
              id="panel-code"
              aria-labelledby="tab-code"
              className="relative"
            >
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors z-10"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin!" : "Salin"}
              </button>
              {copyError && (
                <p className="absolute top-12 right-3 text-xs text-red-400 z-10">
                  Salin gagal — gunakan HTTPS
                </p>
              )}
              <pre className="overflow-auto p-5 text-xs text-gray-400 font-mono leading-relaxed max-h-[600px] whitespace-pre">
                <code>{html}</code>
              </pre>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
