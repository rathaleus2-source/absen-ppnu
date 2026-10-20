# 🏛️ PPNU Absensi System - Deep Audit Registry & Source of Truth

> **Tujuan Dokumen:**
>
> Dokumen ini adalah hasil **Deep Audit menyeluruh** pada seluruh ekosistem presensi PPNU:
>
> 1. Web Client Monolitik (`web absen/index.html` - 7.859 baris)
> 2. Server ADMS & Push Engine (`.agents/scripts/server_adms_vps.py` - Port 5005)
> 3. Cloud Database Firebase (Schema & Realtime Structure)
> 4. Sistem Perizinan Google Form Keamanan (`sync_izin_keamanan.py`)
> 5. Bot WhatsApp Pengurus (`.agents/bot-wa/bot.js` - Port 5006)
>
> Seluruh aturan hukum, struktur data, dan edge-case yang dicatat di sini adalah **acuan wajib (Single Source of Truth)** dalam membangun **PPNU Absensi v2.0** yang bersih, modular, dan zero-regression.

---

## 🗄️ 1. Skema & Struktur Cloud Database (Firebase Realtime Database)

**Firebase Base URL:**  
`https://absen-4aefe-default-rtdb.asia-southeast1.firebasedatabase.app/absensi_ppnu`

Seluruh simpul (node) data tersimpan di bawah root path `/absensi_ppnu`:

| Path Node | Tipe Data | Deskripsi & Format | Dipakai Oleh |
| :--- | :--- | :--- | :--- |
| `asramaMatrix` | `Object` | Matrix kehadiran Asrama Putra.<br>`{ [pin]: { [YYYY-MM-DD]: { subuh: 'H' / 'I' / 'A' / 'T' / 'LIBUR' / '-', malam: '...', subuh_time: '05:43', malam_time: '19:12' } } }` | Web, VPS, Bot, Sync Izin |
| `mdnuMatrix` | `Object` | Matrix kehadiran Madrasah Diniyah (MDNU).<br>`{ [pin]: { [YYYY-MM-DD]: { sore: '...', pel1: '...', pel2: '...', pel3: '...', sore_time: '...', pel1_time: '...', pel2_time: '...', pel3_time: '...' } } }` | Web, VPS, Bot, Sync Izin |
| `santriList` | `Array` | Master roster santri aktif.<br>`[ { pin: '1UA01', nama: 'Ahmad ...', kelas: '1UA' } ]` | Web, VPS, Bot, Sync Izin |
| `dateList` | `Array` | Daftar seluruh tanggal yang terdaftar di kalender.<br>`[ { dayIndex, namaHari, displayDate: 'YYYY-MM-DD', timestamp, year, month, monthKey, namaBulan, monthLabel } ]` | Web, VPS, Bot |
| `availableMonths` | `Array` | Daftar bulan aktif untuk navigasi tab bulan.<br>`[ { key: '2026-10', label: 'Oktober 2026', dates: [...] } ]` | Web, VPS |
| `statusSantriAsrama` | `Object` | Status mukim santri di Asrama: `mukim`, `laju`, `boyong`, `kantin`.<br>`{ [pin]: 'laju' }` | Web, Sync Izin, Bot |
| `statusSantriMDNU` | `Object` | Status santri di MDNU: `mukim`, `boyong`. *(Santri Laju/Kantin tetap wajib di MDNU)* | Web, Sync Izin, Bot |
| `hiddenSantriAsrama` | `Object` | Flag santri yang disembunyikan dari tabel Asrama.<br>`{ [pin]: true }` *(Otomatis dihitung dari statusSantriAsrama + tglMulaiLajuSantri)* | Web, Sync Izin, Bot |
| `hiddenSantriMDNU` | `Object` | Flag santri yang disembunyikan dari tabel MDNU.<br>`{ [pin]: true }` *(Khusus santri Boyong)* | Web, Sync Izin, Bot |
| `tglMulaiLajuSantri` | `Object` | Tanggal efektif santri mulai laju di tengah semester.<br>`{ [pin]: 'YYYY-MM-DD' }` | Web, Sync Izin, Bot |
| `tanggalMulaiSantri` | `Object` | Tanggal perdana santri baru mulai mondok.<br>`{ [pin]: 'YYYY-MM-DD' }` | Web, VPS, Bot |
| `dispensasiSantri` | `Object` | Dispensasi KKN / Tugas Luar Pondok (Status `'K'`).<br>`{ [pin]: [ { id, dari: 'YYYY-MM-DD', sampai: 'YYYY-MM-DD', ket } ] }` | Web, Bot |
| `settingMalamSabtuPerTanggal` | `Object` | Pilihan jam MDNU yang dipinjam Asrama pada Malam Sabtu.<br>`{ 'YYYY-MM-DD': 'pel1' / 'pel2' / 'pel3' }` *(Default: 'pel1')* | Web, VPS, Sync Izin, Bot |
| `specialLiburAsrama` | `Object` | Hari libur khusus asrama (dikosongkan/diputihkan).<br>`{ 'YYYY-MM-DD': true }` | Web, VPS, Sync Izin, Bot |
| `specialLiburMDNU` | `Object` | Hari libur khusus MDNU.<br>`{ 'YYYY-MM-DD': true }` | Web, VPS, Sync Izin, Bot |
| `penangguhanSantri` | `Object` | Catatan santri takziran (scan finger tapi tidak ngaji -> Status `'T'`).<br>`{ "${tgl}__${pin}__${sesi}": { key, pin, nama, kelas, tanggal, tab, sesi, scan_time, alasan, status: 'DITANGGUHKAN', timestamp, waktu_tangguh } }` | VPS, Web |
| `permissionDetailsMap` | `Object` | Rincian surat izin dari Google Form Keamanan.<br>`{ "${pin}__${tgl}__${sesi}__${tab}": { alasan, pemberiIzin, noIzin, durasi } }` | Web, Sync Izin, Bot |
| `manualCellOverrides` | `Object` | Override manual admin per cell.<br>`{ "${pin}__${tgl}__${sesi}__${tab}": 'H' / 'I' / 'A' / 'T' / 'K' / 'LIBUR' / '-' }` | Web, Bot |
| `rawScans` | `Object` | Log mentah semua scan mesin per tanggal & per PIN.<br>`{ [tgl]: { [pin]: { [scan_key]: { time, matched: [...] } } } }` | VPS |
| `frozenUntilDate` | `String` | Tanggal gembok permanen data historis: `'2026-09-30'`. | Web, VPS, Sync Izin |
| `adminPassword` | `String` | Hash / teks kata sandi Admin terenkripsi cloud. | Web |
| `dataSantriInduk` | `Array` | Data master santri lengkap (termasuk kontak/wali/alamat). | Web |
| `hideEmptyLiburColumns` | `Boolean` | Preferensi sembunyikan kolom tanggal yang 100% libur. | Web |
| `meta` | `Object` | Metadata sinkronisasi: `lastUpdated`, `lastSantriSync`, `lastIzinSync`, `lastIzinCount`. | Web, VPS, Sync Izin |

---

## 🖧 2. Arsitektur Jembatan VPS & ADMS (`server_adms_vps.py`)

- **Port VPS:** `5005` (Protokol HTTP ADMS + JSON REST API)
- **Mesin Fingerprint Resmi (Whitelist SN):**
  1. `C2696422DF192430` ➔ Mesin 1 (Asrama Putra)
  2. `C2636CF4DB271E34` ➔ Mesin 2 (MDNU Putra)
- **PIN Khusus Admin:** `{'AAA', 'MDNU', 'P2MBS'}` (Otomatis difilter dari log dan absensi)
- **Batas Payload Proteksi RAM:** Maksimal 5 MB per payload (`MAX_PAYLOAD_SIZE = 5 * 1024 * 1024`).
- **Penyimpanan Lokal VPS:** Cache data sidik jari/user di `/root/machine_users_{dev_sn}.json`.

### Alur Kerja Scan Masuk (Push Real-Time)

1. **Penerimaan Raw Data:** Mesin Fingerspot Revo mengirim POST ke `/iclock/cdata`.
2. **Pengecekan Gembok:** Jika tanggal scan $\le$ `FROZEN_UNTIL_DATE` (`2026-09-30`), **abaikan dan jangan sentuh Firebase!**
3. **Pencocokan Sesi (`tentukan_sesi_ppnu`):** Menghitung menit harian santri untuk mencocokkan apakah scan masuk di Subuh, Sore, Pel 1, Pel 2, Pel 3, atau Malam.
4. **Logika Earliest Scan (Scan Terawal):** Jika santri scan berkali-kali dalam 1 sesi, ambil jam scan yang paling awal (`existing_time <= time_val ? existing_time : time_val`).
5. **Cek Penangguhan (Takziran):** Jika santri terdaftar di `penangguhanSantri` untuk sesi tersebut, jam scan tetap dicatat di `${sesi}_time`, namun status tetap di-hold sebagai **`T`** (Ditangguhkan).
6. **Eksekusi Batch Atomik:** VPS mengumpulkan seluruh scan dalam 1 dictionary update, lalu mengirim `PATCH` ke Firebase secara atomik dalam **1 request HTTP tunggal** (menghemat kuota Firebase dan mencegah throttling).
7. **Pendaftaran Tanggal Baru Otomatis:** Jika mesin mengirim tanggal baru yang belum ada di `dateList`, VPS otomatis mendaftarkan tanggal tersebut ke `dateList` dan me-rebuild `availableMonths`.

### Daftar Endpoint VPS

| Method | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `GET` | `/iclock/cdata` | Handshake protokol ADMS Fingerspot. |
| `GET` | `/iclock/getrequest` | Heartbeat & penarikan antrean perintah mesin. |
| `POST` | `/iclock/cdata` | Penerimaan raw scan log dan push atomik ke Firebase. |
| `GET` | `/api/devices` | Monitoring status koneksi 2 mesin fingerprint. |
| `GET` | `/api/users` | Mengambil data biometrik & nama user dari mesin. |
| `POST` | `/api/save_user` | Mendaftarkan/mengupdate nama & privilege santri ke mesin. |
| `POST` | `/api/delete_user` | Menghapus santri dari memori mesin. |
| `POST` | `/api/sync_time` | Menyamakan jam mesin dengan jam server VPS (WIB). |
| `POST` | `/api/suspend` | Mengelola status takziran (`suspend` -> `T`, `release` -> `H`, `cancel` -> `A`). |
| `GET` | `/api/live_scans` | Ticker 50 scan real-time terakhir. |
| `GET` | `/manager` | GUI Web Manager VPS (`manager.html`). |

---

## 📝 3. Sistem Sinkronisasi Perizinan Keamanan (`sync_izin_keamanan.py`)

- **Sumber Data:** Google Spreadsheet CSV Export Form Perizinan Keamanan Pondok  
  `https://docs.google.com/spreadsheets/d/1720e8LpBYtopySA85FW0wOJTTrI5sx4I9l1EAbBg7BM/export?format=csv&gid=729863469`
- **Pencocokan Nama Santri (Fuzzy Matching):**
  - Stopwords removal: `muhammad`, `ahmad`, `abdul`, `al`, dll.
  - Normalisasi fonetik: `kh -> h`, `oe -> u`, `dh -> d`, `y -> i`.
  - Token Sequence Matching dengan threshold $\ge 88\%$.
- **Perhitungan Rentang Izin:**
  - Parsing tanggal awal, akhir, dan durasi ("1 hari", "3 hari", "1 minggu", dsb).
- **Hukum Cerdas Izin Sore + Malam + Subuh:**
  - Jika santri izin untuk *Sore + Malam (Pel 1, 2, 3) + Subuh (Pagi)*:
    - Santri baru pulang ke rumah pada sore hari, sehingga **Subuh hari pertama masih di pondok** (wajib Subuh).
    - Izin Subuh otomatis dialokasikan untuk **BESOK PAGI** setelah izin malam berakhir (`next_dt = e_dt + 1 hari`).
- **Prinsip Precedence (Hadir Fisik > Izin):**
  - Jika santri memiliki surat izin (`I`), tetapi di mesin tercatat ada jam scan fisik (hadir), status **WAJIB TETAP HADIR (`H`)**! Kehadiran fisik mengalahkan surat izin.
- **Pencatatan Rincian:**
  - Disimpan ke `permissionDetailsMap` dengan key `${pin}__${iso_tgl}__${sesi}__${tab}` berisi `{ alasan, pemberiIzin, noIzin, durasi }`. Saat pengurus klik badge 'I' di tabel, popup rincian ini muncul.

---

## 🤖 4. Bot WhatsApp Pengurus (`.agents/bot-wa/bot.js`)

- **Port QR Pairing Web:** `5006`
- **Cache Database:** Membaca snapshot Firebase dengan cache 15 detik (`CACHE_TTL_MS = 15000`).
- **Engine Evaluasi:** Menggunakan logika evaluasi yang identik 100% dengan Web (`getAsramaCell`, `getMDNUCell`, `isSesiBelumLewatBatas`).
- **Daftar Perintah:**
  - `1 <PIN>` atau langsung ketik `<PIN>` (misal `1UA01`): Menampilkan kartu profil santri, histori 3 hari terakhir, rekap H/I/A, dan persentase Alpha.
  - `2` atau `rekap`: Rekapitulasi kehadiran pondok hari ini (Subuh, Sore, MDNU, Malam).
  - `3` atau `alpha`: Daftar santri yang terkena Alpha hari ini (bisa filter per kelas, contoh `3 1UA`).
  - `4` atau `izin`: Daftar santri yang berstatus izin hari ini beserta alasannya.
  - `5` atau `bahaya`: Menampilkan daftar santri di "Zona Merah" ($\text{Alpha} \ge 15\%$).
  - `6` atau `audit`: Headcount santri aktif, laju, boyong, dan sinkronisasi mesin.
  - `7` atau `web`: Memberikan link web absensi.

---

## ⚖️ 5. Matriks Aturan Sesi, Cutoff & Status Santri (Single Source of Truth)

### Jam Sesi & Batas Cutoff (WIB)

| Kategori | Sesi | Jam Mulai - Selesai | Batas Cutoff (Vonis A) | Aturan Hari & Pengecualian |
| :--- | :--- | :--- | :--- | :--- |
| **Asrama** | **Subuh** | `05:00 - 06:30` | **06:30:00 WIB** | Libur Jumat & Minggu. |
| **MDNU** | **Sore** | `15:00 - 18:00` | **18:00:00 WIB** | Sabtu & Minggu khusus **1UA**.<br>Kamis khusus **2WA**.<br>Hari lain libur total. |
| **MDNU** | **Pel 1** | `18:30 - 19:40` | **19:40:00 WIB** | Kamis libur total (Malam Jumat).<br>Jumat malam: libur jika dipinjam Asrama (`settingMalamSabtu == 'pel1'`). |
| **MDNU** | **Pel 2** | `19:40 - 21:00` | **21:00:00 WIB** | Kamis libur total.<br>Jumat malam: libur jika dipinjam Asrama (`settingMalamSabtu == 'pel2'`). |
| **MDNU** | **Pel 3** | `21:00 - 22:30` | **22:30:00 WIB** | Kamis libur total.<br>Jumat malam: libur jika dipinjam Asrama (`settingMalamSabtu == 'pel3'`). |
| **Asrama** | **Malam** | Bervariasi | Bervariasi | **Kamis (Malam Jumat):** `18:30 - 23:00` ➔ Cutoff **23:00 WIB**.<br>**Jumat (Malam Sabtu):** Mengikuti jam sesi MDNU yang dipinjam:<br>• Jika `pel1`: Cutoff **19:40 WIB**<br>• Jika `pel2`: Cutoff **21:00 WIB**<br>• Jika `pel3`: Cutoff **22:30 WIB**<br>**Minggu Malam (khusus 1UA):** `21:00 - 22:30` ➔ Cutoff **22:30 WIB**. |

### Urutan Hirarki Evaluasi Cell (Precedence Order)

Saat mengevaluasi status sebuah kotak presensi santri pada tanggal `tgl` dan sesi `s`:

1. **Gembok Masa Depan / Jam Berjalan:** Jika sesi belum berakhir / belum lewat cutoff, vonis **DILARANG `A`**! Status harus netral (`-` atau `BELUM_MULAI`).
2. **Santri Belum Mulai Mondok:** Jika `tgl < tanggalMulaiSantri[pin]` dan tidak ada scan, status = `BELUM` (`-`).
3. **Santri Laju / Kantin di Asrama:** Jika santri laju/kantin dan `tgl >= tglMulaiLajuSantri[pin]`, sesi Asrama dinonaktifkan (bebas Alpha, status `LAJU`).
4. **Libur Khusus Admin:** Jika tanggal terdaftar di `specialLibur`, status = `LIBUR`.
5. **Override Manual Admin:** Jika ada di `manualCellOverrides`, gunakan nilai override tersebut.
6. **Nilai Eksplisit Database:** Jika di matrix sudah tersimpan nilai (`H`, `I`, `A`, `T`, `LIBUR`), gunakan nilai tersebut.
7. **Surat Izin Resmi:** Jika ada rekaman di `permissionDetailsMap`, status = **`I`**.
8. **Dispensasi Khusus (KKN / Tugas Luar):** Jika tanggal masuk rentang `dispensasiSantri`, status = **`K`**.
9. **Jadwal Rutin Libur:** Jika jadwal memang libur (misal Subuh Jumat), status = `LIBUR`.
10. **Scan Fisik Mesin:** Jika ada rekaman `${sesi}_time`, status = **`H`** (Hadir fisik mengalahkan izin).
11. **Lewat Cutoff tanpa Hadir/Izin:** Status = **`A`** (Alpha sah).

---

## 🎯 6. Peta Modul untuk PPNU Absensi v2.0

Agar tidak kembali mengulang bencana monolitik 7.800 baris, arsitektur v2.0 wajib dibagi menjadi komponen-komponen mandiri:

```text
web-absen-v2/
├── RANCANGAN_V2.md                   # Blueprint arsitektur v2.0
├── ATURAN_HUKUM_PRESENSI.md          # Dokumen ringkas hukum presensi
├── DEEP_AUDIT_SYSTEM_REGISTRY.md     # Single Source of Truth lengkap (Dokumen ini)
│
├── santri.html                       # Portal 1: Khusus Santri/Wali (Cek mandiri per PIN)
├── ustadz.html                       # Portal 2: Khusus Ustadz (Presensi manual per kelas & checklist)
├── admin.html                        # Portal 3: Khusus Pengurus/Admin (Spreadsheet induk, master data)
│
├── css/
│   └── app.css                       # Desain Tailwind + custom table hardware accelerated
│
└── js/
    ├── config.js                     # Firebase config & endpoint VPS
    ├── session-rules.js              # Unit-tested Engine Aturan Sesi & Cutoff
    ├── storage-adapter.js            # Dual storage bridge (Firebase RTDB + LocalStorage)
    ├── permissions-sync.js           # Client-side sync Google Form izin keamanan
    ├── ui-table.js                   # Spreadsheet renderer dengan sticky col & auto-hide libur
    ├── modal-manager.js              # Dialogs (Laju, Boyong, Kantin, Dispensasi, Libur, Sandi)
    └── auth.js                       # Role management (Santri, Ustadz, Superadmin)
```

---

## 🛡️ 7. Resolusi 7 Bentrokan Kritis Sistem & Garis Batas Keamanan

Berdasarkan audit forensik mendalam kedua terhadap database riil Firebase (`temp_fb_data.json`), alur VPS, dan kelemahan web lama, berikut adalah 7 bentrokan kritis yang **wajib dicegah dan dipatuhi oleh seluruh modul v2.0**:

### 1. Multi-Path Atomic Update (Anti-Stomping Race Condition)

- **Potensi Bentrok:** Di web lama, setiap kali 1 sel diubah, sistem mengirim *seluruh* matriks (`asramaMatrix` dan `mdnuMatrix`) via `fbDb.ref('absensi_ppnu').update(payload)`. Jika Ustadz `1UA` dan Ustadz `2WA` menyimpan absen di menit yang sama, data salah satu ustadz (atau log scan VPS) akan tertimpa dan hilang.
- **Resolusi v2.0:** DILARANG KERAS mengirim seluruh matriks sekaligus. Seluruh penulisan absen WAJIB menggunakan format **Multi-Path Atomic Update**, contoh:

  ```javascript
  const updates = {};
  updates[`absensi_ppnu/mdnuMatrix/${pin}/${dateISO}/${sessionKey}`] = status;
  updates[`absensi_ppnu/mdnuMatrix/${pin}/${dateISO}/${sessionKey}_time`] = timeVal;
  updates[`absensi_ppnu/manualCellOverrides/${pin}__${dateISO}__${sessionKey}__mdnu`] = status;
  updates[`absensi_ppnu/meta/lastUpdated`] = new Date().toISOString();
  fbDb.ref().update(updates);
  ```

  Dengan cara ini, Ustadz kelas A hanya mengubah node kelas A, tidak akan pernah menyenggol kelas B atau mesin VPS.

### 2. Gembok Masa Lalu pada Fitur Hapus/Reset (Proteksi Data Historis)

- **Potensi Bentrok:** Pada kode web lama baris 4806, fungsi `konfirmasiHapusTanggal()` dan `konfirmasiHapusBulan()` tidak memvalidasi `frozenUntilDate`. Admin yang salah pilih tanggal di bulan Juli/Agustus/September bisa menghapus data lampau pondok secara permanen.
- **Resolusi v2.0:** Seluruh fungsi hapus (per tanggal, per bulan, dan reset) WAJIB memiliki proteksi gembok mutlak:

  ```javascript
  if (dateISO <= PPNURules.FROZEN_UNTIL_DATE) {
    throw new Error(`Tanggal ${dateISO} terkunci mutlak (Data Historis) dan tidak boleh dihapus!`);
  }
  ```

  Opsi tanggal $\le$ `2026-09-30` pada dropdown dialog hapus wajib otomatis di-disable atau disembunyikan.

### 3. Evaluasi Reaktif Izin Resmi Google Form (Anti-Stale Matrix)

- **Potensi Bentrok:** Di web lama baris 2580, jika database sudah terisi status `'A'`, izin baru dari Google Form tidak akan muncul di layar sampai admin menekan tombol "Tarik Izin" yang menimpa ulang database.
- **Resolusi v2.0:** Evaluasi di `session-rules.js` bersifat *reactive*: jika santri memiliki surat izin resmi aktif di `permissionDetailsMap` dan tidak ada scan fisik, sistem langsung merender status **`I` (Izin)** secara otomatis tanpa perlu batch write ulang ke database.

### 4. Standarisasi Format Tanggal ISO `YYYY-MM-DD`

- **Potensi Bentrok:** Adanya dualisme format `DD/MM/YYYY` dan `YYYY-MM-DD` pada beberapa fungsi pencarian tanggal di web lama yang menyebabkan `undefined` saat mencocokkan key.
- **Resolusi v2.0:** Berdasarkan audit database riil Firebase, seluruh key di `asramaMatrix`, `mdnuMatrix`, `dateList`, `permissionDetailsMap`, dan `rawScans` sudah paten menggunakan format **`YYYY-MM-DD`**. Format `YYYY-MM-DD` ditetapkan sebagai **standar tunggal mutlak** di seluruh kode v2.0.

### 5. Sharding Cache Per Kelas (Anti-QuotaExceededError LocalStorage 5MB)

- **Potensi Bentrok:** Web lama menyimpan 2,3 MB JSON monolitik ke `localStorage` HP. Menjelang akhir semester, ukuran data menembus batas kuota 5 MB browser HP dan memicu crash.
- **Resolusi v2.0:** Master santri berjumlah 94 santri dibagi ke dalam 5 kelas (`2UA`: 13 santri, `1UA`: 24 santri, `2WA`: 18 santri, `1WA`: 26 santri, `2AA`: 13 santri). Setiap kelas hanya berbobot ~50 KB – 80 KB saat di-cache lokal. Aman seumur hidup di browser HP mana pun.

### 6. Sanitasi Wajib PIN Huruf Besar (`.toUpperCase().trim()`)

- **Potensi Bentrok:** Firebase Realtime Database membedakan huruf besar dan kecil (*case-sensitive*). Jika ustadz/bot/mesin menulis `1ua01` dan database membaca `1UA01`, data akan terpecah menjadi dua entitas berbeda.
- **Resolusi v2.0:** Seluruh modul input dan query WAJIB melakukan normalisasi:

  ```javascript
  const cleanPin = String(pin || '').toUpperCase().trim();
  ```

### 7. Kasta Tertinggi Verifikasi Ustadz di Kelas (Anti-Bolos Setelah Tap Finger)

- **Potensi Bentrok:** Santri tap jempol di mesin jam 18:35, lalu kabur keluar pondok dan tidak masuk kelas ngaji jam 18:45. Jika jam scan mesin selalu menang, ustadz tidak bisa memvonis santri tersebut.
- **Resolusi v2.0:** Verifikasi langsung Ustadz di kelas memegang hierarki lebih tinggi daripada mesin fingerprint. Jika ustadz mencentang **`A` (Alpha)** atau **`T` (Takziran)** pada sesi berjalan, status ustadz resmi menjadi penentu absensi akhir, dengan jam scan mesin tetap dicatat sebagai bukti audit waktu tap.

---

Dengan 7 resolusi bentrokan ini, arsitektur PPNU Absensi v2.0 telah memiliki benteng keamanan data yang kokoh (*bulletproof*) dan siap diimplementasikan!
