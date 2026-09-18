# SiPARE WANGI — Sistem Pelaporan LTT Real-Time Provinsi NTT

Proyek ini siap di-deploy sebagai website mandiri lewat Vercel. Ikuti langkah di bawah — tidak perlu instalasi apa pun di komputer Anda, semuanya lewat browser.

## Cara Deploy (via GitHub + Vercel, tanpa install apa pun)

1. **Buat repository baru di GitHub**
   - Buka [github.com](https://github.com), buat akun kalau belum punya (gratis).
   - Klik **New repository**, beri nama misalnya `sipare-wangi`, biarkan default (jangan centang "Add README"), klik **Create repository**.

2. **Upload seluruh isi folder proyek ini**
   - Di halaman repository yang baru dibuat, klik **uploading an existing file**.
   - Seret (drag & drop) **semua file dan folder** di dalam paket ini (`index.html`, `package.json`, `vite.config.js`, `.gitignore`, `README.md`, dan folder `src/` beserta isinya) ke area upload.
   - Klik **Commit changes**.

3. **Hubungkan ke Vercel**
   - Buka [vercel.com](https://vercel.com), daftar/masuk pakai akun GitHub Anda (gratis, tinggal klik "Continue with GitHub").
   - Klik **Add New → Project**, pilih repository `sipare-wangi` yang baru dibuat.
   - Vercel otomatis mengenali ini proyek Vite — biarkan pengaturan default apa adanya.
   - Klik **Deploy**. Tunggu 1-2 menit.

4. **Selesai** — Vercel akan memberi link seperti `sipare-wangi.vercel.app`. Situs ini sudah bisa dibuka siapa pun, di HP maupun laptop, tanpa perlu masuk ke Claude.

## Setelah Deploy: Sambungkan ke Database (Wajib untuk Pemakaian Sungguhan)

Di luar Claude, penyimpanan sementara (`window.storage`) yang dipakai untuk demo **tidak tersedia** — jadi begitu dijalankan sebagai website mandiri, aplikasi butuh database sungguhan supaya data yang diinput benar-benar tersimpan.

Ikuti panduan `panduan-koneksi-google-sheets.md` yang sudah pernah dibuat sebelumnya:
1. Siapkan Google Sheets + Apps Script sesuai panduan tersebut.
2. Buka file `src/App.jsx` di repository GitHub Anda (klik file-nya, lalu ikon pensil untuk edit langsung di browser GitHub — tidak perlu download).
3. Cari baris `const APPS_SCRIPT_URL = "";` dan isi dengan URL Web App Apps Script Anda.
4. Commit perubahan — Vercel otomatis build ulang dan situsnya langsung memakai Google Sheets sebagai database.

## Melakukan Perubahan di Kemudian Hari

Setiap kali file di GitHub diubah (lewat editor browser GitHub, atau upload ulang file baru), Vercel **otomatis** membangun ulang dan memperbarui situsnya dalam 1-2 menit — tidak perlu proses deploy manual lagi.

## Struktur Proyek

```
sipare-wangi/
├── index.html          — halaman HTML utama
├── package.json        — daftar dependency (react, recharts, lucide-react)
├── vite.config.js       — konfigurasi build
├── .gitignore
├── README.md           — file ini
└── src/
    ├── main.jsx        — titik masuk aplikasi
    └── App.jsx         — seluruh kode aplikasi SiPARE WANGI
```
