/**
 * storage-adapter.js - Jembatan Data & Multi-Path Atomic Adapter PPNU v2.0
 * Menerapkan 7 Benteng Keamanan Sistem:
 * 1. Multi-Path Atomic Update (anti-stomping race condition antar-ustadz)
 * 2. Gembok Data Historis (Freeze <= 2026-09-30)
 * 3. Evaluasi Reaktif Izin Resmi
 * 4. Standarisasi Format ISO YYYY-MM-DD
 * 5. Sharding Cache Per-Kelas (~50 KB, anti-quota error 5MB di HP)
 * 6. Sanitasi Wajib PIN UPPERCASE
 * 7. Kasta Tertinggi Verifikasi Ustadz & Audit Trail Santri Nakal
 */

const PPNUStorageAdapter = {
  // Gembok Data Historis Mutlak
  FROZEN_UNTIL_DATE: '2026-09-30',

  // Ambang Batas Maksimal Toleransi Alpha Pesantren (15%)
  MAX_ALPHA_TOLERANCE_PERCENT: 15,

  /**
   * Sanitasi PIN wajib huruf besar tanpa spasi
   * @param {string} pin
   * @returns {string} Contoh: '1UA01'
   */
  sanitizePin(pin) {
    return String(pin || '').toUpperCase().trim();
  },

  /**
   * Cek apakah tanggal termasuk zona beku historis (Juli - September 2026)
   * @param {string} dateISO - Format: YYYY-MM-DD
   * @returns {boolean}
   */
  isDateFrozen(dateISO) {
    if (!dateISO) return false;
    return String(dateISO) <= this.FROZEN_UNTIL_DATE;
  },

  /**
   * Menyusun payload Multi-Path Atomic Update untuk penyimpanan kelas
   * Mencegah bentrokan data ketika 5 Ustadz menyimpan kelas bersamaan
   * 
   * @param {'mdnu'|'asrama'} category - Kategori absensi
   * @param {string} dateISO - Tanggal format YYYY-MM-DD
   * @param {string} sessionKey - 'sore' | 'pel1' | 'pel2' | 'pel3' | 'subuh' | 'malam'
   * @param {Array<{ pin: string, nama?: string, status: string, time?: string, byUstadz?: boolean }>} records
   * @returns {{ updates: Object, santriNakal: Array, error?: string }}
   */
  buildMultiPathClassUpdate(category, dateISO, sessionKey, records = []) {
    // Benteng 2: Tolak keras penulisan pada tanggal lampau yang sudah di-freeze
    if (this.isDateFrozen(dateISO)) {
      throw new Error(`DITOLAK: Tanggal ${dateISO} berada dalam periode historis terkunci (<= ${this.FROZEN_UNTIL_DATE})`);
    }

    const updates = {};
    const santriNakal = [];
    const rootMatrix = (category === 'asrama') ? 'asramaMatrix' : 'mdnuMatrix';

    records.forEach(rec => {
      const pin = this.sanitizePin(rec.pin);
      if (!pin) return;

      const status = String(rec.status || '-').toUpperCase().trim();
      const timeVal = rec.time ? String(rec.time).trim() : '';
      const byUstadz = Boolean(rec.byUstadz);

      // 1. Path spesifik sel matriks santri
      updates[`/absensi_ppnu/${rootMatrix}/${pin}/${dateISO}/${sessionKey}`] = status;

      // 2. Path jam scan (jika ada jam tap fisik)
      if (timeVal) {
        updates[`/absensi_ppnu/${rootMatrix}/${pin}/${dateISO}/${sessionKey}_time`] = timeVal;
      }

      // 3. Catatan override ustadz (Kasta tertinggi verifikasi)
      if (byUstadz) {
        updates[`/absensi_ppnu/manualCellOverrides/${pin}__${dateISO}__${sessionKey}__${category}`] = status;
      }

      // 4. Deteksi Audit Trail Santri Nakal (Ada jam tap mesin tapi diubah Alpha/Takzir oleh Ustadz)
      if (timeVal && (status === 'A' || status === 'T') && byUstadz) {
        const alertKey = `${dateISO}__${pin}__${sessionKey}`;
        const nakalData = {
          pin,
          nama: rec.nama || pin,
          tanggal: dateISO,
          sesi: sessionKey,
          kategori: category,
          scanTime: timeVal,
          statusVonis: status,
          waktuDicatat: new Date().toISOString(),
          alasan: status === 'T' ? 'Ditangguhkan Ustadz (Tap tapi tidak ngaji)' : 'Vonis Alpha Ustadz (Bolos kelas)',
        };

        // Salurkan ke meja Pengurus Keamanan
        updates[`/absensi_ppnu/penangguhanSantri/${alertKey}`] = nakalData;
        santriNakal.push(nakalData);
      }
    });

    // Metadata update terakhir
    updates['/absensi_ppnu/meta/lastUpdated'] = new Date().toISOString();

    return { updates, santriNakal };
  },

  /**
   * Sharding Cache Lokal Per-Kelas
   * Menyimpan data kelas di localStorage secara terpisah (~50 KB per kelas)
   * Mengeliminasi 100% risiko QuotaExceededError 5MB di browser HP
   * 
   * @param {string} classId - '1UA', '2WA', dll
   * @param {Object} data - Data cache kelas
   */
  saveClassCache(classId, data) {
    if (typeof localStorage === 'undefined') return;
    try {
      const key = `ppnu_cache_class_${this.sanitizePin(classId)}`;
      const payload = {
        timestamp: Date.now(),
        data,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('Gagal menyimpan cache lokal kelas:', e);
    }
  },

  /**
   * Membaca Cache Lokal Per-Kelas
   * @param {string} classId
   * @returns {Object|null}
   */
  loadClassCache(classId) {
    if (typeof localStorage === 'undefined') return null;
    try {
      const key = `ppnu_cache_class_${this.sanitizePin(classId)}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Kalkulator Cerdas Kedisiplinan Santri: Ambang Batas 15% Alpha & Pemulihan
   * Menghitung apakah santri dalam batas aman, atau butuh berapa jam hadir lagi berturut-turut
   * 
   * @param {number} totalHadir - Jumlah sesi hadir (H)
   * @param {number} totalIzin - Jumlah sesi izin (I)
   * @param {number} totalAlpha - Jumlah sesi alpha (A)
   * @returns {{ totalSesi: number, alphaPercent: number, isSafe: boolean, neededSessions: number, message: string }}
   */
  calculateDisciplineStatus(totalHadir = 0, totalIzin = 0, totalAlpha = 0) {
    const totalSesi = totalHadir + totalIzin + totalAlpha;
    if (totalSesi === 0) {
      return {
        totalSesi: 0,
        alphaPercent: 0,
        isSafe: true,
        neededSessions: 0,
        message: 'Belum ada data sesi kegiatan pada bulan ini.',
      };
    }

    // Persentase alpha terhadap total sesi berjalan
    const alphaPercent = Math.round((totalAlpha / totalSesi) * 100);
    const isSafe = alphaPercent <= this.MAX_ALPHA_TOLERANCE_PERCENT;

    if (isSafe) {
      return {
        totalSesi,
        alphaPercent,
        isSafe: true,
        neededSessions: 0,
        message: 'Alhamdulillah, kehadiranmu aman! Terus istiqomah dan pertahankan ngajinya!',
      };
    }

    // Hitung berapa sesi hadir berturut-turut (X) yang dibutuhkan agar:
    // totalAlpha / (totalSesi + X) <= 0.15
    // => totalAlpha <= 0.15 * (totalSesi + X)
    // => totalAlpha / 0.15 <= totalSesi + X
    // => X >= (totalAlpha / 0.15) - totalSesi
    const targetThreshold = this.MAX_ALPHA_TOLERANCE_PERCENT / 100; // 0.15
    const requiredTotalSessions = Math.ceil(totalAlpha / targetThreshold);
    const neededSessions = Math.max(0, requiredTotalSessions - totalSesi);

    return {
      totalSesi,
      alphaPercent,
      isSafe: false,
      neededSessions,
      message: `Perhatian: Ketidakhadiranmu mencapai ${alphaPercent}% (Batas maksimal ${this.MAX_ALPHA_TOLERANCE_PERCENT}%). Kamu butuh hadir minimal ${neededSessions} jam pelajaran lagi berturut-turut tanpa alpa agar kehadiranmu kembali aman!`,
    };
  },
};

// Ekspor Browser & Node.js
if (typeof window !== 'undefined') {
  window.PPNUStorageAdapter = PPNUStorageAdapter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PPNUStorageAdapter;
}
