/**
 * config.js - Konfigurasi Resmi Firebase Cloud PPNU Absensi v2.0
 * Berisi kredensial resmi Firebase Realtime Database (absen-4aefe)
 * Mendukung Browser Global (window.PPNUConfig) dan Node.js Test Environment.
 */

const PPNUConfig = {
  // Kredensial Firebase Realtime Database Resmi Pesantren
  firebaseConfig: {
    apiKey: "AIzaSyCa5Ju8DUC91aiRUj3XFkMklUAMgpYlRkM",
    authDomain: "absen-4aefe.firebaseapp.com",
    databaseURL: "https://absen-4aefe-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "absen-4aefe",
    storageBucket: "absen-4aefe.firebasestorage.app",
    messagingSenderId: "894477069410",
    appId: "1:894477069410:web:9e7487393c9000673c353b",
  },

  // Simpul Dasar Database
  ROOT_PATH: 'absensi_ppnu',

  // Gembok Data Historis Lampau (Juli - September 2026 Terkunci Mutlak)
  FROZEN_UNTIL_DATE: '2026-09-30',

  // Daftar 5 Kelas Resmi MDNU PPNU
  OFFICIAL_CLASSES: ['2AA', '1WA', '2WA', '1UA', '2UA'],

  // Password Bersama Asatidz (Default fallback, disinkronkan ke cloud)
  DEFAULT_USTADZ_PIN: 'asatidznu',

  // Versi Sistem
  VERSION: '2.0.0-rc1',
};

// Ekspor Browser & Node.js
if (typeof window !== 'undefined') {
  window.PPNUConfig = PPNUConfig;
  window.PPNU_CONFIG = PPNUConfig;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PPNUConfig;
}
