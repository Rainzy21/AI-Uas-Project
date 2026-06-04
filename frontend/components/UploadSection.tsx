"use client";

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2, AlertCircle } from "lucide-react";
import { MAX_SIZE, MAX_SIZE_LABEL } from "@/lib/imageConstants";
import { validateImageFileClient } from "@/lib/sniffImageFile";
import { CLIENT_ANALYZE_TIMEOUT_MS } from "@/lib/analyzeTimeouts";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function analyzeHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_ANALYZE_API_SECRET;
  return key ? { "x-visai-key": key } : {};
}

export default function UploadSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(selected: File) {
    setError(null);
    setValidating(true);
    try {
      const validationError = await validateImageFileClient(
        selected,
        MAX_SIZE,
        MAX_SIZE_LABEL
      );
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selected);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(selected);
      });
    } finally {
      setValidating(false);
    }
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_TEST !== "1") return;
    (
      window as Window & { __visaiE2ESelectFile?: (file: File) => void }
    ).__visaiE2ESelectFile = (file) => {
      void handleFile(file);
    };
    return () => {
      delete (window as Window & { __visaiE2ESelectFile?: (file: File) => void })
        .__visaiE2ESelectFile;
    };
    // E2E hook only; handleFile is stable enough for test file injection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_ANALYZE_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: analyzeHeaders(),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }

      try {
        localStorage.setItem("visai_result", JSON.stringify(data));
      } catch {
        setError("Tidak dapat menyimpan hasil (penyimpanan lokal penuh). Coba hapus cache browser Anda.");
        return;
      }
      router.push("/hasil");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Permintaan habis waktu. Model AI mungkin lambat—coba lagi, atau ganti OPENROUTER_MODEL di .env.local."
        );
      } else {
        setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <section id="upload" className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
      <div className="flex flex-col items-center mb-8">
        <div className="px-3 py-1.5 rounded-full border border-[#262626] bg-[#111] mb-6">
          <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">LANGKAH 1 &amp; 2</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Upload Gambar</h2>
        <p className="text-gray-400 text-center text-sm">
          Upload gambar design untuk diproses via OpenRouter.
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {!file && (
          <label
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative w-full bg-[#0f0f0f] border rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
              dragging
                ? "border-[#555] bg-[#141414]"
                : "border-[#222] hover:bg-[#141414] hover:border-[#333]"
            }`}
          >
            <input
              ref={inputRef}
              id="visai-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleInputChange}
              onInput={handleInputChange}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="relative z-0 flex flex-col items-center pointer-events-none">
              <div className="bg-[#1a1a1a] p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-[#262626]">
                <UploadCloud className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-300 font-medium mb-2 text-sm">Drag &amp; drop atau klik untuk upload</p>
              <p className="text-[#555] text-xs">PNG · JPG · WebP — Maks {MAX_SIZE_LABEL}</p>
            </div>
          </label>
        )}

        {file && preview && (
          <div className="w-full bg-[#0f0f0f] border border-[#222] rounded-2xl overflow-hidden">
            <div className="relative w-full aspect-video bg-[#0a0a0a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <button
                onClick={clearFile}
                className="absolute top-3 right-3 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-medium truncate max-w-xs">{file.name}</p>
                <p className="text-[#555] text-xs">{formatBytes(file.size)}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 text-red-400 text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {file && (
          <button
            onClick={handleSubmit}
            disabled={loading || validating}
            className="w-full flex items-center justify-center gap-2 bg-[#262626] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white py-3 rounded-xl font-medium border border-[#333] text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses dengan OpenRouter AI...
              </>
            ) : (
              "Proses Gambar"
            )}
          </button>
        )}
      </div>
    </section>
  );
}
