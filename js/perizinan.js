/**
 * Modul Perizinan Santri & Google Form Integration
 * Sistem Presensi PPNU Putra (Pondok Pesantren Nurul Ummah)
 * 
 * Modul terpisah untuk mengelola:
 * - Menampilkan QR Code resmi & tautan form perizinan
 * - Mengambil dan merender rekapan izin santri dari Google Sheets
 * - Pencarian cepat, filter waktu, dan status keaktifan izin
 */

const PERIZINAN_CONFIG = {
    FORM_URL: "https://bit.ly/PerizinanSantriNurulUmmahTA2026-2027",
    CSV_URL: "https://docs.google.com/spreadsheets/d/1720e8LpBYtopySA85FW0wOJTTrI5sx4I9l1EAbBg7BM/export?format=csv&gid=729863469",
    QR_IMAGE_PATH: "assets/qr_perizinan.png"
};

let rawIzinData = [];
let filteredIzinData = [];
let filterIzinKategori = 'all'; // 'all', 'today', 'month', 'active'
let searchIzinKeyword = '';
let isLoadingIzin = false;
let lastIzinFetchTime = null;

// ==========================================
// 1. UTILITY PARSING & DATA EXTRACTION
// ==========================================

function parseIzinCSV(text) {
    const lines = [];
    let row = [];
    let inQuotes = false;
    let curVal = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"') {
            if (inQuotes && next === '"') {
                curVal += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(curVal.trim());
            curVal = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && next === '\n') i++;
            row.push(curVal.trim());
            if (row.length > 1 || (row.length === 1 && row[0] !== '')) lines.push(row);
            row = [];
            curVal = '';
        } else {
            curVal += char;
        }
    }
    if (curVal || row.length > 0) {
        row.push(curVal.trim());
        lines.push(row);
    }
    return lines;
}

function parseIzinDMY(str) {
    if (!str) return null;
    const clean = str.trim().split(' ')[0];
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
        let d, m, y;
        if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            d = parseInt(parts[2], 10);
        } else {
            d = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10) - 1;
            y = parseInt(parts[2], 10);
        }
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
    }
    return null;
}

function formatIzinDisplayDate(dt) {
    if (!dt || isNaN(dt.getTime())) return '-';
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = dt.getDate();
    const m = bulan[dt.getMonth()];
    const y = dt.getFullYear();
    return `${d} ${m} ${y}`;
}

// ==========================================
// 2. FETCH & DATA TRANSFORMATION
// ==========================================

async function muatDataPerizinanGoogleForm(forceRefresh = false) {
    if (isLoadingIzin) return;
    if (rawIzinData.length > 0 && !forceRefresh) {
        aplikasikanFilterIzin();
        return;
    }

    isLoadingIzin = true;
    updateIzinStatusUI("Sedang mengambil data perizinan dari Google Form...", true);

    try {
        const resp = await fetch(PERIZINAN_CONFIG.CSV_URL);
        if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
        const csvText = await resp.text();
        const rows = parseIzinCSV(csvText);

        if (!rows || rows.length < 2) {
            updateIzinStatusUI("Data formulir perizinan belum tersedia atau kosong.", false);
            isLoadingIzin = false;
            return;
        }

        const now = new Date();
        const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const timestamp = (r[0] || '').trim();
            const pemberi = (r[1] || '-').trim();
            const kelas = (r[2] || '-').trim();
            // Google Form dynamic fields for student name
            const nama = (r[3] || r[4] || r[5] || r[6] || r[7] || '').trim();
            if (!nama) continue;

            const durasiHariText = (r[8] || '1 Hari').trim();
            const rawMulai = (r[9] || '').trim();
            const rawSampai = (r[10] || '').trim();
            const sesiStr = (r[11] || 'Semua Sesi').trim();
            const alasan = (r[12] || '-').trim();
            const noIzin = (r[13] || '-').trim();

            const sDt = parseIzinDMY(rawMulai);
            let eDt = parseIzinDMY(rawSampai);

            if (sDt && (!eDt || isNaN(eDt.getTime()))) {
                let hari = 1;
                const match = durasiHariText.match(/\d+/);
                if (match) hari = parseInt(match[0], 10) || 1;
                eDt = new Date(sDt);
                eDt.setDate(eDt.getDate() + (hari - 1));
            }

            // Status period relative to today
            let statusPeriode = 'selesai';
            let statusLabel = 'Selesai';
            let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

            if (sDt && eDt) {
                const sZero = new Date(sDt.getFullYear(), sDt.getMonth(), sDt.getDate());
                const eZero = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate());

                if (todayZero >= sZero && todayZero <= eZero) {
                    statusPeriode = 'aktif';
                    statusLabel = 'Aktif Hari Ini';
                    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold animate-pulse';
                } else if (todayZero < sZero) {
                    statusPeriode = 'mendatang';
                    statusLabel = 'Mendatang';
                    badgeClass = 'bg-blue-100 text-blue-800 border-blue-200 font-semibold';
                } else {
                    statusPeriode = 'selesai';
                    statusLabel = 'Selesai';
                    badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                }
            }

            parsed.push({
                id: i,
                timestamp,
                pemberi,
                kelas,
                nama,
                durasiHariText,
                rawMulai,
                rawSampai,
                startDt: sDt,
                endDt: eDt,
                sesiStr,
                alasan,
                noIzin,
                statusPeriode,
                statusLabel,
                badgeClass
            });
        }

        // Urutkan dari pengajuan terbaru (descending)
        parsed.reverse();
        rawIzinData = parsed;
        lastIzinFetchTime = new Date();
        updateIzinStatusUI(`Berhasil memuat ${rawIzinData.length} perizinan terbaru.`, false);
        aplikasikanFilterIzin();

    } catch (err) {
        console.error("Gagal memuat CSV Perizinan:", err);
        updateIzinStatusUI("Gagal memuat data dari spreadsheet Google Form. Silakan coba lagi.", false);
    } finally {
        isLoadingIzin = false;
    }
}

// ==========================================
// 3. FILTERING & SEARCH
// ==========================================

function setFilterIzinKategori(kategori) {
    filterIzinKategori = kategori;
    const buttons = ['all', 'today', 'month', 'active'];
    buttons.forEach(k => {
        const btn = document.getElementById(`btnFilterIzin_${k}`);
        if (!btn) return;
        const isSelected = (k === kategori);
        if (isSelected) {
            btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-purple-700 text-white shadow-xs cursor-pointer';
        } else {
            btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer';
        }
    });
    aplikasikanFilterIzin();
}

function handleSearchIzin(query) {
    searchIzinKeyword = (query || '').toLowerCase().trim();
    const btnClear = document.getElementById('btnClearSearchIzin');
    if (btnClear) {
        if (searchIzinKeyword.length > 0) btnClear.classList.remove('hidden');
        else btnClear.classList.add('hidden');
    }
    aplikasikanFilterIzin();
}

function clearSearchIzin() {
    searchIzinKeyword = '';
    const inp = document.getElementById('inputSearchIzin');
    if (inp) inp.value = '';
    const btnClear = document.getElementById('btnClearSearchIzin');
    if (btnClear) btnClear.classList.add('hidden');
    aplikasikanFilterIzin();
}

function aplikasikanFilterIzin() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const todayZero = new Date(curYear, curMonth, now.getDate());

    let list = rawIzinData.slice();

    // 1. Filter Kategori Tab
    if (filterIzinKategori === 'today') {
        list = list.filter(item => {
            if (!item.startDt || !item.endDt) return false;
            const sZero = new Date(item.startDt.getFullYear(), item.startDt.getMonth(), item.startDt.getDate());
            const eZero = new Date(item.endDt.getFullYear(), item.endDt.getMonth(), item.endDt.getDate());
            return todayZero >= sZero && todayZero <= eZero;
        });
    } else if (filterIzinKategori === 'active') {
        list = list.filter(item => item.statusPeriode === 'aktif');
    } else if (filterIzinKategori === 'month') {
        list = list.filter(item => {
            if (!item.startDt) return false;
            return item.startDt.getFullYear() === curYear && item.startDt.getMonth() === curMonth;
        });
    }

    // 2. Filter Keyword Search
    if (searchIzinKeyword.length > 0) {
        list = list.filter(item => {
            return item.nama.toLowerCase().includes(searchIzinKeyword) ||
                   item.kelas.toLowerCase().includes(searchIzinKeyword) ||
                   item.alasan.toLowerCase().includes(searchIzinKeyword) ||
                   item.pemberi.toLowerCase().includes(searchIzinKeyword) ||
                   item.noIzin.toLowerCase().includes(searchIzinKeyword);
        });
    }

    filteredIzinData = list;
    renderTabelPerizinan();
    updateIzinMetrics();
}

// ==========================================
// 4. RENDERING UI
// ==========================================

function updateIzinStatusUI(pesan, isSyncing) {
    const el = document.getElementById('statusIzinText');
    const dot = document.getElementById('statusIzinDot');
    if (el) el.innerText = pesan;
    if (dot) {
        if (isSyncing) {
            dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-ping';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        }
    }
}

function updateIzinMetrics() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const todayZero = new Date(curYear, curMonth, now.getDate());

    const totalAll = rawIzinData.length;
    let totalHariIni = 0;
    let totalBulanIni = 0;
    let totalSakit = 0;

    rawIzinData.forEach(item => {
        if (item.startDt && item.endDt) {
            const sZero = new Date(item.startDt.getFullYear(), item.startDt.getMonth(), item.startDt.getDate());
            const eZero = new Date(item.endDt.getFullYear(), item.endDt.getMonth(), item.endDt.getDate());
            if (todayZero >= sZero && todayZero <= eZero) totalHariIni++;
        }
        if (item.startDt && item.startDt.getFullYear() === curYear && item.startDt.getMonth() === curMonth) {
            totalBulanIni++;
        }
        if (item.alasan.toLowerCase().includes('sakit')) {
            totalSakit++;
        }
    });

    const elTotal = document.getElementById('statTotalPengajuanIzin');
    if (elTotal) elTotal.innerText = totalAll;

    const elHariIni = document.getElementById('statIzinHariIni');
    if (elHariIni) elHariIni.innerText = totalHariIni;

    const elBulanIni = document.getElementById('statIzinBulanIni');
    if (elBulanIni) elBulanIni.innerText = totalBulanIni;

    const elSakit = document.getElementById('statIzinSakit');
    if (elSakit) elSakit.innerText = totalSakit;

    const elCountTable = document.getElementById('labelTotalIzinTampil');
    if (elCountTable) elCountTable.innerText = `${filteredIzinData.length} data ditemukan`;
}

function renderTabelPerizinan() {
    const tbody = document.getElementById('tbodyPerizinan');
    if (!tbody) return;

    if (filteredIzinData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p class="font-bold text-slate-600">Tidak ada data perizinan yang sesuai.</p>
                        <p class="text-xs text-slate-400">Coba ubah kata kunci pencarian atau ganti filter kategori.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filteredIzinData.forEach((item, index) => {
        const no = index + 1;
        const rentangStr = `${formatIzinDisplayDate(item.startDt)} s.d ${formatIzinDisplayDate(item.endDt)}`;
        const tglAjuan = item.timestamp ? item.timestamp.split(' ')[0] : '-';

        html += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="py-3 px-3.5 text-center text-slate-500 font-mono text-xs">${no}</td>
                <td class="py-3 px-3.5">
                    <div class="font-bold text-slate-900">${item.nama}</div>
                    <div class="text-[11px] text-slate-400 font-mono">Form: ${tglAjuan} &bull; No: ${item.noIzin}</div>
                </td>
                <td class="py-3 px-3.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        ${item.kelas}
                    </span>
                </td>
                <td class="py-3 px-3.5">
                    <div class="font-semibold text-slate-800 text-xs">${rentangStr}</div>
                    <div class="text-[11px] text-purple-700 font-medium">Durasi: ${item.durasiHariText}</div>
                </td>
                <td class="py-3 px-3.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                        ${item.sesiStr}
                    </span>
                </td>
                <td class="py-3 px-3.5">
                    <div class="text-xs text-slate-700 font-medium max-w-[220px] truncate" title="${item.alasan}">
                        ${item.alasan}
                    </div>
                    <div class="text-[10px] text-slate-400">Pemberi: ${item.pemberi}</div>
                </td>
                <td class="py-3 px-3.5 text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${item.badgeClass}">
                        ${item.statusLabel}
                    </span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==========================================
// 5. ACTIONS: COPY, OPEN, DOWNLOAD
// ==========================================

function bukaFormIzinOnline() {
    window.open(PERIZINAN_CONFIG.FORM_URL, '_blank', 'noopener,noreferrer');
}

function salinLinkIzinOnline() {
    navigator.clipboard.writeText(PERIZINAN_CONFIG.FORM_URL).then(() => {
        if (typeof tampilkanToast === 'function') {
            tampilkanToast("Tautan Google Form Perizinan berhasil disalin ke clipboard!");
        } else {
            alert("Tautan Google Form Perizinan berhasil disalin!");
        }
    }).catch(err => {
        prompt("Salin tautan formulir berikut:", PERIZINAN_CONFIG.FORM_URL);
    });
}

function unduhGambarQRIzin() {
    const link = document.createElement('a');
    link.href = PERIZINAN_CONFIG.QR_IMAGE_PATH;
    link.download = 'QR_Perizinan_Santri_PPNU.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Inisialisasi tampilan saat menu perizinan dibuka
function renderMenuPerizinan() {
    muatDataPerizinanGoogleForm(false);
}

// Auto-run if container already exists
document.addEventListener('DOMContentLoaded', () => {
    // If opened directly on #izin
    if (window.location.hash === '#izin') {
        if (typeof gantiMenuUtama === 'function') {
            gantiMenuUtama('izin');
        }
    }
});
