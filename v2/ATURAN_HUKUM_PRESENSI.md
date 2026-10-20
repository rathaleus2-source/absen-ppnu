# ⚖️ Buku Panduan Hukum & Aturan Presensi PPNU v2.0

Dokumen ini memuat seluruh aturan resmi presensi pesantren yang telah teruji di lapangan. Seluruh modul kode di `web-absen-v2/` wajib tunduk pada aturan di dokumen ini.

---

## ⏰ 1. Aturan Waktu & Jam Cutoff Resmi Sesi (WIB)

Presensi menggunakan pembagian sesi harian dengan batas waktu akhir (*cutoff*) yang ketat:

### A. Asrama Putra (2 Sesi)

1. **Subuh (`05:00 - 06:30 WIB`):**
   * Batas Cutoff: **Pukul 06:30:00 WIB**.
   * Hari Libur Rutin: **Jumat & Minggu** (otomatis strip `-` / libur).
2. **Malam (`18:30 - 23:00 WIB`):**
   * Batas Cutoff Rutin: **Pukul 23:00:00 WIB**.
   * Hari Aktif: Hanya aktif pada **Kamis malam (Malam Jumat)** dan **Jumat malam (Malam Sabtu)**. Hari lain otomatis kosong.
   * **Aturan Khusus Malam Sabtu (Jumat Malam):** Asrama meminjam salah satu jam pelajaran MDNU (default: `Pel 1`, atau disetel admin `Pel 2`/`Pel 3`). Cutoff Asrama Malam pada hari ini mengikuti sesi yang dipinjam (`Pel 1` = `19:40`, `Pel 2` = `21:00`, `Pel 3` = `22:30`).

### B. MDNU Putra / Madrasah Diniyyah (4 Sesi)

1. **Sore (`15:00 - 18:00 WIB`):**
   * Batas Cutoff: **Pukul 18:00:00 WIB**.
   * Jadwal Khusus:
     * Hari **Sabtu & Minggu**: Khusus kelas **1UA**.
     * Hari **Kamis**: Khusus kelas **2WA**.
2. **Pelajaran 1 (`18:30 - 19:40 WIB`):**
   * Batas Cutoff: **Pukul 19:40:00 WIB**. (Pukul 19:40:01 WIB otomatis masuk Pel 2).
   * Pada Malam Sabtu: Otomatis berstatus `LIBUR` jika sesi ini dipinjam oleh Asrama.
3. **Pelajaran 2 (`19:40 - 21:00 WIB`):**
   * Batas Cutoff: **Pukul 21:00:00 WIB**.
   * Pada Malam Sabtu: Otomatis `LIBUR` jika dipinjam oleh Asrama.
4. **Pelajaran 3 (`21:00 - 22:30 WIB`):**
   * Batas Cutoff: **Pukul 22:30:00 WIB**.
   * Pada Malam Sabtu: Otomatis `LIBUR` jika dipinjam oleh Asrama.

---

## 🚦 2. Logika Status Santri Live (Anti-Alpha Prematur)

Sistem wajib mematuhi 8 prinsip status santri:

1. **Sebelum Cutoff / Sesi Sedang Berjalan:**
   * Status WAJIB netral strip (`-`) atau `BELUM_MULAI`.
   * **DILARANG KERAS memvonis santri Alpha (`A`) sebelum jam batas akhir (*cutoff*) sesi bersangkutan habis.** Santri yang sedang antre wudhu atau di jalan tidak boleh dicap merah duluan.
2. **Hadir (Scan Terawal / Earliest Scan):**
   * Jika santri scan jempol lebih dari sekali dalam satu rentang sesi (misal jam 18:35 dan jam 19:15 pada Pel 1), yang dicatat dan ditampilkan WAJIB **jam scan pertama (`18:35`)**.
3. **Prioritas Hadir Fisik Mengalahkan Izin (`H` > `I`):**
   * Jika santri memiliki surat izin resmi, TETAPI ternyata di mesin fingerprint terekam scan Hadir (`H`), maka status santri **TETAP DIHITUNG HADIR (`H`)**, bukan Izin. Kehadiran fisik nyata mengalahkan dispensasi izin.
4. **Izin Keamanan (`I`):**
   * Otomatis berstatus `I` jika santri memiliki surat izin resmi dari pos keamanan (Google Form Keamanan) dan tidak melakukan scan hadir di mesin.
   * Metadata izin wajib memuat: Alasan Izin, Durasi Hari, Petugas Keamanan pemberi ACC, dan Nomor Surat Izin.
5. **Status Ditangguhkan / Takziran (`T`):**
   * Status khusus **`T`** diberikan kepada santri yang terbukti tap jempol di mesin fingerprint, namun tertangkap basah bolos/tidak mengikuti pengajian di kelas. Status ini mandiri sebagai catatan pelanggaran disiplin keamanan, bukan sekadar alpa biasa.
6. **Alpha (`A`):**
   * HANYA sah menjadi Alpha jika waktu saat ini (WIB) **sudah melewati jam cutoff** dan santri tidak memiliki rekaman Hadir maupun Izin.
7. **Gembok Absen Ustadz (Hanya di Kelas Saat Jam Berjalan):**
   * Hak mengabsen Ustadz **HANYA AKTIF di dalam kelas selama jam sesi pelajaran masih berlangsung**.
   * Begitu jam sesi berakhir (melewati jam cutoff), portal sesi kelas otomatis **TERKUNCI**. Ustadz dilarang mengabsen susulan dari kamar atau di luar jam ngaji demi menjaga keaslian data lapangan.
8. **Sidang Klarifikasi Alpha Bulanan (Setiap Tanggal 1):**
   * Santri yang terkena vonis Alpha pada bulan yang telah lalu diberikan hak melakukan **Klarifikasi Resmi kepada Pengurus Keamanan/Admin pada setiap tanggal 1 di awal bulan berikutnya** (contoh: sidang klarifikasi alpa bulan Oktober dilaksanakan pada tanggal 1 November).
   * Surat izin susulan yang tervalidasi saat sidang klarifikasi sah mengubah status `A` menjadi `I` sebelum rekapitulasi takzir dieksekusi pondok.

---

## 👥 3. Hukum Status Santri (Mukim, Laju, Kantin, Boyong & KKN)

Setiap kategori santri memiliki perlakuan hukum presensi yang berbeda:

```text
Matriks Hak & Kewajiban Sesi:
┌─────────────────┬──────────────────┬──────────────────┐
│ Kategori Santri │ Sesi Asrama      │ Sesi MDNU        │
├─────────────────┼──────────────────┼──────────────────┤
│ Mukim           │ Wajib (Subuh/Mlm)│ Wajib (Sore/Pel) │
│ Laju            │ BEBAS (Sembunyi) │ Wajib (Sore/Pel) │
│ Kantin          │ BEBAS (Sembunyi) │ Wajib (Sore/Pel) │
│ Boyong          │ Hilang Total     │ Hilang Total     │
│ Dispensasi KKN  │ Status 'K'       │ Status 'K'       │
└─────────────────┴──────────────────┴──────────────────┘
```

### Detail Perlakuan Status

* **Santri Baru (Tanggal Efektif Mulai Mondok):**
  * Presensi santri baru **HANYA DIHITUNG SETELAH DATA FINGERPRINT & NAMANYA RESMI MASUK DARI MESIN FISIK**.
  * Seluruh tanggal sebelum tanggal perekaman sidik jari perdana di mesin **WAJIB BERSTATUS STRIP NETRAL (`-`)**, DILARANG KERAS memvonis santri Alpha (`A`) sebelum hari dia resmi terdaftar di mesin.
* **Santri Mukim:**
  Tampil normal dan wajib mengikuti seluruh kegiatan Asrama dan MDNU.
* **Santri Laju:**
  Otomatis disembunyikan dari tabel Asrama (bebas Subuh/Malam). Jika santri baru mulai laju di tengah semester (memiliki `tanggal_mulai_laju`), santri hanya tampil di Asrama pada tanggal sebelum tanggal mulai lajunya. Tetap wajib hadir di MDNU.
* **Santri Kantin (Laju Khusus):**
  Santri yang bertugas menjaga kantin secara hukum pesantren **diperlakukan mutlak sama persis dengan Santri Laju** setiap hari. Otomatis bebas dari Asrama (tidak kena Alpha Asrama), namun **tetap tampil dan wajib di MDNU**.
* **Santri Boyong:**
  Santri yang sudah berhenti/boyong otomatis disembunyikan dari seluruh tabel (Asrama maupun MDNU) sejak tanggal boyongnya. Data historis sebelum tanggal boyong tetap tersimpan rapi.
* **Dispensasi KKN / Tugas Luar (`K`):**
  Santri yang memiliki izin KKN / tugas kampus berbulan-bulan mendapatkan status resmi **`K`** (Dispensasi) pada rentang tanggal aktifnya, sehingga tidak terhitung sebagai pelanggaran alpa.

---

## 🏖️ 4. Hukum Pemutihan Libur Khusus

* **Pemutihan Mutlak:**
  Jika suatu tanggal diset `LIBUR` oleh admin (baik Libur Rutin Jumat/Minggu maupun Hari Libur Khusus Pondok seperti Haul/Maulid), maka seluruh sesi pada tanggal tersebut **WAJIB DIPUTIHKAN (berstatus `LIBUR`)**.
* **Abaikan Scan Iseng:**
  Meskipun ada santri yang iseng menempelkan sidik jari di mesin pada hari libur, sistem wajib mengabaikannya dan tetap menampilkan status `LIBUR`.

---

## 🖧 5. Hukum Mesin Fingerprint & Infrastruktur Server

* **Prinsip "2 Mesin 1 Data Utama" (Pooled Failover & Redundancy):**
  * Dua mesin fingerprint fisik di pondok (Mesin Asrama `C2696422DF192430` dan Mesin MDNU `C2636CF4DB271E34`) bermuara ke **satu wadah data utama yang sama**.
  * Pencocokan sesi dievaluasi murni berdasarkan **Waktu & Jam Nyata (WIB)**, BUKAN dikunci kaku ke nomor seri mesin tertentu.
  * **Ketahanan Bencana:** Jika salah satu mesin rusak, mati lampu, atau *freeze*, seluruh sesi presensi (Subuh, Sore, Pelajaran 1–3, maupun Malam) sah ditampung 100% oleh 1 mesin yang aktif tanpa ada data santri yang ditolak.
* **Jembatan VPS ADMS Port 5005:**
  * Mesin fingerprint fisik melakukan HTTP raw push ke server VPS IDCloudHost di port `5005`. Script Python di VPS bertugas memvalidasi data lalu menyalurkannya secara atomik ke Firebase Cloud.
* **Ketahanan Mode Offline (Auto-Sync Pasca Internet Pulih):**
  * Jika koneksi internet/wifi pondok terputus, mesin fingerprint tetap berfungsi normal dan menyimpan rekaman scan di memori internal fisik mesin (santri tetap mendengar bunyi *"Bip! Terima kasih"*).
  * Begitu internet pondok menyala kembali, mesin secara otomatis menyemburkan seluruh antrean rekaman scan tersebut ke server VPS tanpa ada satu pun data yang hilang.
* **Pendaftaran Sidik Jari:**
  * Pendaftaran santri baru dilakukan langsung di fisik mesin (input PIN + 3x perekaman sidik jari). VPS otomatis menyedot data user ke database.
* **Standarisasi Wajib PIN Huruf Besar (UPPERCASE Sanitization):**
  * Seluruh input dan penyimpanan PIN santri dipaksa berhuruf besar rapi `.toUpperCase().trim()` (contoh: `1UA01`, bukan `1ua01`) untuk mengeliminasi risiko perpecahan data akibat *case-sensitivity* Firebase.
* **Earliest Scan Priority:**
  * Server mengabaikan scan berulang dan memprioritaskan rekaman scan paling awal pada setiap jendela sesi.

---

## 🧊 6. Integritas Data Historis (Freeze Data)

* **Data Sebelum Oktober 2026 Terkunci Mutlak:**
  Seluruh data kehadiran dari tanggal **1 Juli hingga 30 September 2026** terkunci dari penulisan ulang (`FROZEN_UNTIL_DATE = "2026-09-30"`).
* **Nilai 'A' Lampau adalah Data Riil:**
  Nilai Alpha pada tanggal-tanggal lampau adalah rekam jejak nyata santri yang tidak hadir, bukan data sampah. Dilarang mereset atau membersihkan batch data lampau.

---

## 🔄 7. Siklus Toggle Manual Admin

Saat admin atau ustadz mengklik sel presensi secara manual, sistem berputar dengan urutan:

* Sel Normal: `H` (Hadir) ➔ `A` (Alpha) ➔ `I` (Izin) ➔ `H` (Hadir).
* Sel Takziran: `T` (Ditangguhkan) ➔ `H` (Hadir jika takziran sudah diselesaikan).

---

## 🎛️ 8. Fitur QoL: Sembunyikan Kolom Libur Kosong (Auto-Hide Full Holiday)

* **Prinsip Tampilan Ramping:**
  Secara *default* (`hideEmptyLiburColumns = true`), tanggal atau sesi yang 100% libur tanpa ada aktivitas presensi santri (misal: Subuh hari Minggu, atau hari libur khusus pondok) **OTOMATIS DISEMBUNYIKAN / DILIPAT** dari tabel spreadsheet.
* **Manfaat Utama:**
  Pengurus tidak perlu lelah menggeser puluhan kolom abu-abu kosong di layar HP. Tabel menjadi sangat padat, bersih, dan hanya menampilkan hari aktif kegiatan santri.
* **Tombol Kontrol Fleksibel:**
  Disediakan tombol saklar cepat:
  * `[Kolom Libur: Disembunyikan]` (Mode default ramping)
  * `[Kolom Libur: Tampil Penuh]` (Mode kalender utuh jika admin ingin melihat semua tanggal)

---

## ⚡ 9. Hukum Model Presensi Hybrid ("Tidak Mengabsen pun Sudah Terabsen")

Model presensi PPNU v2.0 menggunakan arsitektur *dual-layer failsafe* yang tidak membebani manusia:

1. **Mesin Fingerprint = Otomasi Latar Belakang 24/7:**
   * Mesin fingerprint di Asrama dan MDNU otomatis merekam tap fisik santri secara mandiri.
   * Saat jam batas akhir (*cutoff*) sesi tiba, sistem otomatis mengevaluasi seluruh santri: yang tap menjadi `H` (Hadir), yang tidak tap dan tanpa izin menjadi `A` (Alpha).
   * **Konsekuensi Hukum:** Jika Ustadz (baik di kelas MDNU maupun pengajian asrama) berhalangan, lupa, atau tidak sempat membuka HP, **absensi sudah sah dan selesai 100% secara otomatis**. Tidak akan pernah ada data yang macet atau kosong.
2. **Ustadz & Pengurus = Kasta Tertinggi (Hak Veto / Alat Koreksi):**
   * Portal presensi di tangan Ustadz berfungsi sebagai alat koreksi lapangan.
   * Ustadz berhak menganulir tap mesin jika santri terbukti bolos (diubah menjadi `A` atau `T`), serta berhak mengesahkan santri yang hadir fisik namun lupa tap (diubah menjadi `H`).
   * Verifikasi manual Ustadz memegang derajat tertinggi di atas rekaman mesin fingerprint.
3. **Sesi Asrama Terintegrasi (Subuh & Malam):**
   * Sesi Asrama (Subuh & Malam) terintegrasi ke portal dengan logika hybrid yang sama.
   * Ustadz pengajian asrama / pengurus asrama dapat melakukan kroscek santri mukim jika berkenan. Jika tidak dibuka, mesin fingerprint asrama yang mengeksekusi secara otomatis saat cutoff (06:30 WIB Subuh / 23:00 WIB Malam).
   * Santri Laju dan Santri Kantin mutlak dibebaskan dan disembunyikan dari tagihan Asrama.

---

## 🔒 10. Lingkup Privat Internal Pesantren (4 Peran Tanpa Akses Wali)

Sistem dirancang tertutup 100% murni untuk operasional internal Pondok Pesantren Nurul Ummah (menghapus portal publik/wali santri demi menjaga privasi dan ketertiban pesantren):

1. **Santri (Cek Mandiri Internal - Model Dua Pilihan):**
   * Akses cepat tanpa kata sandi via mading digital/komputer pondok/HP santri. View-only di layar tanpa fitur unduh/cetak PDF.
   * **Mode 1 - Tabel Kelas (Mading Digital):** Santri dapat memilih kelasnya (*2AA, 1WA, 2WA, 1UA, 2UA*) untuk melihat tabel ringkas teman sekelasnya (Nama, Hadir, Izin, Alpha). Praktis bagi santri yang lupa nomor PIN.
   * **Mode 2 - Kartu Rincian Pribadi:** Kolom pencarian cepat (ketik PIN atau nama) atau sentuh baris nama pada tabel untuk membuka pop-up kartu rincian pribadi (riwayat scan tanggal, jam tap mesin, dan toleransi kuota alpha).
   * **Aturan Ambang Batas 15% Alpha & Logika Pemulihan Kehadiran:**
     * Batas maksimal ketidakhadiran (Alpha) santri di pondok adalah **15%** dari total sesi pelajaran aktif.
     * **Jika Kehadiran Aman ($\le 15\%$ Alpa):** Sistem otomatis menampilkan ucapan apresiasi (*congratulate them*): *"Alhamdulillah, kehadiranmu aman! Terus istiqomah dan pertahankan ngajinya!"*.
     * **Jika Melebihi Batas ($> 15\%$ Alpa):** Sistem secara cerdas menghitung dan menampilkan: *"Perhatian: Kehadiranmu kurang dari 85%. Kamu butuh hadir minimal [N] jam pelajaran lagi berturut-turut tanpa alpa agar status kehadiranmu kembali aman!"*.
   * **Pemetaan Jenjang Kelas Ramah Santri:** Menampilkan nama jenjang madrasah secara terhormat (`2AA` ➔ *2 Awwaliyah*, `1WA/2WA` ➔ *Wustho*, `1UA/2UA` ➔ *Ulya*).
   * **Kerahasiaan Status Kebijakan (Rahasia Dapur Admin):** Keterangan perlakuan khusus santri seperti *Wajib Asrama / Bebas Asrama (Laju/Kantin)* adalah rahasia internal Admin & Pengurus Keamanan. Dilarang keras tampil di portal santri.
2. **Ustadz (Presensi Kelas & Asrama):**
   * **Autentikasi Praktis Bersama (Ramah Asatidz Sepuh):** Login masuk kelas menggunakan satu kata sandi bersama asatidz yang mudah diingat, sehingga asatidz yang sepuh tidak dibebani kewajiban mengingat akun/email masing-masing.
   * Mengakses daftar santri sesuai kelas yang diampu pada jam berjalan (atau sesi asrama).
   * Melakukan kroscek kehadiran fisik santri di hadapannya secara cepat dan ramah sentuhan jempol di HP.
3. **Pengurus Keamanan (`pengurus.html`):**
   * Halaman meja kerja terpisah khusus pengurus keamanan pondok:
     * **Audit Trail & Deteksi Santri Nakal (Tap Mesin tapi Di-Alpha Ustadz):** Jika sistem menemukan santri memiliki data jam tap di mesin fingerprint tetapi statusnya diubah menjadi `A` atau `T` oleh Ustadz di kelas, santri ini otomatis terdaftar di meja Pengurus Keamanan sebagai barang bukti penindakan santri bolos/titip absen.
     * **Buku Takziran (`T`):** Rekap penindakan santri takzir.
     * **Radar Kamar (Subuh & Malam):** Memantau santri mukim yang belum tap saat Subuh/Malam agar disusul dan dibangunkan dari kamar.
     * **Meja Sidang Tanggal 1:** Ruang klarifikasi alpa bulanan santri sebelum eksekusi hukuman resmi pondok.
4. **Admin (Lurah Pondok & IT Superadmin - `admin.html`):**
   * Memegang kendali master data santri (status Mukim, Laju, Kantin, Boyong).
   * Mengatur kalender libur khusus pondok (Haul, Maulid, Imtihan, Hari Besar).
   * Memantau kesehatan jembatan server VPS ADMS (Port 5005) dan Bot WhatsApp (Port 5006).
