// State manajemen data
let trades = JSON.parse(localStorage.getItem('xau_cent_journal_trades')) || [];

// DOM Elements
const form = document.getElementById('journal-form');
const tradeDateInput = document.getElementById('trade-date');
const tradeTypeInput = document.getElementById('trade-type');
const tradeLotInput = document.getElementById('trade-lot');
const entryPriceInput = document.getElementById('entry-price');
const exitPriceInput = document.getElementById('exit-price');
const tradePnlInput = document.getElementById('trade-pnl');
const tradeNotesInput = document.getElementById('trade-notes');
const autoCalcBtn = document.getElementById('auto-calc-btn');

const tbody = document.getElementById('journal-tbody');
const emptyState = document.getElementById('empty-state');

// Elements Statistics
const statNetPnl = document.getElementById('stat-net-pnl');
const statNetUsd = document.getElementById('stat-net-usd');
const statWinRate = document.getElementById('stat-win-rate');
const winRateBar = document.getElementById('win-rate-bar');
const statAvgWin = document.getElementById('stat-avg-win');
const statTotalTrades = document.getElementById('stat-total-trades');
const statRatio = document.getElementById('stat-ratio');

// Action Buttons
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('import-file');
const btnReset = document.getElementById('btn-reset');

// Set default date & time form input ke waktu sekarang saat dimuat
window.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    // Format ke YYYY-MM-DDTHH:MM yang diterima datetime-local
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    tradeDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    saveAndRender();
});

// Fitur Auto-Hitung Profit/Loss Emas di Akun Cent
// Rumus: PnL (USC) = (Exit - Entry) * Lot * 100 * Arah (1 jika BUY, -1 jika SELL)
autoCalcBtn.addEventListener('click', () => {
    const entry = parseFloat(entryPriceInput.value);
    const exit = parseFloat(exitPriceInput.value);
    const lot = parseFloat(tradeLotInput.value);
    const type = tradeTypeInput.value;

    if (isNaN(entry) || isNaN(exit) || isNaN(lot)) {
        alert('Tolong isi Harga Entry, Exit, dan Lot terlebih dahulu untuk menggunakan fitur Auto-Hitung.');
        return;
    }

    const direction = (type === 'BUY') ? 1 : -1;
    // Pada Akun Cent Emas: Gerakan $1 pada 1.0 Lot Cent = 100 USC ($1.00 USD)
    const calculatedPnl = (exit - entry) * lot * 100 * direction;
    tradePnlInput.value = calculatedPnl.toFixed(2);
});

// Event form submitting (Simpan Data Trade Baru)
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTrade = {
        id: Date.now(),
        date: tradeDateInput.value,
        type: tradeTypeInput.value,
        lot: parseFloat(tradeLotInput.value),
        entry: parseFloat(entryPriceInput.value),
        exit: parseFloat(exitPriceInput.value),
        pnl: parseFloat(tradePnlInput.value),
        notes: tradeNotesInput.value.trim() || '-'
    };

    trades.unshift(newTrade); // Sisipkan ke antrean paling atas
    saveAndRender();
    
    // Reset form kecuali tanggal
    form.reset();
    const now = new Date();
    tradeDateInput.value = now.toISOString().slice(0, 16);
});

// Hapus Trade spesifik
function deleteTrade(id) {
    if (confirm('Apakah Anda yakin ingin menghapus catatan trading ini?')) {
        trades = trades.filter(t => t.id !== id);
        saveAndRender();
    }
}

// Reset Semua Data
btnReset.addEventListener('click', () => {
    if (confirm('⚠️ PERINGATAN KERAS! Tindakan ini akan menghapus semua riwayat trading di jurnal secara permanen. Apakah Anda yakin?')) {
        trades = [];
        saveAndRender();
    }
});

// Update LocalStorage & Refresh Tampilan UI
function saveAndRender() {
    localStorage.setItem('xau_cent_journal_trades', JSON.stringify(trades));
    renderTable();
    updateStats();
}

// Render Data ke HTML Tabel
function renderTable() {
    tbody.innerHTML = '';
    
    if (trades.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    trades.forEach(t => {
        const isProfit = t.pnl >= 0;
        const pnlClass = isProfit ? 'text-green font-bold' : 'text-red font-bold';
        const pnlSign = (isProfit && t.pnl > 0) ? '+' : '';
        const typeBadge = t.type === 'BUY' ? '<span class="badge badge-buy">BUY 🟢</span>' : '<span class="badge badge-sell">SELL 🔴</span>';
        
        // Format Tampilan Tanggal
        const d = new Date(t.date);
        const formattedDate = d.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${typeBadge}</td>
            <td>${t.lot.toFixed(2)}</td>
            <td>${t.entry.toFixed(2)} <span style="color: var(--text-muted)">→</span> ${t.exit.toFixed(2)}</td>
            <td class="${pnlClass}">${pnlSign}${t.pnl.toFixed(2)} USC</td>
            <td style="color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.notes}">${t.notes}</td>
            <td style="text-align: center;">
                <button class="action-delete" onclick="deleteTrade(${t.id})" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update Kalkulasi Statistik Dashboard
function updateStats() {
    const total = trades.length;
    statTotalTrades.innerText = total;

    if (total === 0) {
        statNetPnl.innerText = '0.00 USC';
        statNetPnl.className = 'stat-val';
        statNetUsd.innerText = '$0.00 USD';
        statWinRate.innerText = '0%';
        statWinRate.className = 'stat-val text-green';
        winRateBar.style.width = '0%';
        statAvgWin.innerText = '0.00 USC';
        statRatio.innerText = '0 Win / 0 Loss';
        return;
    }

    let netPnl = 0;
    let winCount = 0;
    let lossCount = 0;
    let winSum = 0;

    trades.forEach(t => {
        netPnl += t.pnl;
        if (t.pnl > 0) {
            winCount++;
            winSum += t.pnl;
        } else if (t.pnl < 0) {
            lossCount++;
        }
    });

    const netUsd = netPnl / 100;
    const winRate = Math.round((winCount / total) * 100);
    const avgWin = winCount > 0 ? (winSum / winCount) : 0;

    // Render Net PnL (Cent & USD)
    statNetPnl.innerText = `${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)} USC`;
    statNetPnl.className = `stat-val ${netPnl >= 0 ? 'text-green' : 'text-red'}`;
    statNetUsd.innerText = `${netUsd >= 0 ? '+$' : '-$'}${Math.abs(netUsd).toFixed(2)} USD`;

    // Render Win Rate
    statWinRate.innerText = `${winRate}%`;
    winRateBar.style.width = `${winRate}%`;
    if (winRate >= 50) {
        statWinRate.className = 'stat-val text-green';
        winRateBar.style.backgroundColor = 'var(--green)';
    } else {
        statWinRate.className = 'stat-val text-red';
        winRateBar.style.backgroundColor = 'var(--red)';
    }

    // Render Lainnya
    statAvgWin.innerText = `${avgWin.toFixed(2)} USC`;
    statRatio.innerText = `${winCount} Win / ${lossCount} Loss`;
}

// EKSPOR DATA KE CSV (Backup Aman)
btnExport.addEventListener('click', () => {
    if (trades.length === 0) {
        alert('Tidak ada data trading untuk diekspor!');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tanggal & Waktu,Posisi,Lot,Entry,Exit,PnL (USC),Catatan\n';

    trades.forEach(t => {
        const row = [
            t.date,
            t.type,
            t.lot,
            t.entry,
            t.exit,
            t.pnl,
            `"${t.notes.replace(/"/g, '""')}"`
        ].join(',');
        csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XAUUSD_Cent_Journal_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// IMPOR DATA DARI CSV (Restore Backup)
btnImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length <= 1) {
            alert('File CSV kosong atau tidak memiliki data yang valid.');
            return;
        }

        try {
            const importedTrades = [];
            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVRow(lines[i]);
                if (row.length < 6) continue;

                importedTrades.push({
                    id: Date.now() + i,
                    date: row[0],
                    type: row[1],
                    lot: parseFloat(row[2]),
                    entry: parseFloat(row[3]),
                    exit: parseFloat(row[4]),
                    pnl: parseFloat(row[5]),
                    notes: row[6] ? row[6].replace(/^"|"$/g, '') : '-'
                });
            }

            if (confirm(`Menemukan ${importedTrades.length} transaksi di file CSV. Gabungkan dengan data jurnal saat ini? (Klik 'Cancel' jika ingin mengganti data sepenuhnya)`)) {
                trades = [...trades, ...importedTrades];
            } else {
                trades = importedTrades;
            }

            saveAndRender();
            alert('Sukses mengimpor data jurnal!');
        } catch (error) {
            alert('Gagal memproses file CSV. Pastikan struktur file Anda sesuai template ekspor.');
            console.error(error);
        }
    };
    reader.readAsText(file);
});

// Helper Parser CSV Row untuk menangani koma di dalam tanda petik catatan
function parseCSVRow(text) {
    let p = '', r = [];
    let q = false;
    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (c === '"') { q = !q; }
        else if (c === ',' && !q) { r.push(p); p = ''; }
        else { p += c; }
    }
    r.push(p);
    return r;
}