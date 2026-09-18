# Panduan Menyambungkan SiPARE WANGI ke Database Google Sheets

Dokumen ini berisi langkah lengkap untuk mengganti penyimpanan demo (bawaan Claude) dengan database Google Sheets sungguhan, sesuai roadmap pilot yang sudah disepakati. Kode di file `pelaporan-ltt-ntt.jsx` **sudah disiapkan** untuk ini — begitu langkah di bawah selesai, tinggal isi satu baris konfigurasi dan aplikasi otomatis beralih dari mode demo ke mode Google Sheets.

---

## 1. Buat Spreadsheet & Struktur Sheet

Buat satu Google Spreadsheet baru, lalu buat **2 sheet** (tab) dengan nama dan kolom header persis seperti ini (huruf besar/kecil harus sama):

### Sheet: `Laporan_Harian`
| id | kabupaten | kecamatan | komoditas | luas_ha | tanggal | dibuat_oleh | dibuat_pada |
|---|---|---|---|---|---|---|---|

### Sheet: `Target_Bulanan`
| id | kabupaten | komoditas | bulan | targetHa | ditetapkan_oleh | dibuat_pada |
|---|---|---|---|---|---|---|

> Catatan: untuk tahap pilot, data referensi (daftar 22 kabupaten, daftar kecamatan, daftar komoditas) **tidak perlu** disimpan di Sheets — data itu sudah tertanam langsung di kode aplikasi dan jarang berubah. Ini menyederhanakan setup dan mengurangi jumlah permintaan ke Apps Script. Akun login (`users`) juga sengaja **tetap di kode**, bukan di Sheets — supaya password tidak tersimpan di spreadsheet yang bisa diakses banyak orang.

---

## 2. Pasang Kode Apps Script

Dari spreadsheet tadi: **Extensions → Apps Script**. Hapus kode contoh yang ada, lalu tempel kode berikut sebagai `Code.gs`:

```javascript
function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getRecords') {
    return jsonResponse(sheetToObjects(ss.getSheetByName('Laporan_Harian')).map(normalizeRecord));
  }
  if (action === 'getTargets') {
    return jsonResponse(sheetToObjects(ss.getSheetByName('Target_Bulanan')).map(normalizeTarget));
  }
  return jsonResponse({ error: 'Aksi GET tidak dikenal: ' + action });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (body.action === 'addRecord') {
    var sheet = ss.getSheetByName('Laporan_Harian');
    var id = body.id || ('r-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));
    sheet.appendRow([
      id, body.kabupatenName, body.kecamatan, body.komoditas,
      body.luas, body.tanggal, body.createdBy, new Date().toISOString(),
    ]);
    return jsonResponse({ success: true, id: id });
  }

  if (body.action === 'addTarget') {
    var sheet = ss.getSheetByName('Target_Bulanan');
    var id = body.id || ('t-' + new Date().getTime());
    sheet.appendRow([
      id, body.kabupatenName, body.komoditas, body.bulan,
      body.targetHa, body.createdBy || '', new Date().toISOString(),
    ]);
    return jsonResponse({ success: true, id: id });
  }

  if (body.action === 'updateRecord') {
    var sheet = ss.getSheetByName('Laporan_Harian');
    var row = findRowIndexById(sheet, body.id);
    if (row === -1) return jsonResponse({ error: 'ID laporan tidak ditemukan: ' + body.id });
    var existing = sheet.getRange(row, 1, 1, 8).getValues()[0];
    var updated = [
      existing[0],
      body.kabupatenName !== undefined ? body.kabupatenName : existing[1],
      body.kecamatan !== undefined ? body.kecamatan : existing[2],
      body.komoditas !== undefined ? body.komoditas : existing[3],
      body.luas !== undefined ? body.luas : existing[4],
      body.tanggal !== undefined ? body.tanggal : existing[5],
      existing[6],
      existing[7],
    ];
    sheet.getRange(row, 1, 1, 8).setValues([updated]);
    return jsonResponse({ success: true });
  }

  if (body.action === 'deleteRecord') {
    var sheet = ss.getSheetByName('Laporan_Harian');
    var row = findRowIndexById(sheet, body.id);
    if (row === -1) return jsonResponse({ error: 'ID laporan tidak ditemukan: ' + body.id });
    sheet.deleteRow(row);
    return jsonResponse({ success: true });
  }

  if (body.action === 'updateTarget') {
    var sheet = ss.getSheetByName('Target_Bulanan');
    var row = findRowIndexById(sheet, body.id);
    if (row === -1) return jsonResponse({ error: 'ID target tidak ditemukan: ' + body.id });
    var existing = sheet.getRange(row, 1, 1, 7).getValues()[0];
    var updated = [
      existing[0],
      body.kabupatenName !== undefined ? body.kabupatenName : existing[1],
      body.komoditas !== undefined ? body.komoditas : existing[2],
      body.bulan !== undefined ? body.bulan : existing[3],
      body.targetHa !== undefined ? body.targetHa : existing[4],
      existing[5],
      existing[6],
    ];
    sheet.getRange(row, 1, 1, 7).setValues([updated]);
    return jsonResponse({ success: true });
  }

  if (body.action === 'deleteTarget') {
    var sheet = ss.getSheetByName('Target_Bulanan');
    var row = findRowIndexById(sheet, body.id);
    if (row === -1) return jsonResponse({ error: 'ID target tidak ditemukan: ' + body.id });
    sheet.deleteRow(row);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Aksi POST tidak dikenal: ' + body.action });
}

// Mencari nomor baris (1-indexed, sesuai penomoran baris di Google Sheets) berdasarkan
// kolom "id" — dipakai oleh aksi update dan delete supaya tahu baris mana yang diubah/dihapus.
function findRowIndexById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

// Mengubah isi sheet menjadi array of object, memakai baris pertama sebagai nama kolom
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = data.slice(1).filter(function (row) { return row[0] !== ''; });
  return rows.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// Menyamakan nama kolom sheet (kabupaten, luas_ha, dibuat_oleh, dibuat_pada)
// dengan nama field yang dipakai kode React (kabupatenName, luas, createdBy, createdAt)
// — dilakukan di sini supaya kode React tidak perlu tahu apa pun soal nama kolom sheet.
function normalizeRecord(row) {
  return {
    id: row.id,
    kabupatenName: row.kabupaten,
    kecamatan: row.kecamatan,
    komoditas: row.komoditas,
    luas: Number(row.luas_ha),
    tanggal: row.tanggal,
    createdBy: row.dibuat_oleh,
    createdAt: row.dibuat_pada,
  };
}

// Menyamakan nama kolom sheet (kabupaten) dengan field kode React (kabupatenName)
function normalizeTarget(row) {
  return {
    id: row.id,
    kabupatenName: row.kabupaten,
    komoditas: row.komoditas,
    bulan: Number(row.bulan),
    targetHa: Number(row.targetHa),
  };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Dengan versi ini, kode React di file `pelaporan-ltt-ntt.jsx` **tidak perlu diubah sama sekali** untuk urusan pemetaan nama kolom — Apps Script yang menyesuaikan, bukan sebaliknya. Yang perlu diisi hanya satu baris `APPS_SCRIPT_URL` (lihat bagian 4).

---

## 3. Deploy sebagai Web App

1. Di editor Apps Script: **Deploy → New deployment**.
2. Klik ikon gerigi di "Select type" → pilih **Web app**.
3. Isi:
   - **Execute as**: Me (akun Anda)
   - **Who has access**: **Anyone** (wajib, supaya website bisa memanggilnya tanpa login Google)
4. Klik **Deploy**, lalu **Authorize access** (izinkan akses ke spreadsheet Anda sendiri).
5. Salin **Web app URL** yang muncul — bentuknya seperti:
   `https://script.google.com/macros/s/AKfycb.../exec`

Simpan URL ini, dipakai di langkah berikutnya.

---

## 4. Konfigurasi di Kode React

Di file `pelaporan-ltt-ntt.jsx`, cari baris ini (dekat bagian atas file):

```javascript
const APPS_SCRIPT_URL = "";
```

Ganti jadi:

```javascript
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

Begitu URL ini diisi, aplikasi **otomatis** beralih dari mode demo ke mode Google Sheets — tidak ada perubahan lain yang perlu dilakukan. Anda akan melihat badge kecil di sidebar berubah dari "Mode Demo" menjadi "Google Sheets", dan tombol "Reset Data" otomatis hilang (supaya data pilot/produksi tidak tidak sengaja terhapus).

Kirim ulang file setelah URL diisi, saya bisa bantu tempelkan langsung kalau Anda kirim URL-nya ke saya.

---

## 5. Uji Coba

1. Login sebagai admin kabupaten mana pun, input satu laporan lewat menu **Input Data**.
2. Buka spreadsheet — baris baru seharusnya langsung muncul di sheet `Laporan_Harian`.
3. Refresh aplikasi (atau buka lagi) — data itu harus tetap ada dan terhitung di **Dashboard** dan **Tabulasi**.
4. Kalau muncul pesan error merah di bagian atas aplikasi ("Gagal terhubung ke Google Sheets…"), cek dua hal paling umum:
   - Pengaturan **Who has access** di deployment harus **Anyone**, bukan "Only myself".
   - Pastikan tidak ada salah ketik pada `APPS_SCRIPT_URL` (harus persis, termasuk `/exec` di akhir).

---

## Catatan Penting untuk Tahap Pilot

- **Sudah pernah deploy Apps Script sebelumnya?** Kode di atas menambahkan aksi `updateRecord`, `deleteRecord`, `updateTarget`, `deleteTarget` (untuk tombol edit/hapus di aplikasi). Kalau Apps Script Anda sudah live sebelum bagian ini ditambahkan, **wajib**: buka lagi editor Apps Script, ganti seluruh isi `Code.gs` dengan versi terbaru di atas, lalu **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy** (edit kode saja tidak otomatis update ke URL yang sudah live).

- **Data laporan** dan **target** sekarang **hidup di Google Sheets Anda** — Anda (atau admin provinsi lain) bisa membuka spreadsheet-nya langsung untuk cross-check manual kapan saja, sesuai kelebihan yang sudah kita bahas sebelumnya.
- **Akun login masih di kode** (belum di Sheets) — kalau nanti perlu menambah/mengubah akun kabupaten, itu masih perlu saya bantu edit di kode, bukan lewat spreadsheet.
- **Kuota Google Apps Script**: cukup untuk skala pilot (22 kabupaten, beberapa entri per hari), tapi bukan untuk skala nasional — sesuai batasan yang sudah kita diskusikan di roadmap migrasi ke PostgreSQL nanti.
- **Tombol Reset Data otomatis hilang** begitu terhubung ke Sheets — ini kesengajaan, supaya tidak ada yang tidak sengaja menghapus data pilot yang sudah masuk. Kalau perlu mengosongkan data untuk mulai ulang, hapus barisnya langsung di spreadsheet.
