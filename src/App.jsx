import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, Cell,
} from "recharts";
import {
  LogIn, LogOut, LayoutDashboard, ClipboardPlus, Target as TargetIcon,
  MapPinned, Wheat, ChevronDown, Loader2, Plus, Info, X, Check, Table2, Download,
  Menu, CalendarDays, CheckCircle2, Circle, Clock, KeyRound, HelpCircle, Pencil, Trash2, Save, Users,
} from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";


/* ---------------------------------------------------------------------- */
/* Tokens & reference data                                                */
/* ---------------------------------------------------------------------- */

// Lambang resmi Provinsi Nusa Tenggara Timur (domain publik, Wikimedia Commons)
const NTT_LOGO_URL = "https://commons.wikimedia.org/wiki/Special:FilePath/Coat_of_arms_of_East_Nusa_Tenggara.svg";

const COLORS = {
  bg: "#F6F1E4",        // dry-season parchment
  bgAlt: "#EFE7D2",
  ink: "#2B2418",        // soil-dark text
  inkSoft: "#6B6152",
  card: "#FFFDF7",
  line: "#DFD5BA",
  gold: "#C99A2E",        // savanna gold
  goldSoft: "#EBD9A5",
  teal: "#1F6F6B",        // irrigation teal
  tealSoft: "#CFE3E1",
  clay: "#AD4E2C",        // clay / gap-to-target
  claySoft: "#EFCFC0",
  leaf: "#4C7A3D",        // padi green
  leafSoft: "#D8E4CE",
};

const KOMODITAS_LIST = [
  "Padi Reguler", "Padi Oplah", "Padi Gogo", "Jagung Reguler", "Jagung Banpem", "Padi CSR",
];

const KOMODITAS_COLORS = {
  "Padi Reguler": COLORS.leaf,
  "Padi Oplah": COLORS.teal,
  "Padi Gogo": COLORS.gold,
  "Jagung Reguler": "#D9A441",
  "Jagung Banpem": "#7C8C4A",
  "Padi CSR": COLORS.clay,
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus",
  "September", "Oktober", "November", "Desember",
];
const YEAR = 2026;
// Mengikuti bulan berjalan sesungguhnya saat aplikasi dibuka (bukan angka tetap).
// Kalau dibuka di luar tahun berjalan (YEAR), jatuh ke Desember (tahun penuh) sebagai default aman.
const _now = new Date();
const CURRENT_MONTH = _now.getFullYear() === YEAR ? _now.getMonth() + 1 : 12;

// real coordinates (approx. kabupaten/kota capital) used to place markers on the OSM basemap
const MAP_CENTER = { lat: -9.46, lon: 121.9 };
const MAP_ZOOM = 7;
const MAP_SIZE = { w: 800, h: 420 };

const KABUPATEN_LIST = [
  { name: "Kabupaten Sumba Barat Daya", slug: "sumba-barat-daya", lat: -9.41, lon: 119.25 },
  { name: "Kabupaten Sumba Barat", slug: "sumba-barat", lat: -9.64, lon: 119.42 },
  { name: "Kabupaten Sumba Tengah", slug: "sumba-tengah", lat: -9.55, lon: 119.62 },
  { name: "Kabupaten Sumba Timur", slug: "sumba-timur", lat: -9.66, lon: 120.26 },
  { name: "Kabupaten Manggarai Barat", slug: "manggarai-barat", lat: -8.49, lon: 119.89 },
  { name: "Kabupaten Manggarai", slug: "manggarai", lat: -8.61, lon: 120.47 },
  { name: "Kabupaten Manggarai Timur", slug: "manggarai-timur", lat: -8.62, lon: 120.77 },
  { name: "Kabupaten Ngada", slug: "ngada", lat: -8.77, lon: 120.99 },
  { name: "Kabupaten Nagekeo", slug: "nagekeo", lat: -8.68, lon: 121.24 },
  { name: "Kabupaten Ende", slug: "ende", lat: -8.84, lon: 121.66 },
  { name: "Kabupaten Sikka", slug: "sikka", lat: -8.62, lon: 122.21 },
  { name: "Kabupaten Flores Timur", slug: "flores-timur", lat: -8.35, lon: 123.0 },
  { name: "Kabupaten Lembata", slug: "lembata", lat: -8.36, lon: 123.45 },
  { name: "Kabupaten Alor", slug: "alor", lat: -8.23, lon: 124.53 },
  { name: "Kabupaten Sabu Raijua", slug: "sabu-raijua", lat: -10.49, lon: 121.79 },
  { name: "Kabupaten Rote Ndao", slug: "rote-ndao", lat: -10.72, lon: 123.13 },
  { name: "Kota Kupang", slug: "kota-kupang", lat: -10.1772, lon: 123.607 },
  { name: "Kabupaten Kupang", slug: "kupang", lat: -10.17, lon: 123.79 },
  { name: "Kabupaten Timor Tengah Selatan", slug: "timor-tengah-selatan", lat: -9.86, lon: 124.28 },
  { name: "Kabupaten Timor Tengah Utara", slug: "timor-tengah-utara", lat: -9.45, lon: 124.48 },
  { name: "Kabupaten Belu", slug: "belu", lat: -9.11, lon: 124.89 },
  { name: "Kabupaten Malaka", slug: "malaka", lat: -9.31, lon: 124.79 },
];

const shortName = (n) => n.replace(/^Kabupaten /, "").replace(/^Kota /, "Kota ");

// Format nilai luas (Ha) selalu 2 angka di belakang titik, mis. 4.75, 0.25 — bukan format id-ID (koma)
const fmtHa = (n) => Number(n || 0).toFixed(2);

// Menormalkan nilai tanggal jadi persis "YYYY-MM-DD", apa pun bentuk aslinya.
// Perlu karena Google Sheets kadang otomatis mengubah teks tanggal jadi tipe
// Date, sehingga saat dibaca kembali lewat Apps Script formatnya berubah jadi
// string ISO lengkap (mis. "2026-09-15T00:00:00.000Z"). Tanpa normalisasi ini,
// perbandingan tanggal persis (dipakai di Tabulasi → Harian) akan selalu gagal
// cocok untuk data yang sudah pernah dimuat ulang dari Sheets.
const dateOnly = (v) => String(v || "").slice(0, 10);

// Daftar kecamatan resmi per kabupaten/kota, digunakan untuk dropdown pilihan
// (bukan input teks bebas) pada form input harian.
const KECAMATAN_MAP = {
  "Kabupaten Sumba Barat Daya": ["Kodi Balaghar", "Wewewa Tengah", "Kota Tambolaka", "Kodi Utara", "Kodi", "Kodi Bangedo", "Wewewa Selatan", "Wewewa Barat", "Wewewa Timur", "Wewewa Utara", "Loura"],
  "Kabupaten Sumba Barat": ["Tana Righu", "Loli", "Wanokaka", "Lamboya", "Kota Waikabubak", "Laboya Barat"],
  "Kabupaten Sumba Tengah": ["Katikutana", "Katikutana Selatan", "Mamboro", "Umbu Ratu Nggay", "Umbu Ratu Nggay Barat", "Umbu Ratu Nggay Tengah"],
  "Kabupaten Sumba Timur": ["Kota Waingapu", "Haharu", "Lewa", "Nggaha Ori Angu", "Tabundung", "Pinu Pahar", "Pandawai", "Umalulu", "Rindi", "Pahunga Lodu", "Wulla Waijelu", "Paberiwai", "Karera", "Kahaungu Eti", "Matawai La Pawu", "Kambera", "Kambata Mapambuhang", "Lewa Tidahu", "Katala Hamu Lingu", "Kanatang", "Ngadu Ngala", "Mahu"],
  "Kabupaten Manggarai Barat": ["Macang Pacar", "Kuwus", "Lembor", "Sano Nggoang", "Komodo", "Boleng", "Welak", "Ndoso", "Lembor Selatan", "Mbeliling", "Pacar", "Kuwus Barat"],
  "Kabupaten Manggarai": ["Wae Rii", "Ruteng", "Satar Mese", "Cibal", "Reok", "Langke Rembong", "Satar Mese Barat", "Rahong Utara", "Lelak", "Reok Barat", "Cibal Barat", "Satar Mese Utara"],
  "Kabupaten Manggarai Timur": ["Borong", "Lamba Leda Selatan", "Lamba Leda", "Lamba Leda Utara", "Sambi Rampas", "Elar", "Kota Komba", "Kota Komba Utara", "Rana Mese", "Lamba Leda Timur", "Elar Selatan", "Congkar"],
  "Kabupaten Ngada": ["Aimere", "Golewa", "Bajawa", "Soa", "Riung", "Jerebuu", "Riung Barat", "Bajawa Utara", "Wolomeze", "Golewa Selatan", "Golewa Barat", "Inerie"],
  "Kabupaten Nagekeo": ["Aesesa", "Nangaroro", "Boawae", "Mauponggo", "Wolowae", "Keo Tengah", "Aesesa Selatan"],
  "Kabupaten Ende": ["Detukeli", "Detusoko", "Ende", "Ende Selatan", "Ende Tengah", "Ende Timur", "Ende Utara", "Kelimutu", "Kota Baru", "Lepembusu Kelisoke", "Lio Timur", "Maukaro", "Maurole", "Nangapanda", "Ndona", "Ndona Timur", "Ndori", "Pulau Ende", "Wewaria", "Wolowaru", "Wolojita"],
  "Kabupaten Sikka": ["Paga", "Mego", "Lela", "Nita", "Alok", "Palue", "Nelle", "Talibura", "Waigete", "Kewapante", "Bola", "Magepanda", "Waiblama", "Alok Barat", "Alok Timur", "Koting", "Tanawawo", "Hewokloang", "Kangae", "Doreng", "Mapitara"],
  "Kabupaten Flores Timur": ["Adonara", "Adonara Barat", "Adonara Tengah", "Adonara Timur", "Demon Pagong", "Ile Boleng", "Ile Bura", "Ile Mandiri", "Kelubagolit", "Larantuka", "Lewolema", "Solor Barat", "Solor Timur", "Solor Selatan", "Tanjung Bunga", "Titihena", "Witihama", "Wotan Ulu Mado", "Wulanggitang"],
  "Kabupaten Lembata": ["Atadei", "Buyasari", "Ile Ape", "Ile Ape Timur", "Lebatukan", "Nagawutung", "Nubatukan", "Omesuri", "Wulandoni"],
  "Kabupaten Alor": ["Abad Selatan", "Alor Barat Laut", "Alor Barat Daya", "Alor Selatan", "Alor Tengah Utara", "Alor Timur", "Alor Timur Laut", "Kabola", "Lembur", "Mataru", "Pantar", "Pantar Barat", "Pantar Barat Laut", "Pantar Tengah", "Pantar Timur", "Pulau Pura", "Pureman", "Teluk Mutiara"],
  "Kabupaten Sabu Raijua": ["Sabu Barat", "Sabu Tengah", "Sabu Timur", "Sabu Liae", "Hawu Mehara", "Raijua"],
  "Kabupaten Rote Ndao": ["Rote Barat Daya", "Rote Barat Laut", "Lobalain", "Rote Tengah", "Pantai Baru", "Rote Timur", "Rote Barat", "Rote Selatan", "Ndao Nuse", "Landu Leko", "Loaholu"],
  "Kota Kupang": ["Alak", "Kelapa Lima", "Kota Raja", "Kota Lama", "Maulafa", "Oebobo"],
  "Kabupaten Kupang": ["Semau", "Kupang Barat", "Kupang Timur", "Sulamu", "Kupang Tengah", "Amarasi", "Fatuleu", "Takari", "Amfoang Selatan", "Amfoang Utara", "Nekamese", "Amarasi Barat", "Amarasi Selatan", "Amarasi Timur", "Amabi Oefeto Timur", "Amfoang Barat Daya", "Amfoang Barat Laut", "Semau Selatan", "Taebenu", "Amabi Oefeto", "Amfoang Timur", "Fatuleu Barat", "Fatuleu Tengah", "Amfoang Tengah"],
  "Kabupaten Timor Tengah Selatan": ["Kota Soe", "Mollo Selatan", "Mollo Utara", "Amanuban Timur", "Amanuban Tengah", "Amanuban Selatan", "Amanuban Barat", "Amanatun Selatan", "Amanatun Utara", "Ki'e", "Kuanfatu", "Fatumnasi", "Polen", "Batu Putih", "Boking", "Toianas", "Nunkolo", "Oenino", "Kolbano", "Kot'olin", "Kualin", "Mollo Barat", "Kokbaun", "Noebana", "Santian", "Noebeba", "Kuatnana", "Fautmolo", "Fatukopa", "Mollo Tengah", "Tobu", "Nunbena"],
  "Kabupaten Timor Tengah Utara": ["Miomaffo Timur", "Miomaffo Barat", "Biboki Selatan", "Noemuti", "Kota Kefamenanu", "Biboki Utara", "Biboki Anleu", "Insana", "Insana Utara", "Noemuti Timur", "Miomaffo Tengah", "Musi", "Mutis", "Bikomi Selatan", "Bikomi Tengah", "Bikomi Nilulat", "Bikomi Utara", "Naibenu", "Insana Fafinesu", "Insana Barat", "Insana Tengah", "Biboki Tan Pah", "Biboki Moenleu", "Biboki Feotleu"],
  "Kabupaten Belu": ["Atambua Barat", "Atambua Selatan", "Kakuluk Mesak", "Kota Atambua", "Lamaknen", "Lamaknen Selatan", "Lasiolat", "Nanaet Duabesi", "Raihat", "Raimanuk", "Tasifeto Barat", "Tasifeto Timur"],
  "Kabupaten Malaka": ["Malaka Tengah", "Malaka Barat", "Wewiku", "Weliman", "Rinhat", "Io Kufeu", "Sasitamean", "Laenmanen", "Malaka Timur", "Kobalima Timur", "Kobalima", "Botin Leobele"],
};

/* ---------------------------------------------------------------------- */
/* Deterministic seed generator (demo data only)                          */
/* ---------------------------------------------------------------------- */

function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function seedUsers() {
  const users = [
    { username: "admin.provinsi", password: "provinsi2026", role: "provinsi", displayName: "Admin Provinsi NTT" },
  ];
  KABUPATEN_LIST.forEach((k) => {
    users.push({
      username: k.slug,
      password: `${k.slug}2026`,
      role: "kabupaten",
      kabupatenName: k.name,
      displayName: `Admin ${shortName(k.name)}`,
    });
  });
  return users;
}

// Computed once at module load — always available synchronously, independent of
// window.storage. This guarantees the default demo accounts can always log in
// even if the storage read/write (used only for records & targets persistence)
// is slow, fails, or is unavailable in the current environment.
const DEFAULT_USERS = seedUsers();

function seedRecords() {
  const rnd = lcg(77);
  const records = [];
  let idc = 1;
  KABUPATEN_LIST.forEach((k, ki) => {
    const kecList = KECAMATAN_MAP[k.name] || [k.name];
    for (let m = 1; m <= CURRENT_MONTH; m++) {
      const entriesThisMonth = 1 + Math.floor(rnd() * 3);
      for (let e = 0; e < entriesThisMonth; e++) {
        const komoditas = KOMODITAS_LIST[Math.floor(rnd() * KOMODITAS_LIST.length)];
        const luas = Math.round((8 + rnd() * 42) * 100) / 100;
        const day = 1 + Math.floor(rnd() * 26);
        records.push({
          id: `seed-${idc++}`,
          kabupatenName: k.name,
          kecamatan: kecList[Math.floor(rnd() * kecList.length)],
          komoditas,
          luas,
          tanggal: `${YEAR}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          createdBy: k.slug,
          createdAt: new Date(YEAR, m - 1, day).toISOString(),
        });
      }
    }
  });
  return records;
}

function seedTargets() {
  const rnd = lcg(133);
  const targets = [];
  let idt = 1;
  KABUPATEN_LIST.forEach((k) => {
    // not every kabupaten/komoditas combo has a target yet — realistic partial coverage
    KOMODITAS_LIST.forEach((komoditas) => {
      if (rnd() < 0.55) {
        for (let m = 1; m <= CURRENT_MONTH; m++) {
          targets.push({
            id: `seedt-${idt++}`,
            kabupatenName: k.name,
            komoditas,
            bulan: m,
            targetHa: Math.round(15 + rnd() * 35),
          });
        }
      }
    });
  });
  return targets;
}

/* ---------------------------------------------------------------------- */
/* Koneksi Database (Google Sheets via Apps Script)                       */
/* ---------------------------------------------------------------------- */

// TEMPEL di sini URL Web App Apps Script setelah di-deploy (lihat panduan yang
// menyertai file ini). Selama masih kosong, aplikasi otomatis memakai
// penyimpanan demo bawaan (window.storage) seperti sebelumnya — tidak akan rusak.
const APPS_SCRIPT_URL = "";

const hasBackend = () => APPS_SCRIPT_URL.trim().length > 0;

// Parse aman: baca sebagai teks dulu, baru coba JSON.parse. Kalau Apps Script
// mengembalikan halaman HTML (mis. error internal tak tertangani, atau kuota
// harian Apps Script terlampaui), pesan errornya jadi jelas — bukan crash
// kriptik "Unexpected token '<'".
async function parseSheetsResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Respons server bukan JSON (kemungkinan error internal Apps Script atau kuota harian terlampaui). Cek log di Apps Script → Executions."
    );
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

async function sheetsGet(action) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
  return parseSheetsResponse(res);
}

// Dikirim sebagai text/plain (bukan application/json) supaya browser tidak
// mengirim preflight OPTIONS request, karena Apps Script Web App tidak
// menangani preflight — ini penyebab paling umum error CORS pada setup ini.
async function sheetsPost(action, payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  return parseSheetsResponse(res);
}

// Menyimpan perubahan password secara permanen: kalau sudah terhubung ke Google
// Sheets, disimpan di sheet "Users" (lewat Apps Script, aman karena sheet ini
// tidak perlu dibagikan ke siapa pun — Apps Script selalu berjalan atas nama
// pemilik). Kalau belum terhubung (mode demo), disimpan di window.storage.
async function persistPasswordOverride(nextUsers, username, newPassword) {
  if (hasBackend()) {
    await sheetsPost("setUserPassword", { username, password: newPassword });
    return;
  }
  const overrides = {};
  nextUsers.forEach((u) => {
    const def = DEFAULT_USERS.find((d) => d.username === u.username);
    if (def && u.password !== def.password) overrides[u.username] = u.password;
  });
  await saveKey("ltt:password_overrides", overrides);
}

/* ---------------------------------------------------------------------- */
/* Storage helpers (mode demo — dipakai bila APPS_SCRIPT_URL belum diisi) */
/* ---------------------------------------------------------------------- */

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, true);
    return res ? JSON.parse(res.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), true);
  } catch {
    /* best effort */
  }
}

/* ---------------------------------------------------------------------- */
/* Small UI atoms                                                         */
/* ---------------------------------------------------------------------- */

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(43,36,24,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, icon: Icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      {Icon && <Icon size={16} color={COLORS.teal} strokeWidth={2.25} />}
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: COLORS.inkSoft,
          fontWeight: 600,
        }}
      >
        {children}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Login screen                                                           */
/* ---------------------------------------------------------------------- */

function LoginScreen({ users, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const uname = username.trim().replace(/\s+/g, "").toLowerCase();
    const pass = password.trim();
    const u = users.find((usr) => usr.username.toLowerCase() === uname && usr.password === pass);
    if (!u) {
      setError("Username atau password salah.");
      return;
    }
    setError("");
    onLogin(u);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 15% 10%, ${COLORS.goldSoft} 0%, ${COLORS.bg} 45%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
          <img
            src={NTT_LOGO_URL}
            alt="Logo Provinsi Nusa Tenggara Timur"
            style={{ width: 42, height: 42, objectFit: "contain" }}
          />
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: COLORS.ink, lineHeight: 1.1 }}>
              SiPARE WANGI
            </div>
            <div style={{ fontSize: 11, color: COLORS.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
              Sistem Pelaporan LTT Real-Time Provinsi NTT
            </div>
          </div>
        </div>

        <Card style={{ padding: 28 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: COLORS.ink, marginBottom: 4 }}>
            Masuk ke akun
          </div>
          <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 18 }}>
            Dinas Pertanian dan Ketahanan Pangan Provinsi NTT
          </div>

          <form onSubmit={submit}>
            <label style={labelStyle}>Username</label>
            <input
              style={inputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. kupang"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
            />
            <label style={{ ...labelStyle, marginTop: 14 }}>Password</label>
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="current-password"
              spellCheck={false}
            />
            {error && (
              <div style={{ color: COLORS.clay, fontSize: 13, marginTop: 10 }}>{error}</div>
            )}
            <button type="submit" style={primaryBtn}>
              <LogIn size={16} strokeWidth={2.25} /> Masuk
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            style={{
              marginTop: 16, background: "none", border: "none", color: COLORS.teal,
              fontSize: 12.5, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: 0,
            }}
          >
            <Info size={13} /> {showDemo ? "Sembunyikan" : "Lihat"} akun demo
          </button>
          {showDemo && (
            <div
              style={{
                marginTop: 10, background: COLORS.bgAlt, borderRadius: 10, padding: 12,
                fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.7, fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Provinsi &nbsp;→&nbsp; admin.provinsi / provinsi2026<br />
              Kabupaten &nbsp;→&nbsp; contoh: kupang / kupang2026<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; sikka / sikka2026, ende / ende2026, dst.
              <div style={{ marginTop: 6, opacity: 0.75 }}>
                (username kabupaten = nama kabupaten tanpa spasi, huruf kecil)
              </div>
            </div>
          )}
        </Card>
        <div style={{ textAlign: "center", fontSize: 11.5, color: COLORS.inkSoft, marginTop: 16 }}>
          Prototipe demo — data tersimpan bersama untuk semua yang membuka tautan ini.
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 6, fontWeight: 500,
};
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9,
  border: `1px solid ${COLORS.line}`, background: "#fff", fontSize: 14, color: COLORS.ink,
  fontFamily: "'Inter', sans-serif", outline: "none",
};
const selectStyle = { ...inputStyle, cursor: "pointer" };
const primaryBtn = {
  marginTop: 20, width: "100%", background: COLORS.teal, color: "#fff", border: "none",
  borderRadius: 9, padding: "11px 0", fontSize: 14.5, fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  fontFamily: "'Inter', sans-serif",
};
const iconBtn = {
  display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
  background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: COLORS.inkSoft, flexShrink: 0,
};
const smallDangerBtn = {
  padding: "5px 10px", borderRadius: 7, border: "none", background: COLORS.clay, color: "#fff",
  fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
};
const smallGhostBtn = {
  padding: "5px 10px", borderRadius: 7, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.ink,
  fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap",
};

/* ---------------------------------------------------------------------- */
/* Peta OSM (Leaflet) — perlu paket "leaflet" & "react-leaflet"           */
/* ---------------------------------------------------------------------- */

function CapaianMap({ data, maxVal }) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.line}` }}>
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lon]}
        zoom={MAP_ZOOM}
        scrollWheelZoom={false}
        style={{ height: 380, width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {data.map((d) => {
          const pct = maxVal > 0 ? d.capaian / maxVal : 0;
          const r = 6 + pct * 12;
          const color =
            d.target > 0
              ? d.capaian >= d.target
                ? COLORS.leaf
                : d.capaian >= d.target * 0.6
                ? COLORS.gold
                : COLORS.clay
              : COLORS.inkSoft;
          return (
            <CircleMarker
              key={d.name}
              center={[d.lat, d.lon]}
              radius={r}
              pathOptions={{ color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85 }}
            >
              <LeafletTooltip direction="top" offset={[0, -r]}>
                <div style={{ fontSize: 11.5, fontFamily: "'Inter', sans-serif" }}>
                  <strong>{shortName(d.name)}</strong>
                  <br />
                  {fmtHa(d.capaian)} / {fmtHa(d.target)} Ha
                </div>
              </LeafletTooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Dashboard                                                              */
/* ---------------------------------------------------------------------- */

function Dashboard({ user, records, targets }) {
  const [mode, setMode] = useState("akumulasi"); // 'bulan' | 'akumulasi'
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [komoditasFilter, setKomoditasFilter] = useState("Semua");
  const [kabScope, setKabScope] = useState("Semua");

  const monthsInRange = useMemo(() => {
    return mode === "akumulasi" ? Array.from({ length: month }, (_, i) => i + 1) : [month];
  }, [mode, month]);

  const matchesKomoditas = (k) => komoditasFilter === "Semua" || k === komoditasFilter;

  const perKabupaten = useMemo(() => {
    return KABUPATEN_LIST.map((k) => {
      const capaian = records
        .filter((r) => r.kabupatenName === k.name && matchesKomoditas(r.komoditas))
        .filter((r) => {
          const m = parseInt(r.tanggal.slice(5, 7), 10);
          return monthsInRange.includes(m);
        })
        .reduce((s, r) => s + r.luas, 0);
      const target = targets
        .filter((t) => t.kabupatenName === k.name && matchesKomoditas(t.komoditas))
        .filter((t) => monthsInRange.includes(t.bulan))
        .reduce((s, t) => s + t.targetHa, 0);
      return { ...k, capaian: Math.round(capaian * 100) / 100, target: Math.round(target * 100) / 100 };
    });
  }, [records, targets, monthsInRange, komoditasFilter]);

  const scopedRows = perKabupaten;

  const displayRows = kabScope === "Semua" ? scopedRows : scopedRows.filter((r) => r.name === kabScope);

  const provTotal = scopedRows.reduce((s, r) => s + r.capaian, 0);
  const provTarget = scopedRows.reduce((s, r) => s + r.target, 0);
  const provPct = provTarget > 0 ? Math.min(100, Math.round((provTotal / provTarget) * 100)) : 0;

  const maxVal = Math.max(1, ...perKabupaten.map((k) => k.capaian));

  const barData = [...displayRows]
    .sort((a, b) => b.capaian - a.capaian)
    .map((r) => ({ name: shortName(r.name), Capaian: r.capaian, Target: r.target }));

  const komoditasData = useMemo(() => {
    const scope = kabScope === "Semua" ? null : kabScope;
    return KOMODITAS_LIST.map((kom) => {
      const val = records
        .filter((r) => r.komoditas === kom)
        .filter((r) => (scope ? r.kabupatenName === scope : true))
        .filter((r) => monthsInRange.includes(parseInt(r.tanggal.slice(5, 7), 10)))
        .reduce((s, r) => s + r.luas, 0);
      return { name: kom, value: Math.round(val * 100) / 100 };
    });
  }, [records, monthsInRange, kabScope, user]);

  const trendData = useMemo(() => {
    const scope = kabScope === "Semua" ? null : kabScope;
    let running = 0;
    return Array.from({ length: CURRENT_MONTH }, (_, i) => {
      const m = i + 1;
      const val = records
        .filter((r) => (scope ? r.kabupatenName === scope : true))
        .filter((r) => matchesKomoditas(r.komoditas))
        .filter((r) => parseInt(r.tanggal.slice(5, 7), 10) === m)
        .reduce((s, r) => s + r.luas, 0);
      running += val;
      return { bulan: MONTH_NAMES[i].slice(0, 3), Akumulasi: Math.round(running * 100) / 100 };
    });
  }, [records, kabScope, user, komoditasFilter]);

  return (
    <div>
      {/* Filters */}
      <Card style={{ padding: 18, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>Tampilan</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[["bulan", "Per Bulan"], ["akumulasi", "Akumulasi Jan–bulan ini"]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setMode(v)}
                style={{
                  padding: "8px 12px", borderRadius: 8, border: `1px solid ${mode === v ? COLORS.teal : COLORS.line}`,
                  background: mode === v ? COLORS.teal : "#fff", color: mode === v ? "#fff" : COLORS.ink,
                  fontSize: 12.5, cursor: "pointer", fontWeight: 500,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Bulan</label>
          <select style={selectStyle} value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{MONTH_NAMES[m - 1]} {YEAR}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Komoditas</label>
          <select style={selectStyle} value={komoditasFilter} onChange={(e) => setKomoditasFilter(e.target.value)}>
            <option value="Semua">Semua Komoditas</option>
            {KOMODITAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Kabupaten/Kota</label>
          <select style={selectStyle} value={kabScope} onChange={(e) => setKabScope(e.target.value)}>
            <option value="Semua">Semua Kabupaten/Kota</option>
            {KABUPATEN_LIST.map((k) => <option key={k.slug} value={k.name}>{k.name}</option>)}
          </select>
        </div>
      </Card>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div style={kpiLabel}>Total Capaian LTT</div>
          <div style={kpiValue}>{fmtHa(provTotal)} <span style={kpiUnit}>Ha</span></div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={kpiLabel}>Target Periode Ini</div>
          <div style={kpiValue}>{fmtHa(provTarget)} <span style={kpiUnit}>Ha</span></div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={kpiLabel}>Capaian vs Target</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...kpiValue, color: provPct >= 100 ? COLORS.leaf : provPct >= 60 ? COLORS.gold : COLORS.clay }}>
              {provPct}%
            </div>
          </div>
          <div style={{ height: 6, background: COLORS.bgAlt, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${provPct}%`, height: "100%", background: provPct >= 100 ? COLORS.leaf : provPct >= 60 ? COLORS.gold : COLORS.clay }} />
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={kpiLabel}>Kabupaten/Kota Lapor</div>
          <div style={kpiValue}>
            {scopedRows.filter((r) => r.capaian > 0).length}
            <span style={kpiUnit}> / {scopedRows.length}</span>
          </div>
        </Card>
      </div>

      <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20, marginBottom: 20 }}>
        {/* Map */}
        <Card style={{ padding: 20 }}>
          <SectionLabel icon={MapPinned}>Peta Sebaran Capaian LTT</SectionLabel>
          <CapaianMap data={perKabupaten} maxVal={maxVal} />
          <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11.5, color: COLORS.inkSoft, flexWrap: "wrap" }}>
            <LegendDot color={COLORS.leaf} label="Capaian ≥ target" />
            <LegendDot color={COLORS.gold} label="60–99% target" />
            <LegendDot color={COLORS.clay} label="< 60% target" />
            <LegendDot color={COLORS.inkSoft} label="Belum ada target" />
          </div>
        </Card>

        {/* Trend */}
        <Card style={{ padding: 20 }}>
          <SectionLabel icon={Wheat}>Tren Akumulasi Jan–{MONTH_NAMES[CURRENT_MONTH - 1]}</SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="Akumulasi" stroke={COLORS.teal} strokeWidth={2} fill="url(#fillTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 20 }}>
        {/* Target vs Capaian per kabupaten */}
        <Card style={{ padding: 20 }}>
          <SectionLabel icon={TargetIcon}>Target vs Capaian per Kabupaten/Kota</SectionLabel>
          <ResponsiveContainer width="100%" height={Math.max(260, barData.length * 26)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid stroke={COLORS.line} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: COLORS.ink }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Target" fill={COLORS.goldSoft} radius={[0, 4, 4, 0]} />
              <Bar dataKey="Capaian" fill={COLORS.teal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Per komoditas */}
        <Card style={{ padding: 20 }}>
          <SectionLabel icon={Wheat}>Capaian per Komoditas</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={komoditasData} margin={{ left: -14 }}>
              <CartesianGrid stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.line }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {komoditasData.map((d) => <Cell key={d.name} fill={KOMODITAS_COLORS[d.name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </div>
  );
}

const kpiLabel = { fontSize: 12, color: COLORS.inkSoft, marginBottom: 6, fontWeight: 500 };
const kpiValue = { fontFamily: "'Fraunces', serif", fontSize: 26, color: COLORS.ink, fontWeight: 600 };
const kpiUnit = { fontSize: 13, color: COLORS.inkSoft, fontFamily: "'Inter', sans-serif", fontWeight: 400 };
const tooltipStyle = { background: COLORS.ink, border: "none", borderRadius: 8, fontSize: 12, color: "#fff" };

/* ---------------------------------------------------------------------- */
/* Input form                                                             */
/* ---------------------------------------------------------------------- */

function InputForm({ user, onSubmit, records, onUpdate, onDelete }) {
  const isProvinsi = user.role === "provinsi";
  const [kabupatenName, setKabupatenName] = useState(isProvinsi ? KABUPATEN_LIST[0].name : user.kabupatenName);
  const kecamatanOptions = KECAMATAN_MAP[kabupatenName] || [];
  const [kecamatan, setKecamatan] = useState(kecamatanOptions[0] || "");
  const [komoditas, setKomoditas] = useState(KOMODITAS_LIST[0]);
  const [luas, setLuas] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [saved, setSaved] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleKabupatenChange = (name) => {
    setKabupatenName(name);
    setKecamatan((KECAMATAN_MAP[name] || [])[0] || "");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!kecamatan || !luas) return;
    onSubmit({
      id: `r-${Date.now()}`,
      kabupatenName,
      kecamatan,
      komoditas,
      luas: parseFloat(luas),
      tanggal,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    });
    setLuas("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const recent = records
    .filter((r) => (isProvinsi ? true : r.kabupatenName === user.kabupatenName))
    .filter((r) => !r.id.startsWith("seed-"))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div className="grid2" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <SectionLabel icon={ClipboardPlus}>Input Laporan Harian LTT</SectionLabel>
        <form onSubmit={submit}>
          {isProvinsi && (
            <>
              <label style={labelStyle}>Kabupaten/Kota</label>
              <select style={{ ...selectStyle, marginBottom: 14 }} value={kabupatenName} onChange={(e) => handleKabupatenChange(e.target.value)}>
                {KABUPATEN_LIST.map((k) => <option key={k.slug} value={k.name}>{k.name}</option>)}
              </select>
            </>
          )}
          {!isProvinsi && (
            <div style={{ marginBottom: 14, fontSize: 13, color: COLORS.inkSoft }}>
              Kabupaten/Kota: <strong style={{ color: COLORS.ink }}>{user.kabupatenName}</strong>
            </div>
          )}

          <label style={labelStyle}>Kecamatan</label>
          <select style={{ ...selectStyle, marginBottom: 14 }} value={kecamatan} onChange={(e) => setKecamatan(e.target.value)}>
            {kecamatanOptions.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>

          <label style={labelStyle}>Komoditas</label>
          <select style={{ ...selectStyle, marginBottom: 14 }} value={komoditas} onChange={(e) => setKomoditas(e.target.value)}>
            {KOMODITAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>LTT (Ha)</label>
              <input type="number" step="0.01" min="0" style={inputStyle} value={luas} onChange={(e) => setLuas(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tanggal</label>
              <input type="date" style={inputStyle} value={tanggal} onChange={(e) => setTanggal(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>

          <button type="submit" style={primaryBtn}>
            <Plus size={16} strokeWidth={2.25} /> Simpan Laporan
          </button>
          {saved && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: COLORS.leaf, fontSize: 13 }}>
              <Check size={15} /> Tersimpan.
            </div>
          )}
        </form>
      </Card>

      <Card style={{ padding: 24 }}>
        <SectionLabel icon={Wheat}>Laporan Terbaru</SectionLabel>
        {recent.length === 0 ? (
          <div style={{ color: COLORS.inkSoft, fontSize: 13.5 }}>Belum ada laporan baru yang diinput.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recent.map((r) => (
              <div key={r.id} style={{ padding: "10px 12px", background: COLORS.bgAlt, borderRadius: 9, fontSize: 13 }}>
                {confirmDeleteId === r.id ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: COLORS.clay, fontSize: 12.5 }}>Hapus laporan ini?</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { onDelete(r.id); setConfirmDeleteId(null); }} style={smallDangerBtn}>Ya, Hapus</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={smallGhostBtn}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: COLORS.ink }}>{isProvinsi ? shortName(r.kabupatenName) : r.kecamatan}</div>
                      <div style={{ color: COLORS.inkSoft, fontSize: 12 }}>
                        {isProvinsi ? r.kecamatan : ""} {isProvinsi ? "·" : ""} {r.komoditas} · {r.tanggal}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: COLORS.teal }}>{fmtHa(r.luas)} Ha</div>
                      <button onClick={() => setEditingRecord(r)} title="Edit" style={iconBtn}><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDeleteId(r.id)} title="Hapus" style={iconBtn}><Trash2 size={14} color={COLORS.clay} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          isProvinsi={isProvinsi}
          onClose={() => setEditingRecord(null)}
          onSave={(updates) => { onUpdate(editingRecord.id, updates); setEditingRecord(null); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Target manager (provinsi only)                                        */
/* ---------------------------------------------------------------------- */

function TargetManager({ targets, onAdd, onUpdate, onDelete }) {
  const [kabupatenName, setKabupatenName] = useState(KABUPATEN_LIST[0].name);
  const [komoditas, setKomoditas] = useState(KOMODITAS_LIST[0]);
  const [bulan, setBulan] = useState(CURRENT_MONTH);
  const [targetHa, setTargetHa] = useState("");
  const [saved, setSaved] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!targetHa) return;
    onAdd({
      id: `t-${Date.now()}`,
      kabupatenName,
      komoditas,
      bulan: parseInt(bulan, 10),
      targetHa: parseFloat(targetHa),
    });
    setTargetHa("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const recentTargets = [...targets]
    .filter((t) => !t.id.startsWith("seedt-"))
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 8);

  return (
    <div className="grid2" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <SectionLabel icon={TargetIcon}>Tetapkan Target Bulanan</SectionLabel>
        <form onSubmit={submit}>
          <label style={labelStyle}>Kabupaten/Kota</label>
          <select style={{ ...selectStyle, marginBottom: 14 }} value={kabupatenName} onChange={(e) => setKabupatenName(e.target.value)}>
            {KABUPATEN_LIST.map((k) => <option key={k.slug} value={k.name}>{k.name}</option>)}
          </select>

          <label style={labelStyle}>Komoditas</label>
          <select style={{ ...selectStyle, marginBottom: 14 }} value={komoditas} onChange={(e) => setKomoditas(e.target.value)}>
            {KOMODITAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Bulan</label>
              <select style={selectStyle} value={bulan} onChange={(e) => setBulan(e.target.value)}>
                {MONTH_NAMES.slice(0, 12).map((m, i) => <option key={i} value={i + 1}>{m} {YEAR}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Target (Ha)</label>
              <input type="number" step="0.01" min="0" style={inputStyle} value={targetHa} onChange={(e) => setTargetHa(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <button type="submit" style={primaryBtn}>
            <Plus size={16} strokeWidth={2.25} /> Simpan Target
          </button>
          {saved && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: COLORS.leaf, fontSize: 13 }}>
              <Check size={15} /> Target tersimpan.
            </div>
          )}
        </form>
      </Card>

      <Card style={{ padding: 24 }}>
        <SectionLabel icon={ClipboardPlus}>Target Terbaru Ditetapkan</SectionLabel>
        {recentTargets.length === 0 ? (
          <div style={{ color: COLORS.inkSoft, fontSize: 13.5 }}>Belum ada target baru yang ditambahkan secara manual.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentTargets.map((t) => (
              <div key={t.id} style={{ padding: "10px 12px", background: COLORS.bgAlt, borderRadius: 9, fontSize: 13 }}>
                {confirmDeleteId === t.id ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: COLORS.clay, fontSize: 12.5 }}>Hapus target ini?</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { onDelete(t.id); setConfirmDeleteId(null); }} style={smallDangerBtn}>Ya, Hapus</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={smallGhostBtn}>Batal</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: COLORS.ink }}>{shortName(t.kabupatenName)}</div>
                      <div style={{ color: COLORS.inkSoft, fontSize: 12 }}>{t.komoditas} · {MONTH_NAMES[t.bulan - 1]} {YEAR}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: COLORS.gold }}>{fmtHa(t.targetHa)} Ha</div>
                      <button onClick={() => setEditingTarget(t)} title="Edit" style={iconBtn}><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDeleteId(t.id)} title="Hapus" style={iconBtn}><Trash2 size={14} color={COLORS.clay} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editingTarget && (
        <EditTargetModal
          target={editingTarget}
          onClose={() => setEditingTarget(null)}
          onSave={(updates) => { onUpdate(editingTarget.id, updates); setEditingTarget(null); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Kelola Akun (khusus provinsi): reset password admin kabupaten          */
/* ---------------------------------------------------------------------- */

function ResetPasswordModal({ kabupaten, onClose, onSave }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password baru minimal 6 karakter."); return; }
    if (newPassword !== confirm) { setError("Konfirmasi password tidak cocok."); return; }
    setError("");
    onSave(newPassword);
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <ModalShell title={`Reset Password — ${shortName(kabupaten.kabupatenName)}`} onClose={onClose}>
      {success ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.leaf, fontSize: 14, padding: "8px 0" }}>
          <Check size={17} /> Password berhasil direset.
        </div>
      ) : (
        <form onSubmit={submit}>
          <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 14 }}>
            Username: <strong style={{ color: COLORS.ink, fontFamily: "'IBM Plex Mono', monospace" }}>{kabupaten.username}</strong>
          </div>
          <label style={labelStyle}>Password Baru</label>
          <input type="password" style={{ ...inputStyle, marginBottom: 12 }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" autoFocus />
          <label style={labelStyle}>Konfirmasi Password Baru</label>
          <input type="password" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <div style={{ color: COLORS.clay, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
          <button type="submit" style={primaryBtn}><KeyRound size={16} /> Simpan Password Baru</button>
        </form>
      )}
    </ModalShell>
  );
}

function KelolaAkun({ users, onResetPassword }) {
  const [resettingUser, setResettingUser] = useState(null);

  const kabupatenUsers = KABUPATEN_LIST.map((k) => {
    const u = users.find((x) => x.username === k.slug) || {};
    return { kabupatenName: k.name, username: k.slug, password: u.password };
  });

  return (
    <div>
      <Card style={{ padding: 24 }}>
        <SectionLabel icon={Users}>Kelola Akun Admin Kabupaten/Kota</SectionLabel>
        <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 16 }}>
          Admin provinsi tidak bisa melihat password admin kabupaten yang sudah diubah (demi keamanan) — tapi bisa mengatur ulang (reset) ke password baru kalau admin kabupaten lupa password mereka.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {kabupatenUsers.map((k) => (
            <div key={k.username} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: COLORS.bgAlt, borderRadius: 9 }}>
              <div>
                <div style={{ fontWeight: 600, color: COLORS.ink, fontSize: 13 }}>{shortName(k.kabupatenName)}</div>
                <div style={{ color: COLORS.inkSoft, fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace" }}>username: {k.username}</div>
              </div>
              <button
                onClick={() => setResettingUser(k)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "7px 11px", fontSize: 12, color: COLORS.ink, cursor: "pointer" }}
              >
                <KeyRound size={13} /> Reset Password
              </button>
            </div>
          ))}
        </div>
      </Card>

      {resettingUser && (
        <ResetPasswordModal
          kabupaten={resettingUser}
          onClose={() => setResettingUser(null)}
          onSave={(newPassword) => onResetPassword(resettingUser.username, newPassword)}
        />
      )}
    </div>
  );
}

function downloadCSV(filename, headers, rows) {
  const escapeCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const cellNum = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, textAlign: "right", padding: "8px 10px" };
const cellHead = { fontSize: 11, fontWeight: 600, color: COLORS.inkSoft, textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap" };

function Tabulasi({ records, targets, onUpdateRecord, onDeleteRecord }) {
  const [subTab, setSubTab] = useState("kabupaten");
  const [mode, setMode] = useState("akumulasi");
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [editingRecord, setEditingRecord] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (!records || records.length === 0) return todayStr;
    const maxDate = records.reduce((max, r) => (dateOnly(r.tanggal) > max ? dateOnly(r.tanggal) : max), dateOnly(records[0].tanggal));
    return maxDate < todayStr ? maxDate : todayStr;
  });

  const monthsInRange = useMemo(
    () => (mode === "akumulasi" ? Array.from({ length: month }, (_, i) => i + 1) : [month]),
    [mode, month]
  );

  const kabupatenRows = useMemo(() => {
    return KABUPATEN_LIST.map((k) => {
      const row = { name: k.name };
      let total = 0;
      KOMODITAS_LIST.forEach((kom) => {
        const val = records
          .filter((r) => r.kabupatenName === k.name && r.komoditas === kom && monthsInRange.includes(parseInt(r.tanggal.slice(5, 7), 10)))
          .reduce((s, r) => s + r.luas, 0);
        row[kom] = Math.round(val * 100) / 100;
        total += val;
      });
      row.total = Math.round(total * 100) / 100;
      const target = targets
        .filter((t) => t.kabupatenName === k.name && monthsInRange.includes(t.bulan))
        .reduce((s, t) => s + t.targetHa, 0);
      row.target = Math.round(target * 100) / 100;
      row.pct = target > 0 ? Math.round((row.total / target) * 100) : null;
      return row;
    });
  }, [records, targets, monthsInRange]);

  const provinsiTotalRow = useMemo(() => {
    const row = { name: "TOTAL PROVINSI NTT" };
    let total = 0;
    KOMODITAS_LIST.forEach((kom) => {
      const v = kabupatenRows.reduce((s, r) => s + (r[kom] || 0), 0);
      row[kom] = Math.round(v * 100) / 100;
      total += v;
    });
    row.total = Math.round(total * 100) / 100;
    row.target = Math.round(kabupatenRows.reduce((s, r) => s + r.target, 0) * 100) / 100;
    row.pct = row.target > 0 ? Math.round((row.total / row.target) * 100) : null;
    return row;
  }, [kabupatenRows]);

  const provMonthly = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const row = { bulan: MONTH_NAMES[i] };
      let total = 0;
      KOMODITAS_LIST.forEach((kom) => {
        const v = records
          .filter((r) => r.komoditas === kom && parseInt(r.tanggal.slice(5, 7), 10) === m)
          .reduce((s, r) => s + r.luas, 0);
        row[kom] = Math.round(v * 100) / 100;
        total += v;
      });
      row.total = Math.round(total * 100) / 100;
      return row;
    });
  }, [records]);

  const pctColor = (pct) => (pct === null ? COLORS.inkSoft : pct >= 100 ? COLORS.leaf : pct >= 60 ? COLORS.gold : COLORS.clay);

  const exportKabupaten = () => {
    const headers = ["Kabupaten/Kota", ...KOMODITAS_LIST, "Total (Ha)", "Target (Ha)", "Capaian (%)"];
    const rows = [...kabupatenRows, provinsiTotalRow].map((r) => [
      r.name, ...KOMODITAS_LIST.map((k) => r[k]), r.total, r.target, r.pct ?? "-",
    ]);
    downloadCSV(`tabulasi-kabupaten-${mode}-bulan${month}.csv`, headers, rows);
  };

  const exportProvinsi = () => {
    const headers = ["Bulan", ...KOMODITAS_LIST, "Total (Ha)"];
    const rows = provMonthly.map((r) => [r.bulan, ...KOMODITAS_LIST.map((k) => r[k]), r.total]);
    downloadCSV("tabulasi-rekap-provinsi.csv", headers, rows);
  };

  // --- Data untuk sub-tab Harian ---
  const entriesOnDate = useMemo(
    () => records.filter((r) => dateOnly(r.tanggal) === selectedDate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [records, selectedDate]
  );

  const kepatuhanList = useMemo(() => {
    return KABUPATEN_LIST.map((k) => ({
      name: k.name,
      sudahLapor: entriesOnDate.some((r) => r.kabupatenName === k.name),
      jumlahEntri: entriesOnDate.filter((r) => r.kabupatenName === k.name).length,
    }));
  }, [entriesOnDate]);
  const jumlahSudahLapor = kepatuhanList.filter((k) => k.sudahLapor).length;

  const [selYear, selMonth, selDay] = selectedDate.split("-").map((v) => parseInt(v, 10));
  const daysInSelMonth = new Date(selYear, selMonth, 0).getDate();
  const entriesPerDay = useMemo(() => {
    return Array.from({ length: daysInSelMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${selYear}-${String(selMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayRecords = records.filter((r) => dateOnly(r.tanggal) === dateStr);
      return {
        tgl: d,
        dateStr,
        jumlahEntri: dayRecords.length,
        totalLuas: Math.round(dayRecords.reduce((s, r) => s + r.luas, 0) * 100) / 100,
      };
    });
  }, [records, selYear, selMonth, daysInSelMonth]);

  const totalLuasHariIni = Math.round(entriesOnDate.reduce((s, r) => s + r.luas, 0) * 100) / 100;

  const exportHarian = () => {
    const headers = ["Kabupaten/Kota", "Kecamatan", "Komoditas", "LTT (Ha)", "Diinput Oleh", "Waktu Input"];
    const rows = entriesOnDate.map((r) => [
      r.kabupatenName, r.kecamatan, r.komoditas, r.luas, r.createdBy,
      new Date(r.createdAt).toLocaleString("id-ID"),
    ]);
    downloadCSV(`log-harian-${selectedDate}.csv`, headers, rows);
  };

  return (
    <div>
      <Card style={{ padding: 6, marginBottom: 20, display: "inline-flex", gap: 4 }}>
        {[["kabupaten", "Kabupaten"], ["provinsi", "Provinsi"], ["harian", "Harian"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setSubTab(v)}
            style={{
              padding: "9px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: subTab === v ? COLORS.teal : "transparent", color: subTab === v ? "#fff" : COLORS.inkSoft,
            }}
          >
            {l}
          </button>
        ))}
      </Card>

      {subTab === "kabupaten" && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 14, marginBottom: 16 }}>
            <div>
              <SectionLabel icon={Table2}>Tabulasi 22 Kabupaten/Kota se-NTT</SectionLabel>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["bulan", "Per Bulan"], ["akumulasi", "Akumulasi Jan–bulan ini"]].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setMode(v)}
                      style={{
                        padding: "7px 11px", borderRadius: 8, border: `1px solid ${mode === v ? COLORS.teal : COLORS.line}`,
                        background: mode === v ? COLORS.teal : "#fff", color: mode === v ? "#fff" : COLORS.ink,
                        fontSize: 12, cursor: "pointer", fontWeight: 500,
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <select style={{ ...selectStyle, padding: "7px 10px", fontSize: 12.5 }} value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{MONTH_NAMES[m - 1]} {YEAR}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={exportKabupaten}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: COLORS.ink, cursor: "pointer" }}
            >
              <Download size={13} /> Unduh CSV
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.line}` }}>
                  <th style={{ ...cellHead, textAlign: "left" }}>Kabupaten/Kota</th>
                  {KOMODITAS_LIST.map((k) => <th key={k} style={cellHead}>{k}</th>)}
                  <th style={cellHead}>Total (Ha)</th>
                  <th style={cellHead}>Target (Ha)</th>
                  <th style={cellHead}>Capaian</th>
                </tr>
              </thead>
              <tbody>
                {kabupatenRows.map((r, i) => (
                  <tr key={r.name} style={{ borderBottom: `1px solid ${COLORS.line}`, background: i % 2 ? COLORS.bgAlt : "transparent" }}>
                    <td style={{ padding: "8px 10px", fontSize: 12.5, fontWeight: 500 }}>{shortName(r.name)}</td>
                    {KOMODITAS_LIST.map((k) => <td key={k} style={cellNum}>{fmtHa(r[k])}</td>)}
                    <td style={{ ...cellNum, fontWeight: 600 }}>{fmtHa(r.total)}</td>
                    <td style={cellNum}>{fmtHa(r.target)}</td>
                    <td style={{ ...cellNum, color: pctColor(r.pct), fontWeight: 600 }}>{r.pct === null ? "–" : `${r.pct}%`}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${COLORS.line}`, background: COLORS.tealSoft }}>
                  <td style={{ padding: "9px 10px", fontSize: 12.5, fontWeight: 700 }}>{provinsiTotalRow.name}</td>
                  {KOMODITAS_LIST.map((k) => <td key={k} style={{ ...cellNum, fontWeight: 700 }}>{fmtHa(provinsiTotalRow[k])}</td>)}
                  <td style={{ ...cellNum, fontWeight: 700 }}>{fmtHa(provinsiTotalRow.total)}</td>
                  <td style={{ ...cellNum, fontWeight: 700 }}>{fmtHa(provinsiTotalRow.target)}</td>
                  <td style={{ ...cellNum, color: pctColor(provinsiTotalRow.pct), fontWeight: 700 }}>{provinsiTotalRow.pct === null ? "–" : `${provinsiTotalRow.pct}%`}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {subTab === "provinsi" && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <SectionLabel icon={Table2}>Rekap Penuh Provinsi NTT — Januari–Desember {YEAR}</SectionLabel>
            <button
              onClick={exportProvinsi}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: COLORS.ink, cursor: "pointer" }}
            >
              <Download size={13} /> Unduh CSV
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.line}` }}>
                  <th style={{ ...cellHead, textAlign: "left" }}>Bulan</th>
                  {KOMODITAS_LIST.map((k) => <th key={k} style={cellHead}>{k}</th>)}
                  <th style={cellHead}>Total (Ha)</th>
                </tr>
              </thead>
              <tbody>
                {provMonthly.map((r, i) => (
                  <tr key={r.bulan} style={{ borderBottom: `1px solid ${COLORS.line}`, background: i % 2 ? COLORS.bgAlt : "transparent" }}>
                    <td style={{ padding: "8px 10px", fontSize: 12.5, fontWeight: 500 }}>{r.bulan} {YEAR}</td>
                    {KOMODITAS_LIST.map((k) => <td key={k} style={cellNum}>{fmtHa(r[k])}</td>)}
                    <td style={{ ...cellNum, fontWeight: 600 }}>{fmtHa(r.total)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${COLORS.line}`, background: COLORS.tealSoft }}>
                  <td style={{ padding: "9px 10px", fontSize: 12.5, fontWeight: 700 }}>Total Akumulasi</td>
                  {KOMODITAS_LIST.map((k) => (
                    <td key={k} style={{ ...cellNum, fontWeight: 700 }}>
                      {fmtHa(provMonthly.reduce((s, r) => s + r[k], 0))}
                    </td>
                  ))}
                  <td style={{ ...cellNum, fontWeight: 700 }}>
                    {fmtHa(provMonthly.reduce((s, r) => s + r.total, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {subTab === "harian" && (
        <div>
          <Card style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Pilih Tanggal</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <button
                onClick={exportHarian}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: COLORS.ink, cursor: "pointer" }}
              >
                <Download size={13} /> Unduh CSV
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
              <Card style={{ padding: 16 }}>
                <div style={kpiLabel}>Kabupaten/Kota Lapor</div>
                <div style={kpiValue}>{jumlahSudahLapor}<span style={kpiUnit}> / {KABUPATEN_LIST.length}</span></div>
              </Card>
              <Card style={{ padding: 16 }}>
                <div style={kpiLabel}>Total Entri Hari Ini</div>
                <div style={kpiValue}>{entriesOnDate.length}</div>
              </Card>
              <Card style={{ padding: 16 }}>
                <div style={kpiLabel}>Total LTT Hari Ini</div>
                <div style={kpiValue}>{fmtHa(totalLuasHariIni)} <span style={kpiUnit}>Ha</span></div>
              </Card>
            </div>
          </Card>

          <div className="grid2" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}>
              <SectionLabel icon={CheckCircle2}>Status Kepatuhan Lapor — {selectedDate}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                {kepatuhanList.map((k) => (
                  <div key={k.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: k.sudahLapor ? COLORS.leafSoft : COLORS.bgAlt }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {k.sudahLapor ? <CheckCircle2 size={15} color={COLORS.leaf} /> : <Circle size={15} color={COLORS.inkSoft} />}
                      <span style={{ fontSize: 12.5, color: COLORS.ink }}>{shortName(k.name)}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: COLORS.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {k.sudahLapor ? `${k.jumlahEntri} entri` : "belum lapor"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ padding: 20 }}>
              <SectionLabel icon={CalendarDays}>Jumlah Entri per Hari — {MONTH_NAMES[selMonth - 1]} {selYear}</SectionLabel>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={entriesPerDay} margin={{ left: -14 }}>
                  <CartesianGrid stroke={COLORS.line} vertical={false} />
                  <XAxis dataKey="tgl" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.line }} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `Tanggal ${v}`} formatter={(val, name) => [val, name === "jumlahEntri" ? "Jumlah Entri" : name]} />
                  <Bar dataKey="jumlahEntri" radius={[4, 4, 0, 0]}>
                    {entriesPerDay.map((d) => (
                      <Cell key={d.tgl} fill={d.dateStr === selectedDate ? COLORS.teal : COLORS.tealSoft} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card style={{ padding: 20 }}>
            <SectionLabel icon={Clock}>Log Input — {selectedDate}</SectionLabel>
            {entriesOnDate.length === 0 ? (
              <div style={{ color: COLORS.inkSoft, fontSize: 13.5 }}>Belum ada laporan yang masuk pada tanggal ini.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.line}` }}>
                      <th style={{ ...cellHead, textAlign: "left" }}>Kabupaten/Kota</th>
                      <th style={{ ...cellHead, textAlign: "left" }}>Kecamatan</th>
                      <th style={{ ...cellHead, textAlign: "left" }}>Komoditas</th>
                      <th style={cellHead}>LTT (Ha)</th>
                      <th style={{ ...cellHead, textAlign: "left" }}>Diinput Oleh</th>
                      <th style={{ ...cellHead, textAlign: "left" }}>Waktu Input</th>
                      <th style={cellHead}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesOnDate.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${COLORS.line}`, background: i % 2 ? COLORS.bgAlt : "transparent" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12.5, fontWeight: 500 }}>{shortName(r.kabupatenName)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12.5 }}>{r.kecamatan}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12.5 }}>{r.komoditas}</td>
                        <td style={cellNum}>{fmtHa(r.luas)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace" }}>{r.createdBy}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11.5, color: COLORS.inkSoft }}>{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                          {confirmDeleteId === r.id ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => { onDeleteRecord(r.id); setConfirmDeleteId(null); }} style={smallDangerBtn}>Ya</button>
                              <button onClick={() => setConfirmDeleteId(null)} style={smallGhostBtn}>Batal</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => setEditingRecord(r)} title="Edit" style={iconBtn}><Pencil size={14} /></button>
                              <button onClick={() => setConfirmDeleteId(r.id)} title="Hapus" style={iconBtn}><Trash2 size={14} color={COLORS.clay} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          isProvinsi
          onClose={() => setEditingRecord(null)}
          onSave={(updates) => { onUpdateRecord(editingRecord.id, updates); setEditingRecord(null); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal: Ubah Password & Bantuan                                        */
/* ---------------------------------------------------------------------- */

function ModalShell({ title, onClose, children, maxWidth = 380 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(43,36,24,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16 }}>
      <Card style={{ padding: 24, maxWidth, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.inkSoft }}><X size={18} /></button>
        </div>
        {children}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Modal: Edit Laporan & Edit Target                                      */
/* ---------------------------------------------------------------------- */

function EditRecordModal({ record, isProvinsi, onClose, onSave }) {
  const [kabupatenName, setKabupatenName] = useState(record.kabupatenName);
  const kecamatanOptions = KECAMATAN_MAP[kabupatenName] || [];
  const [kecamatan, setKecamatan] = useState(record.kecamatan);
  const [komoditas, setKomoditas] = useState(record.komoditas);
  const [luas, setLuas] = useState(String(record.luas));
  const [tanggal, setTanggal] = useState(record.tanggal);

  const handleKabupatenChange = (name) => {
    setKabupatenName(name);
    setKecamatan((KECAMATAN_MAP[name] || [])[0] || "");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!kecamatan || !luas) return;
    onSave({ kabupatenName, kecamatan, komoditas, luas: parseFloat(luas), tanggal });
  };

  return (
    <ModalShell title="Edit Laporan" onClose={onClose}>
      <form onSubmit={submit}>
        {isProvinsi && (
          <>
            <label style={labelStyle}>Kabupaten/Kota</label>
            <select style={{ ...selectStyle, marginBottom: 12 }} value={kabupatenName} onChange={(e) => handleKabupatenChange(e.target.value)}>
              {KABUPATEN_LIST.map((k) => <option key={k.slug} value={k.name}>{k.name}</option>)}
            </select>
          </>
        )}
        <label style={labelStyle}>Kecamatan</label>
        <select style={{ ...selectStyle, marginBottom: 12 }} value={kecamatan} onChange={(e) => setKecamatan(e.target.value)}>
          {kecamatanOptions.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <label style={labelStyle}>Komoditas</label>
        <select style={{ ...selectStyle, marginBottom: 12 }} value={komoditas} onChange={(e) => setKomoditas(e.target.value)}>
          {KOMODITAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>LTT (Ha)</label>
            <input type="number" step="0.01" min="0" style={inputStyle} value={luas} onChange={(e) => setLuas(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Tanggal</label>
            <input type="date" style={inputStyle} value={tanggal} onChange={(e) => setTanggal(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
        </div>
        <button type="submit" style={primaryBtn}><Save size={16} /> Simpan Perubahan</button>
      </form>
    </ModalShell>
  );
}

function EditTargetModal({ target, onClose, onSave }) {
  const [kabupatenName, setKabupatenName] = useState(target.kabupatenName);
  const [komoditas, setKomoditas] = useState(target.komoditas);
  const [bulan, setBulan] = useState(target.bulan);
  const [targetHa, setTargetHa] = useState(String(target.targetHa));

  const submit = (e) => {
    e.preventDefault();
    if (!targetHa) return;
    onSave({ kabupatenName, komoditas, bulan: parseInt(bulan, 10), targetHa: parseFloat(targetHa) });
  };

  return (
    <ModalShell title="Edit Target" onClose={onClose}>
      <form onSubmit={submit}>
        <label style={labelStyle}>Kabupaten/Kota</label>
        <select style={{ ...selectStyle, marginBottom: 12 }} value={kabupatenName} onChange={(e) => setKabupatenName(e.target.value)}>
          {KABUPATEN_LIST.map((k) => <option key={k.slug} value={k.name}>{k.name}</option>)}
        </select>
        <label style={labelStyle}>Komoditas</label>
        <select style={{ ...selectStyle, marginBottom: 12 }} value={komoditas} onChange={(e) => setKomoditas(e.target.value)}>
          {KOMODITAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Bulan</label>
            <select style={selectStyle} value={bulan} onChange={(e) => setBulan(e.target.value)}>
              {MONTH_NAMES.slice(0, 12).map((m, i) => <option key={i} value={i + 1}>{m} {YEAR}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Target (Ha)</label>
            <input type="number" step="0.01" min="0" style={inputStyle} value={targetHa} onChange={(e) => setTargetHa(e.target.value)} />
          </div>
        </div>
        <button type="submit" style={primaryBtn}><Save size={16} /> Simpan Perubahan</button>
      </form>
    </ModalShell>
  );
}

function ChangePasswordModal({ user, onClose, onSubmit }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (current !== user.password) { setError("Password saat ini salah."); return; }
    if (next.length < 6) { setError("Password baru minimal 6 karakter."); return; }
    if (next !== confirm) { setError("Konfirmasi password baru tidak cocok."); return; }
    setError("");
    onSubmit(next);
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <ModalShell title="Ubah Password" onClose={onClose}>
      {success ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.leaf, fontSize: 14, padding: "8px 0" }}>
          <Check size={17} /> Password berhasil diubah.
        </div>
      ) : (
        <form onSubmit={submit}>
          <label style={labelStyle}>Password Saat Ini</label>
          <input type="password" style={{ ...inputStyle, marginBottom: 12 }} value={current} onChange={(e) => setCurrent(e.target.value)} />
          <label style={labelStyle}>Password Baru</label>
          <input type="password" style={{ ...inputStyle, marginBottom: 12 }} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Minimal 6 karakter" />
          <label style={labelStyle}>Konfirmasi Password Baru</label>
          <input type="password" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <div style={{ color: COLORS.clay, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
          <button type="submit" style={primaryBtn}><KeyRound size={16} /> Simpan Password Baru</button>
        </form>
      )}
    </ModalShell>
  );
}

function HelpModal({ onClose }) {
  const items = [
    ["Input laporan harian", "Buka menu Input Data, pilih kecamatan dan komoditas, isi luas (Ha), lalu Simpan Laporan."],
    ["Melihat capaian vs target", "Buka Dashboard atau Tabulasi, gunakan filter bulan/akumulasi untuk melihat progres per kabupaten atau satu provinsi."],
    ["Melihat siapa yang sudah lapor hari ini", "Buka Tabulasi → sub-menu Harian, pilih tanggal yang ingin dicek."],
    ["Lupa password", "Hubungi Admin Provinsi Dinas Pertanian dan Ketahanan Pangan Provinsi NTT untuk bantuan reset akun."],
  ];
  return (
    <ModalShell title="Bantuan" onClose={onClose} maxWidth={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map(([q, a]) => (
          <div key={q}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink, marginBottom: 2 }}>{q}</div>
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5 }}>{a}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

/* ---------------------------------------------------------------------- */
/* App shell                                                              */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [dataLoading, setDataLoading] = useState(true);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [records, setRecords] = useState([]);
  const [targets, setTargets] = useState([]);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    (async () => {
      // Akun login dasarnya tetap dari kode (username/role/kabupaten tidak
      // disimpan di Sheets demi kesederhanaan), tapi kalau ada password yang
      // pernah diubah/direset, terapkan override-nya supaya perubahan itu tetap
      // berlaku. Kalau sudah terhubung ke Google Sheets, override diambil dari
      // sheet "Users"; kalau belum, dari penyimpanan demo (window.storage).
      setUsers(DEFAULT_USERS);
      if (hasBackend()) {
        try {
          const usersFromSheet = await sheetsGet("getUsers");
          if (Array.isArray(usersFromSheet) && usersFromSheet.length > 0) {
            const overrideMap = {};
            usersFromSheet.forEach((u) => { if (u.username && u.password) overrideMap[u.username] = u.password; });
            setUsers(DEFAULT_USERS.map((u) => (overrideMap[u.username] ? { ...u, password: overrideMap[u.username] } : u)));
          }
        } catch {
          // Sheet "Users" mungkin belum dibuat — biarkan pakai DEFAULT_USERS supaya login tetap jalan.
        }
      } else {
        const overrides = await loadKey("ltt:password_overrides", null);
        if (overrides) {
          setUsers(DEFAULT_USERS.map((u) => (overrides[u.username] ? { ...u, password: overrides[u.username] } : u)));
        }
      }

      if (hasBackend()) {
        try {
          const [r, t] = await Promise.all([sheetsGet("getRecords"), sheetsGet("getTargets")]);
          setRecords(Array.isArray(r) ? r : []);
          setTargets(Array.isArray(t) ? t : []);
          setBackendError(null);
        } catch (err) {
          setBackendError(String(err.message || err));
          setRecords([]); setTargets([]);
        }
        setDataLoading(false);
        return;
      }

      // Mode demo (belum terhubung ke Google Sheets)
      let r = await loadKey("ltt:records", null);
      if (!r) { r = seedRecords(); await saveKey("ltt:records", r); }

      let t = await loadKey("ltt:targets", null);
      if (!t) { t = seedTargets(); await saveKey("ltt:targets", t); }

      setRecords(r); setTargets(t);
      setDataLoading(false);
    })();
  }, []);

  const addRecord = useCallback(async (rec) => {
    if (hasBackend()) {
      setRecords((prev) => [...prev, rec]); // optimistic — langsung tampil
      try {
        await sheetsPost("addRecord", rec);
      } catch (err) {
        setBackendError(String(err.message || err));
      }
      return;
    }
    setRecords((prev) => {
      const next = [...prev, rec];
      saveKey("ltt:records", next);
      return next;
    });
  }, []);

  const addTarget = useCallback(async (tgt) => {
    if (hasBackend()) {
      setTargets((prev) => [...prev, tgt]);
      try {
        await sheetsPost("addTarget", tgt);
      } catch (err) {
        setBackendError(String(err.message || err));
      }
      return;
    }
    setTargets((prev) => {
      const next = [...prev, tgt];
      saveKey("ltt:targets", next);
      return next;
    });
  }, []);

  const updateRecord = useCallback(async (id, updates) => {
    if (hasBackend()) {
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
      try {
        await sheetsPost("updateRecord", { id, ...updates });
      } catch (err) {
        setBackendError(String(err.message || err));
      }
      return;
    }
    setRecords((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      saveKey("ltt:records", next);
      return next;
    });
  }, []);

  const deleteRecord = useCallback(async (id) => {
    if (hasBackend()) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      try {
        await sheetsPost("deleteRecord", { id });
      } catch (err) {
        setBackendError(String(err.message || err));
      }
      return;
    }
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveKey("ltt:records", next);
      return next;
    });
  }, []);

  const updateTarget = useCallback(async (id, updates) => {
    if (hasBackend()) {
      setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      try {
        await sheetsPost("updateTarget", { id, ...updates });
      } catch (err) {
        setBackendError(String(err.message || err));
      }
      return;
    }
    setTargets((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveKey("ltt:targets", next);
      return next;
    });
  }, []);

  const deleteTarget = useCallback(async (id) => {
    if (hasBackend()) {
      setTargets((prev) => prev.filter((t) => t.id !== id));
      try {
        await sheetsPost("deleteTarget", { id });
      } catch (err) {
        setBackendError(String(err.message || err));
      }
      return;
    }
    setTargets((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveKey("ltt:targets", next);
      return next;
    });
  }, []);

  const changePassword = useCallback(async (newPassword) => {
    const nextUsers = users.map((u) => (u.username === user.username ? { ...u, password: newPassword } : u));
    setUsers(nextUsers);
    setUser((prev) => (prev ? { ...prev, password: newPassword } : prev));
    try {
      await persistPasswordOverride(nextUsers, user.username, newPassword);
    } catch (err) {
      setBackendError(String(err.message || err));
    }
  }, [user, users]);

  const resetKabupatenPassword = useCallback(async (username, newPassword) => {
    const nextUsers = users.map((u) => (u.username === username ? { ...u, password: newPassword } : u));
    setUsers(nextUsers);
    try {
      await persistPasswordOverride(nextUsers, username, newPassword);
    } catch (err) {
      setBackendError(String(err.message || err));
    }
  }, [users]);

  if (!user) {
    return (
      <>
        <FontImports />
        <LoginScreen users={users} onLogin={setUser} />
      </>
    );
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "input", label: "Input Data", icon: ClipboardPlus },
    { key: "tabulasi", label: "Tabulasi", icon: Table2 },
    ...(user.role === "provinsi" ? [
      { key: "target", label: "Kelola Target", icon: TargetIcon },
      { key: "akun", label: "Kelola Akun", icon: Users },
    ] : []),
  ];

  const HEADER_H = 58;
  const mobileSidebarOpen = isMobile && !sidebarCollapsed;
  const initials = (user.displayName || user.username || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter', sans-serif", color: COLORS.ink, display: "flex", flexDirection: "column" }}>
      <FontImports />

      {/* Header — paten, selalu penuh dari kiri ke kanan, tidak ikut ciut */}
      <header
        style={{
          height: HEADER_H, flexShrink: 0, background: COLORS.card, borderBottom: `1px solid ${COLORS.line}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
          position: "sticky", top: 0, zIndex: 60,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={NTT_LOGO_URL} alt="Lambang Provinsi NTT" style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}>SiPARE WANGI</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 8.5, padding: "1px 5px", borderRadius: 5, background: hasBackend() ? COLORS.leafSoft : COLORS.goldSoft, color: hasBackend() ? COLORS.leaf : "#8a6a12", fontWeight: 600, width: "fit-content", marginTop: 2 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "currentColor" }} />
              {hasBackend() ? "Google Sheets" : "Mode Demo"}
            </span>
          </div>
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? "Tampilkan menu" : "Ciutkan menu"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, marginLeft: 4,
              background: "none", border: "none", borderRadius: 7, color: COLORS.inkSoft, cursor: "pointer",
            }}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Avatar profil */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowAvatarMenu((v) => !v)}
            style={{
              width: 34, height: 34, borderRadius: "50%", background: COLORS.teal, color: "#fff", border: "none",
              cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "'Inter', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={user.displayName}
          >
            {initials}
          </button>
          {showAvatarMenu && (
            <>
              <div onClick={() => setShowAvatarMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 69 }} />
              <div
                style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 70, minWidth: 200,
                  background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 10,
                  boxShadow: "0 6px 18px rgba(43,36,24,0.15)", padding: 6,
                }}
              >
                <div style={{ padding: "8px 10px 10px", borderBottom: `1px solid ${COLORS.line}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink }}>{user.displayName}</div>
                  <div style={{ fontSize: 10.5, color: COLORS.inkSoft }}>{user.role === "provinsi" ? "Admin Provinsi" : `Admin ${shortName(user.kabupatenName)}`}</div>
                </div>
                {[
                  { label: "Ubah Password", icon: KeyRound, onClick: () => { setShowChangePassword(true); setShowAvatarMenu(false); } },
                  { label: "Bantuan", icon: HelpCircle, onClick: () => { setShowHelp(true); setShowAvatarMenu(false); } },
                  { label: "Keluar", icon: LogOut, onClick: () => { setUser(null); setShowAvatarMenu(false); } },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", borderRadius: 7,
                      background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: COLORS.ink, textAlign: "left",
                    }}
                  >
                    <item.icon size={15} color={COLORS.inkSoft} /> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Body: sidebar (bisa disembunyikan) + konten */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {mobileSidebarOpen && (
          <div
            onClick={() => setSidebarCollapsed(true)}
            style={{ position: "fixed", top: HEADER_H, left: 0, right: 0, bottom: 0, background: "rgba(43,36,24,0.45)", zIndex: 40 }}
          />
        )}

        {!sidebarCollapsed && (
          <aside
            style={
              isMobile
                ? {
                    width: 230, background: COLORS.card, borderRight: `1px solid ${COLORS.line}`,
                    position: "fixed", top: HEADER_H, left: 0, height: `calc(100vh - ${HEADER_H}px)`,
                    zIndex: 50, boxShadow: "2px 0 12px rgba(43,36,24,0.18)", overflowY: "auto",
                  }
                : {
                    width: 220, flexShrink: 0, background: COLORS.card, borderRight: `1px solid ${COLORS.line}`,
                    position: "sticky", top: HEADER_H, height: `calc(100vh - ${HEADER_H}px)`, overflowY: "auto",
                  }
            }
          >
            <nav style={{ display: "flex", flexDirection: "column", gap: 3, padding: "12px 8px" }}>
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setTab(item.key); if (isMobile) setSidebarCollapsed(true); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 500, width: "100%",
                    background: tab === item.key ? COLORS.teal : "transparent",
                    color: tab === item.key ? "#fff" : COLORS.inkSoft,
                  }}
                >
                  <item.icon size={17} strokeWidth={2} />
                  <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 16px" }}>
            {dataLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.inkSoft, fontSize: 12.5, marginBottom: 14 }}>
                <Loader2 className="spin" size={14} /> Memuat data laporan…
              </div>
            )}
            {backendError && (
              <div style={{ background: COLORS.claySoft, color: "#7a2e14", borderRadius: 9, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>
                Gagal terhubung ke Google Sheets: {backendError}. Periksa kembali APPS_SCRIPT_URL dan pengaturan akses deployment ("Anyone").
              </div>
            )}
            {tab === "dashboard" && <Dashboard user={user} records={records} targets={targets} />}
            {tab === "input" && <InputForm user={user} onSubmit={addRecord} records={records} onUpdate={updateRecord} onDelete={deleteRecord} />}
            {tab === "tabulasi" && <Tabulasi records={records} targets={targets} onUpdateRecord={updateRecord} onDeleteRecord={deleteRecord} />}
            {tab === "target" && user.role === "provinsi" && <TargetManager targets={targets} onAdd={addTarget} onUpdate={updateTarget} onDelete={deleteTarget} />}
            {tab === "akun" && user.role === "provinsi" && <KelolaAkun users={users} onResetPassword={resetKabupatenPassword} />}
          </main>
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal user={user} onClose={() => setShowChangePassword(false)} onSubmit={changePassword} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function FontImports() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      input:focus, select:focus, button:focus { outline: 2px solid ${COLORS.teal}; outline-offset: 1px; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (max-width: 860px) {
        .grid2 { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}
