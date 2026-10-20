/**
 * santri-store.js - Penyedia Data Santri & Sinkronisasi Status PPNU v2.0
 * Mengelola pemetaan 98 santri ke dalam 5 kelas resmi (2AA, 1WA, 2WA, 1UA, 2UA)
 * Menyaring santri Boyong, Laju, dan Kantin secara akurat & aman
 */

const PPNUSantriStore = {
  // Cache Memori Santri Aktif
  _cachedMasterList: [],
  _cachedStatusAsrama: {},
  _cachedStatusMDNU: {},
  _cachedDispen: {},
  _cachedPermissions: {},

  /**
   * Ekstraksi Kode Kelas dari PIN Santri
   * Contoh: '1UA05' -> '1UA', '2WA12' -> '2WA'
   * @param {string} pin
   * @returns {string} '2AA' | '1WA' | '2WA' | '1UA' | '2UA' | 'OTHER'
   */
  extractClassFromPin(pin) {
    const clean = String(pin || '').toUpperCase().trim();
    const prefix = clean.substring(0, 3);
    const validClasses = ['2AA', '1WA', '2WA', '1UA', '2UA'];
    return validClasses.includes(prefix) ? prefix : 'OTHER';
  },

  /**
   * Cek apakah santri cocok dengan filter kelas (1UA, 2UA, 1WA, 2WA, 2AA, all)
   * Mendukung format PIN (1UA01) maupun format teks nama kelas (1 Ulya A)
   */
  matchClass(santri, filterKelas) {
    if (!filterKelas || filterKelas === 'all') return true;
    const cleanTarget = String(filterKelas).toUpperCase().trim();
    const pin = String(santri?.pin || '').toUpperCase().trim();
    if (pin && pin !== '-' && pin.substring(0, cleanTarget.length) === cleanTarget) {
      return true;
    }
    const pinClass = this.extractClassFromPin(pin);
    if (pinClass === cleanTarget) return true;
    if (santri?.kelas) {
      const k = String(santri.kelas).toUpperCase();
      if (cleanTarget === '1UA' && k.includes('1') && k.includes('ULYA')) return true;
      if (cleanTarget === '2UA' && k.includes('2') && k.includes('ULYA')) return true;
      if (cleanTarget === '1WA' && k.includes('1') && k.includes('WUSTHO')) return true;
      if (cleanTarget === '2WA' && k.includes('2') && k.includes('WUSTHO')) return true;
      if (cleanTarget === '2AA' && k.includes('2') && k.includes('AWALIYAH')) return true;
      if (k === cleanTarget) return true;
    }
    return false;
  },

  /**
   * Filter santri per kelas & aturan mukim/laju/boyong
   * @param {Array} rawSantriList - Data santriList dari Firebase
   * @param {string} targetClass - '1UA', '2WA', dll
   * @param {'mdnu'|'asrama'} category - Kategori sesi
   * @param {Object} statusAsramaMap - Map status santri asrama
   * @param {Object} statusMDNUMap - Map status santri MDNU
   * @param {string} dateISO - Tanggal evaluasi YYYY-MM-DD
   * @returns {Array<{ pin: string, nama: string, kelas: string, statusKependudukan: string }>}
   */
  filterSantriByClass(rawSantriList = [], targetClass, category = 'mdnu', statusAsramaMap = {}, statusMDNUMap = {}, dateISO = '') {
    const cleanTarget = String(targetClass || '').toUpperCase().trim();

    return rawSantriList
      .filter(item => {
        if (!item || !item.pin) return false;
        const pin = String(item.pin).toUpperCase().trim();
        const itemClass = this.extractClassFromPin(pin);

        // 1. Cek kecocokan kelas
        if (itemClass !== cleanTarget) return false;

        // 2. Cek status kependudukan
        const asramaStatus = String(statusAsramaMap[pin] || 'mukim').toLowerCase().trim();
        const mdnuStatus = String(statusMDNUMap[pin] || 'mukim').toLowerCase().trim();

        // Santri Boyong HILANG TOTAL dari MDNU & Asrama
        if (asramaStatus === 'boyong' || mdnuStatus === 'boyong') {
          return false;
        }

        // Pada sesi Asrama: Santri Laju & Kantin OTOMATIS BEBAS (Disembunyikan)
        if (category === 'asrama') {
          if (asramaStatus === 'laju' || asramaStatus === 'kantin') {
            return false;
          }
        }

        return true;
      })
      .map(item => {
        const pin = String(item.pin).toUpperCase().trim();
        const asramaStatus = String(statusAsramaMap[pin] || 'mukim').toLowerCase().trim();
        return {
          pin,
          nama: item.nama || pin,
          kelas: cleanTarget,
          statusKependudukan: asramaStatus,
        };
      })
      .sort((a, b) => a.pin.localeCompare(b.pin));
  },

  /**
   * Menggabungkan data santri dengan log scan fingerprint dan surat izin
   * @param {Array} santriClassList - Daftar santri yang sudah difilter
   * @param {Object} sessionMatrixForDate - Data matriks kehadiran tanggal bersangkutan
   * @param {string} sessionKey - 'pel1', 'pel2', 'subuh', dll
   * @param {Object} permissionsMap - Rincian surat izin pos keamanan
   * @returns {Array} Daftar santri siap render di layar Ustadz / Santri
   */
  mergeAttendanceState(santriClassList = [], sessionMatrixForDate = {}, sessionKey = '', permissionsMap = {}) {
    return santriClassList.map(s => {
      const pin = s.pin;
      const santriDateData = (sessionMatrixForDate && sessionMatrixForDate[pin]) || {};

      // Nilai status tersimpan di database
      const savedStatus = santriDateData[sessionKey] || '';
      // Jam scan fingerprint tersimpan (misal: '18:32')
      const fpTime = santriDateData[`${sessionKey}_time`] || '';

      // Cek surat izin pos keamanan
      // Format key izin: "${pin}__${dateISO}__${sesi}__${tab}"
      let izinDetail = null;
      if (permissionsMap) {
        for (const [key, val] of Object.entries(permissionsMap)) {
          if (key.startsWith(`${pin}__`) && key.includes(`__${sessionKey}__`)) {
            izinDetail = val;
            break;
          }
        }
      }

      // Tentukan status awal tampilan:
      // Jika sudah ada status resmi tersimpan -> pakai status tersimpan
      // Jika belum ada status tapi ada jam scan fingerprint -> otomatis 'H'
      // Jika ada izin resmi -> otomatis 'I'
      // Default: '-' (belum mulai / netral)
      let initialStatus = '-';
      if (savedStatus && savedStatus !== '-') {
        initialStatus = savedStatus;
      } else if (fpTime) {
        initialStatus = 'H';
      } else if (izinDetail) {
        initialStatus = 'I';
      }

      return {
        pin: s.pin,
        nama: s.nama,
        kelas: s.kelas,
        statusKependudukan: s.statusKependudukan,
        fpTime: fpTime || '',
        status: initialStatus,
        izinAlasan: izinDetail ? (izinDetail.alasan || 'Izin Pos Keamanan') : '',
        pemberiIzin: izinDetail ? (izinDetail.pemberiIzin || '') : '',
      };
    });
  },
};

// Ekspor Browser & Node.js
if (typeof window !== 'undefined') {
  window.PPNUSantriStore = PPNUSantriStore;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PPNUSantriStore;
}
