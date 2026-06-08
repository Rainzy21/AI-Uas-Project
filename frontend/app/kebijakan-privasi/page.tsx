import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — VisAI",
  description:
    "Informasi tentang pengumpulan data, penggunaan layanan AI pihak ketiga, dan penyimpanan hasil di VisAI.",
};

export default function KebijakanPrivasiPage() {
  return (
    <main className="px-4 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Kebijakan Privasi &amp; Penggunaan Data AI</h1>
      <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Ringkasan</h2>
          <p>
            VisAI menganalisis screenshot UI yang Anda unggah menggunakan layanan AI pihak ketiga.
            Gambar diproses di server aplikasi dan tidak disimpan secara permanen di server kami.
            Hasil analisis disimpan hanya di peramban Anda (<code className="text-gray-300">localStorage</code>).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Data yang Dikirim ke Penyedia AI</h2>
          <p className="mb-2">
            Saat Anda mengunggah gambar, konten tersebut dikirim ke salah satu penyedia berikut
            (tergantung konfigurasi server):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>OpenRouter (dan model yang dipilih, mis. Kimi)</li>
            <li>Google Gemini</li>
            <li>DeepSeek (dengan langkah deskripsi gambar melalui model vision jika tersedia)</li>
          </ul>
          <p className="mt-2">
            Screenshot dapat berisi informasi pribadi (nama, email, dll.) jika tampak di gambar.
            Jangan unggah data sensitif yang tidak perlu dibagikan ke layanan AI eksternal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Penyimpanan &amp; Retensi</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Server VisAI tidak menyimpan gambar atau hasil analisis di database.</li>
            <li>Hasil disimpan di perangkat Anda hingga Anda menghapusnya atau membersihkan data situs.</li>
            <li>Retensi data di sisi penyedia AI mengikuti kebijakan masing-masing penyedia.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Cookie &amp; Pelacakan</h2>
          <p>
            Aplikasi ini tidak menggunakan cookie sesi atau SDK analitik. Pelacakan error opsional
            (Sentry) hanya aktif jika dikonfigurasi di lingkungan produksi.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Hak Anda</h2>
          <p>
            Anda dapat menghapus hasil yang tersimpan dengan tombol &quot;Upload Baru&quot; di halaman
            hasil, atau dengan membersihkan data situs di pengaturan peramban.
          </p>
        </section>

        <p className="text-gray-500 text-xs pt-4 border-t border-[#222]">
          Terakhir diperbarui: Juni 2026. Untuk pertanyaan, hubungi pengelola proyek VisAI.
        </p>
      </div>

      <Link
        href="/upload"
        className="inline-block mt-8 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] transition-colors text-gray-300 px-6 py-2.5 rounded-lg text-sm font-medium"
      >
        Kembali ke Upload
      </Link>
    </main>
  );
}
