# 📋 Dokumen Rancangan Arsitektur PPNU Absensi v2.0

Sistem Presensi Modular, Portal 3 Pintu & Model Hybrid.

Dokumen ini adalah cetak biru (*blueprint*) resmi rancangan sistem absensi pesantren generasi kedua (v2.0) yang disepakati bersama Mandor.

---

## 🎯 1. Latar Belakang & Masalah Versi 1.0 yang Diselesaikan

| Masalah di Versi 1.0 (`web absen/`) | Solusi Nyata di Versi 2.0 (`web-absen-v2/`) |
| :--- | :--- |
| **File Monolitik 7.059 Baris:** Kode bertumpuk, sulit diperbaiki, koreksi bug butuh waktu lama. | **Arsitektur Modular:** Dipecah menjadi beberapa file kecil dan bersih (masing-masing hanya 100–300 baris). |
| **Beban Layar HP Berat:** Me-render 300+ santri sekaligus ke dalam satu tabel (>50.000 sel DOM) bikin HP lag. | **Pecah per Kelas:** Browser HP hanya me-render 25–35 santri per tampilan. Performa 10x lebih ringan dan instan! |
| **Absen Kelas Masih Kaku:** Ustadz di kelas madrasah tidak bisa mengoreksi santri yang hadir di kelas tapi tidak scan mesin. | **Sistem Presensi Hybrid:** Menggabungkan validasi manual ustadz dengan otomasi mesin fingerprint. |
| **Kekhawatiran Casing Kosong:** Trauma v2 lama yang bannernya mewah tapi fungsinya kopong. | **Prinsip Anti-Casing Kosong:** Setiap tombol dan komponen visual wajib terhubung 100% ke data nyata sebelum rilis. |

---

## 🏛️ 2. Konsep Utama: Sistem Privat 4 Peran Internal (Tanpa Akses Wali)

Sistem dirancang tertutup 100% untuk lingkungan internal pondok pesantren (menghapus portal publik/wali santri demi menjaga privasi ketertiban pondok dan kesederhanaan sistem):

### 🚪 Peran 1: Portal Santri (`santri.html` - Model Dua Pilihan)

* **Pengguna:** Santri pondok (Cek mandiri internal mading digital / HP santri, *view-only* tanpa cetak PDF).
* **Akses:** Bebas tanpa password (ringan dan langsung pakai).
* **Model Dua Pilihan (Hybrid):**
  1. **Mode Tabel Kelas (Mading Digital):** Santri cukup memilih kelasnya (misal: *1 Ulya (1UA)*) ➔ Langsung muncul tabel ringkas 24 teman sekelasnya dengan total `Hadir`, `Izin`, dan `Alpha`. Cepat dan tidak perlu mengingat nomor PIN.
  2. **Mode Kartu Rincian Pribadi:** Ada kolom pencarian cepat di atas (ketik PIN atau nama), atau santri cukup menyentuh/klik baris namanya di tabel ➔ Terbuka kartu rincian kehadiran pribadi (riwayat tanggal, jam tap mesin, dan kalkulasi batas aman alpha).
  3. **Logika Toleransi Maksimal 15% Alpha & Pemulihan:**
     * Jika alpa $\le 15\%$: Muncul ucapan selamat & apresiasi (*congratulate them*) untuk istiqomah ngaji.
     * Jika alpa $> 15\%$: Sistem menghitung secara otomatis: *"Butuh hadir [N] jam pelajaran lagi berturut-turut tanpa alpa agar kehadiranmu kembali aman!"*.
  4. **Kerahasiaan Status:** Keterangan internal pondok (Mukim, Laju, Kantin, Bebas Asrama) tetap 100% dirahasiakan dan tidak ditampilkan ke santri.

### 🚪 Peran 2: Portal Ustadz (`ustadz.html`)

* **Pengguna:** Ustadz pengampu kelas MDNU dan Ustadz Pengajian Asrama.
* **Akses:** Login praktis satu kata sandi bersama asatidz (ramah ustadz sepuh, tanpa akun individu yang membingungkan).
* **Gembok Absen di Kelas:** Hanya bisa dibuka dan disimpan selama jam pelajaran sedang berlangsung. Begitu sesi lewat cutoff, portal terkunci otomatis.
* **Alur Presensi:**
  1. Menyesuaikan jam aktif otomatis (Subuh: Asrama Subuh, Sore: Kelas Sore, Malam: 5 Kelas MDNU / Asrama Malam).
  2. Data awal sudah terisi otomatis dari tap mesin fingerprint (yang sudah tap = hijau).
  3. Ustadz bertindak sebagai Hakim Tertinggi untuk kroscek fisik:
     * Santri hadir tapi belum tap di mesin ➔ Tap ubah jadi `H (Hadir)`.
     * Santri tap jempol tapi bolos dari kelas ➔ Tap ubah jadi `A (Bolos)` atau `T (Takzir)`.
  4. Ustadz menekan tombol **[Simpan Absen]** ➔ Sesi terkunci resmi.

### 🚪 Peran 3: Portal Pengurus Keamanan (`pengurus.html`)

* **Pengguna:** Pengurus Keamanan & Ketertiban Pondok.
* **Wewenang Harian:**
  * **Deteksi Otomatis Santri Nakal:** Sistem otomatis menandai santri yang memiliki jam tap di mesin fingerprint tapi diubah menjadi `A` atau `T` oleh Ustadz di kelas, dan memasukkannya ke daftar penindakan keamanan (titip absen/bolos).
  * **Buku Takziran (`T`):** Rekap penindakan santri takzir.
  * **Radar Kamar (Subuh & Malam):** Memantau santri mukim yang belum tap mesin saat Subuh/Malam agar disusul dan dibangunkan dari kamar.
  * **Meja Sidang Tanggal 1:** Ruang sidang klarifikasi alpa bulanan santri sebelum eksekusi takzir pondok.

### 🚪 Peran 4: Portal Superadmin (`admin.html`)

* **Pengguna:** Lurah Pondok & Pengurus IT.
* **Akses:** Login kata sandi tingkat tinggi (Superadmin Cloud).
* **Wewenang:**
  * Melihat master spreadsheet seluruh kelas dan asrama secara menyeluruh.
  * Memantau kesehatan aliran data push server ADMS VPS port 5005 & Bot WhatsApp port 5006.
  * Kelola status santri khusus (Mukim, Laju, Kantin, Boyong).
  * Fitur reset data & penanganan hari libur khusus pondok (Haul, Maulid, Imtihan).

---

## ⚡ 3. Logika Presensi Hybrid ("Tidak Mengabsen pun Sudah Terabsen")

Sistem menggunakan model *dual-layer failsafe* agar data kehadiran tidak pernah kosong dan tidak membebani manusia:

```text
Alur Logika Sesi Presensi:
┌─────────────────────────────────────────────────────────────┐
│ Sesi Dimulai (Contoh: Pelajaran 1 jam 18:30 WIB)           │
│ Data live ditarik otomatis dari scan mesin fingerprint.    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Apakah Ustadz Mengabsen?
               /                        \
        [YA, Ustadz Hadir]        [TIDAK / Ustadz Lupa / Pengajian Asrama]
               │                                │
 Ustadz memeriksa kelas & klik         Jam cutoff sesi habis
      tombol [Simpan Absen]             (Pukul 19:40 / 06:30 / 23:00 WIB)
               │                                │
               ▼                                ▼
     Status: "FIX_USTADZ"             Status: "AUTO_CUTOFF"
(Centang ustadz mengunci data,    (Sistem otomatis mengeksekusi vonis
 log mesin tercatat transparan)     berdasarkan tap mesin fingerprint)
```

* **Prinsip Utama:** Jika Ustadz berhalangan, lupa, atau tidak sempat membuka HP, **absensi sudah sah dan selesai 100% secara otomatis**. Tidak akan pernah ada data yang macet atau kosong.
* **Jendela Koreksi Ustadz:** Ustadz diberikan hak mengedit ulang absensi selama jam pelajaran tersebut masih berlangsung (mencegah panik salah pencet).
* **Hak Veto Superadmin:** Superadmin memiliki wewenang membuka kunci (*unlock*) jika ada dispensasi izin susulan dari keamanan.

---

## 📁 4. Cetak Biru Struktur Folder & File Modular

Folder proyek baru diletakkan di `web-absen-v2/` terpisah total dari folder lama (`web absen/`):

```text
web-absen-v2/
│
├── RANCANGAN_V2.md          # Dokumen blueprint ini
│
├── index.html               # Halaman Landing & Pintu Gerbang [~100 baris]
├── santri.html              # Portal Santri: Cek Alpha Mandiri [~200 baris]
├── ustadz.html              # Portal Ustadz: Presensi per Kelas [~300 baris]
├── admin.html               # Portal Superadmin: Master Data [~400 baris]
│
├── css/
│   ├── layout.css           # Grid, kontainer mobile, spreadsheet hardware-accelerated
│   └── components.css       # Tombol, badge status (H/I/A), form select ramah jempol
│
└── js/
    ├── config.js            # Inisialisasi Firebase Cloud
    ├── session-rules.js     # Logika jam cutoff (Subuh, Sore, Pel 1-3, Malam)
    ├── hybrid-engine.js     # Logika sinkronisasi Mesin vs Ustadz
    ├── santri-store.js      # Filter santri (Mukim, Laju, Kantin, Boyong)
    └── auth.js              # Manajemen sesi login Ustadz & Superadmin
```

---

## 🛡️ 5. Garansi Integritas Data & Keamanan

1. **Database Tetap Sama:** Menggunakan Firebase Realtime Database aktif yang sama, sehingga aliran data mesin VPS tetap masuk tanpa perlu setting ulang mesin fisik.
2. **Kandang Lama Aman:** Folder `web absen/` tetap aktif 100% melayani absensi pondok harian sampai Versi 2.0 ini terbukti selesai diuji coba dan disetujui Mandor.
3. **Pre-Flight Mobile Check:** Seluruh komponen visual di `web-absen-v2/` wajib diuji mandiri pada layar HP sebelum dilaporkan ke Mandor.
