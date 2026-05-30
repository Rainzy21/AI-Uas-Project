"use client";

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Loader2, AlertCircle } from "lucide-react";
import { ALLOWED_TYPES, MAX_SIZE } from "@/lib/imageConstants";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Q5: Revoke previous object URL before creating a new one to prevent memory leaks.
  function handleFile(selected: File) {
    setError(null);
    if (!(ALLOWED_TYPES as readonly string[]).includes(selected.type)) {
      setError("File tidak valid. Gunakan PNG, JPG, atau WebP.");
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError("File terlalu besar. Maksimal 20 MB.");
      return;
    }
    setFile(selected);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }

  // Q5: Revoke object URL on unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
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

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }

      // Q3: Guard against QuotaExceededError when storing large HTML.
      try {
        localStorage.setItem("visai_result", JSON.stringify(data));
      } catch {
        setError("Tidak dapat menyimpan hasil (penyimpanan lokal penuh). Coba hapus cache browser Anda.");
        return;
      }
      router.push("/hasil");
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
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
          Upload gambar design untuk diproses Gemini AI.
        </p>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Dropzone */}
        {!file && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-full bg-[#0f0f0f] border rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
              dragging
                ? "border-[#555] bg-[#141414]"
                : "border-[#222] hover:bg-[#141414] hover:border-[#333]"
            }`}
          >
            <div className="bg-[#1a1a1a] p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-[#262626]">
              <UploadCloud className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-300 font-medium mb-2 text-sm">Drag &amp; drop atau klik untuk upload</p>
            <p className="text-[#555] text-xs">PNG · JPG · WebP — Maks 20 MB</p>
          </div>
        )}

        {/* Preview */}
        {file && preview && (
          <div className="w-full bg-[#0f0f0f] border border-[#222] rounded-2xl overflow-hidden">
            <div className="relative w-full aspect-video bg-[#0a0a0a]">
              {/* Q1: Use plain <img> for blob: URLs — next/image cannot optimize them. */}
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

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/40 text-red-400 text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        {file && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#262626] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white py-3 rounded-xl font-medium border border-[#333] text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses dengan Gemini AI...
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
