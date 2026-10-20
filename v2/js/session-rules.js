/**
 * session-rules.js - Modul Resmi Aturan Waktu & Logika Sesi PPNU Absensi v2.0
 * Berisi seluruh logika bisnis pesantren: jam cutoff, Malam Sabtu, status santri (Laju/Kantin/Boyong/Takzir/Dispensasi KKN),
 * pemutihan libur khusus, konversi zona waktu WIB, dan prioritas Hadir > Izin.
 */

const PPNURules = {
  // Batas Penguncian Data Historis
  FROZEN_UNTIL_DATE: '2026-09-30',

  // Definisi Sesi Asrama
  ASRAMA_SESSIONS: {
    subuh: {
      key: 'subuh',
      name: 'Subuh',
      startTime: '05:00',
      cutoffTime: '06:30',
      offDays: [0, 5], // 0: Minggu, 5: Jumat (Libur Rutin)
    },
    malam: {
      key: 'malam',
      name: 'Malam',
      startTime: '18:30',
      cutoffTime: '23:00', // Rutin (Kamis malam / Malam Jumat)
      activeDays: [4, 5],  // 4: Kamis malam, 5: Jumat malam (Malam Sabtu)
      specialSchedule: {
        '1UA': [0],        // Hari Minggu malam aktif jam 21:00 - 22:30
      },
    },
  },

  // Definisi Sesi MDNU
  MDNU_SESSIONS: {
    sore: {
      key: 'sore',
      name: 'Sore',
      startTime: '15:00',
      cutoffTime: '18:00',
      classSchedule: {
        '1UA': [0, 6], // Minggu & Sabtu (15:00 - 18:00)
        '2WA': [4],    // Kamis (15:00 - 18:00)
      },
    },
    pel1: {
      key: 'pel1',
      name: 'Pelajaran 1',
      startTime: '18:30',
      cutoffTime: '19:40',
    },
    pel2: {
      key: 'pel2',
      name: 'Pelajaran 2',
      startTime: '19:40',
      cutoffTime: '21:00',
    },
    pel3: {
      key: 'pel3',
      name: 'Pelajaran 3',
      startTime: '21:00',
      cutoffTime: '22:30',
    },
  },

  // Pemetaan Jenjang Kelas Resmi MDNU PPNU
  CLASS_NAMES: {
    '2AA': 'Kelas 2 Awwaliyah (2AA)',
    '1WA': 'Kelas 1 Wustho (1WA)',
    '2WA': 'Kelas 2 Wustho (2WA)',
    '1UA': 'Kelas 1 Ulya (1UA)',
    '2UA': 'Kelas 2 Ulya (2UA)',
  },

  /**
   * Mengambil nama lengkap jenjang kelas ramah santri
   * @param {string} classCode - '1UA', '2WA', dll
   * @returns {string} Contoh: 'Kelas 1 Ulya (1UA)'
   */
  getClassName(classCode = '') {
    const clean = String(classCode).toUpperCase().trim();
    return this.CLASS_NAMES[clean] || (clean ? `Kelas ${clean}` : '-');
  },


  /**
   * Helper paten konversi waktu ke WIB (UTC+7)
   * Mencegah bug jika HP ustadz/pengurus tersetting ke zona waktu lain (WITA/WIT/Luar Negeri)
   * @param {Date} [date] - Tanggal acuan (default: new Date())
   * @returns {{ dateISO: string, displayDate: string, timeStr: string, timeWithSec: string, totalMinutes: number, dayIndex: number }}
   */
  getWIBTime(date = new Date()) {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (3600000 * 7));
    const y = wib.getFullYear();
    const m = String(wib.getMonth() + 1).padStart(2, '0');
    const d = String(wib.getDate()).padStart(2, '0');
    const hh = String(wib.getHours()).padStart(2, '0');
    const mm = String(wib.getMinutes()).padStart(2, '0');
    const ss = String(wib.getSeconds()).padStart(2, '0');
    const dayIndex = wib.getDay(); // 0: Minggu, 1: Senin, ..., 5: Jumat, 6: Sabtu

    return {
      dateISO: `${y}-${m}-${d}`,
      displayDate: `${d}/${m}/${y}`,
      timeStr: `${hh}:${mm}`,
      timeWithSec: `${hh}:${mm}:${ss}`,
      totalMinutes: wib.getHours() * 60 + wib.getMinutes(),
      dayIndex,
    };
  },

  /**
   * Mengambil batas cutoff Asrama Malam
   * - Kamis malam (Malam Jumat): 23:00 WIB
   * - Jumat malam (Malam Sabtu): Mengikuti jam sesi MDNU yang dipinjam (pel1: 19:40, pel2: 21:00, pel3: 22:30)
   * - Minggu malam (Khusus 1UA): 22:30 WIB
   * @param {number} dayIndex - 0: Minggu, 4: Kamis, 5: Jumat
   * @param {string} [classId] - Contoh: '1UA'
   * @param {string} [borrowedSlot] - 'pel1' | 'pel2' | 'pel3'
   * @returns {string} Jam cutoff WIB
   */
  getAsramaMalamCutoff(dayIndex, classId = '', borrowedSlot = 'pel1') {
    if (dayIndex === 4) return '23:00'; // Kamis malam
    if (dayIndex === 5) {               // Jumat malam (Malam Sabtu)
      if (borrowedSlot === 'pel2') return '21:00';
      if (borrowedSlot === 'pel3') return '22:30';
      return '19:40';
    }
    if (dayIndex === 0 && String(classId).toUpperCase().startsWith('1UA')) {
      return '22:30'; // Minggu malam khusus 1UA
    }
    return '23:00';
  },

  /**
   * Cek apakah suatu sesi terjadwal aktif untuk kelas dan hari tertentu
   * @param {'asrama'|'mdnu'} category
   * @param {string} sessionKey - 'subuh'|'malam'|'sore'|'pel1'|'pel2'|'pel3'
   * @param {number} dayIndex - 0: Minggu, 1: Senin, ..., 6: Sabtu
   * @param {string} [classId] - '1UA', '2WA', dll
   * @param {string} [settingMalamSabtu] - 'pel1' | 'pel2' | 'pel3'
   * @returns {boolean}
   */
  isSessionScheduled(category, sessionKey, dayIndex, classId = '', settingMalamSabtu = 'pel1') {
    const cleanClass = String(classId || '').toUpperCase().trim();

    if (category === 'asrama') {
      if (sessionKey === 'subuh') {
        // Libur Jumat (5) & Minggu (0)
        return dayIndex !== 0 && dayIndex !== 5;
      }
      if (sessionKey === 'malam') {
        if (dayIndex === 4 || dayIndex === 5) return true;
        if (dayIndex === 0 && cleanClass.startsWith('1UA')) return true;
        return false;
      }
      return false;
    }

    if (category === 'mdnu') {
      if (sessionKey === 'sore') {
        if ((dayIndex === 0 || dayIndex === 6) && cleanClass.startsWith('1UA')) return true;
        if (dayIndex === 4 && cleanClass.startsWith('2WA')) return true;
        return false;
      }

      // Pelajaran Malam (pel1, pel2, pel3):
      // Kamis malam (day 4) LIBUR TOTAL MDNU
      if (dayIndex === 4) return false;

      // Jumat malam (Malam Sabtu): sesi yang dipinjam Asrama berstatus LIBUR
      if (dayIndex === 5) {
        return sessionKey !== settingMalamSabtu;
      }

      // Hari biasa: aktif
      return true;
    }

    return false;
  },

  /**
   * Mengambil sesi yang sedang berlangsung saat ini (Real-time active session detector)
   * Berguna untuk portal Ustadz agar langsung membuka sesi yang pas tanpa pilih manual
   * @param {'mdnu'|'asrama'} category
   * @param {string} currentTimeStr - '19:15'
   * @param {number} dayIndex - 0: Minggu s.d 6: Sabtu
   * @param {string} [classId] - '1UA'
   * @param {string} [settingMalamSabtu] - 'pel1'
   * @returns {string|null} Key sesi yang aktif atau null jika di luar jam sesi
   */
  detectCurrentActiveSession(category, currentTimeStr, dayIndex, classId = '', settingMalamSabtu = 'pel1') {
    const sessions = category === 'asrama' ? this.ASRAMA_SESSIONS : this.MDNU_SESSIONS;

    for (const key of Object.keys(sessions)) {
      if (!this.isSessionScheduled(category, key, dayIndex, classId, settingMalamSabtu)) {
        continue;
      }
      const s = sessions[key];
      let cutoff = s.cutoffTime;
      if (category === 'asrama' && key === 'malam') {
        cutoff = this.getAsramaMalamCutoff(dayIndex, classId, settingMalamSabtu);
      }

      if (currentTimeStr >= s.startTime && currentTimeStr <= cutoff) {
        return key;
      }
    }
    return null;
  },

  /**
   * Cek apakah santri berhak tampil di tabel Asrama
   * @param {Object} santri - Data santri (status, tanggal_laju, tanggal_boyong)
   * @param {string} dateStr - Tanggal evaluasi (format: YYYY-MM-DD)
   * @returns {boolean}
   */
  isEligibleForAsrama(santri, dateStr) {
    if (!santri) return false;

    // Santri Boyong otomatis hilang total setelah tanggal boyong
    if (santri.status === 'Boyong' || santri.status === 'boyong') {
      if (santri.tanggal_boyong && dateStr >= santri.tanggal_boyong) {
        return false;
      }
    }

    // Santri Kantin diperlakukan sama dengan Laju (bebas Asrama)
    if (santri.status === 'Kantin' || santri.status === 'kantin') {
      return false;
    }

    // Santri Laju bebas Asrama (atau jika mulai laju di tengah semester)
    if (santri.status === 'Laju' || santri.status === 'laju') {
      if (santri.tanggal_laju) {
        return dateStr < santri.tanggal_laju;
      }
      return false;
    }

    return true; // Santri Mukim normal
  },

  /**
   * Cek apakah santri berhak tampil di tabel MDNU
   * @param {Object} santri - Data santri
   * @param {string} dateStr - Tanggal evaluasi (format: YYYY-MM-DD)
   * @returns {boolean}
   */
  isEligibleForMDNU(santri, dateStr) {
    if (!santri) return false;

    // Santri Boyong hilang total dari MDNU setelah tanggal boyong
    if (santri.status === 'Boyong' || santri.status === 'boyong') {
      if (santri.tanggal_boyong && dateStr >= santri.tanggal_boyong) {
        return false;
      }
    }

    // Mukim, Laju, dan Kantin WAJIB ikut MDNU
    return true;
  },

  /**
   * Tentukan status kehadiran santri secara real-time
   * Mematuhi prioritas:
   * 1. LIBUR (Rutin / Khusus Admin)
   * 2. BELUM_MULAI_MONDOK (Santri baru masuk di tengah periode)
   * 3. LAJU_MID_SEMESTER (Laju di tengah semester pada tab Asrama)
   * 4. VERIFIKASI_USTADZ / OVERRIDE_ADMIN (Mata kepala ustadz mengalahkan mesin!)
   * 5. HADIR_FISIK (H > I: Hadir nyata mesin mengalahkan surat izin)
   * 6. SUSPEND_TAKZIR (Scan finger tapi tidak ngaji -> Status 'T')
   * 7. IZIN_RESMI (Surat Keamanan Google Form -> Status 'I')
   * 8. DISPENSASI_KKN (Tugas luar pondok / KKN -> Status 'K')
   * 9. JAM_BERJALAN (Sebelum cutoff -> Netral '-')
   * 10. LEWAT_CUTOFF (Sah Alpha 'A')
   * 
   * @param {Object} params
   * @param {boolean} params.isHoliday - Apakah hari libur rutin/khusus
   * @param {boolean} params.isBeforeMondok - Apakah sebelum santri baru mulai mondok
   * @param {boolean} params.isLajuMidSemester - Apakah santri sudah mulai laju di asrama
   * @param {string|null} params.manualUstadzStatus - Status verifikasi ustadz / override admin ("H"/"I"/"A"/"T"/"K")
   * @param {string|null} params.earliestScanTime - Jam scan fisik terawal ("05:15")
   * @param {boolean} params.isSuspended - Apakah santri ditangguhkan/takzir
   * @param {boolean} params.hasPermission - Apakah ada izin resmi Google Form
   * @param {Object|null} params.permissionDetail - Rincian surat izin (alasan, acc, noIzin)
   * @param {boolean} params.isDispensasi - Apakah santri dapat dispensasi (KKN / Tugas Pondok)
   * @param {string} params.sessionCutoff - Jam cutoff ("06:30")
   * @param {string} params.currentTimeStr - Jam sekarang WIB ("06:45")
   * @returns {{ status: string, label: string, isFinal: boolean, detail?: Object }}
   */
  determineStatus({
    isHoliday = false,
    isBeforeMondok = false,
    isLajuMidSemester = false,
    manualUstadzStatus = null,
    earliestScanTime = null,
    isSuspended = false,
    hasPermission = false,
    permissionDetail = null,
    isDispensasi = false,
    sessionCutoff = '06:30',
    currentTimeStr = '00:00',
  }) {
    // 1. PEMUTIHAN LIBUR MUTLAK: Jika libur, abaikan scan iseng!
    if (isHoliday) {
      return { status: 'LIBUR', label: 'LIBUR', isFinal: true };
    }

    // 2. SANTRI BELUM MULAI MONDOK: Bebas Alpha, tampil strip (-)
    if (isBeforeMondok && !earliestScanTime) {
      return { status: '-', label: '-', isFinal: true };
    }

    // 3. LAJU TENGAH SEMESTER (ASRAMA): Bebas Asrama
    if (isLajuMidSemester) {
      return { status: 'LAJU', label: 'LAJU', isFinal: true };
    }

    // 4. MODEL HYBRID: Verifikasi Ustadz / Override Admin mengalahkan mesin!
    // (Jika santri tap finger lalu kabur, ustadz di kelas berhak mencap 'A' atau 'T')
    if (manualUstadzStatus) {
      return {
        status: manualUstadzStatus,
        label: manualUstadzStatus === 'H' && earliestScanTime ? earliestScanTime : `${manualUstadzStatus} (Ustadz)`,
        isFinal: true,
      };
    }

    // 5. PRIORITAS HADIR FISIK (H > I): Hadir nyata mengalahkan izin!
    if (earliestScanTime) {
      if (isSuspended) {
        return {
          status: 'T',
          label: `${earliestScanTime} (Takzir)`,
          isFinal: true,
        };
      }
      return {
        status: 'H',
        label: earliestScanTime,
        isFinal: true,
      };
    }

    // 6. IZIN RESMI KEAMANAN
    if (hasPermission) {
      return {
        status: 'I',
        label: 'Izin',
        isFinal: true,
        detail: permissionDetail || null,
      };
    }

    // 7. DISPENSASI KKN / TUGAS PONDOK (STATUS 'K')
    if (isDispensasi) {
      return {
        status: 'K',
        label: 'Dispensasi',
        isFinal: true,
      };
    }

    // 8. SEBELUM CUTOFF: Status WAJIB Netral Strip (-)
    const isPastCutoff = currentTimeStr >= sessionCutoff;
    if (!isPastCutoff) {
      return {
        status: '-',
        label: '-',
        isFinal: false,
      };
    }

    // 9. SUDAH LEWAT CUTOFF: Resmi Alpha (A)
    return {
      status: 'A',
      label: 'Alpha',
      isFinal: true,
    };
  },

  /**
   * Helper siklus toggle manual admin saat klik sel
   * @param {string} currentStatus - 'H' | 'A' | 'I' | 'T' | 'K' | '-'
   * @returns {string} Status berikutnya
   */
  getNextManualStatus(currentStatus) {
    if (currentStatus === 'H') return 'A';
    if (currentStatus === 'A') return 'I';
    if (currentStatus === 'I') return 'T';
    if (currentStatus === 'T') return 'K';
    if (currentStatus === 'K') return 'H';
    return 'H';
  },

  /**
   * Helper QoL: Deteksi apakah suatu sesi/tanggal 100% libur kosong
   * @param {Array<string>} cellValues - Daftar status seluruh santri pada sesi tersebut
   * @param {boolean} hideEmptyLiburColumns - Pengaturan aktifkan sembunyikan kolom libur
   * @returns {boolean} True jika kolom harus disembunyikan
   */
  shouldHideSessionColumn(cellValues, hideEmptyLiburColumns = true) {
    if (!hideEmptyLiburColumns) return false;
    if (!cellValues || cellValues.length === 0) return true;

    const hasActivePresence = cellValues.some(v => {
      return v === 'H' || v === 'A' || v === 'I' || v === 'T' || v === 'K' || v === 'BELUM_MULAI' || (typeof v === 'string' && v.includes(':'));
    });

    return !hasActivePresence;
  },
};

// Dukung ekspor ES module maupun browser window global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PPNURules;
} else if (typeof window !== 'undefined') {
  window.PPNURules = PPNURules;
}
