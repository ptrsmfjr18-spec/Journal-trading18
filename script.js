// ==========================================
// 1. STATE MANAJEMEN DATA (LOCAL STORAGE)
// ==========================================
let trades = JSON.parse(localStorage.getItem('xau_cent_journal_trades')) || [];
let deposits = JSON.parse(localStorage.getItem('xau_cent_journal_deposits')) || [];
let growthChartInstance = null;
let currentChartPeriod = 'daily';

// Helper Parser Angka yang aman untuk ketikan Koma (,) Android / Indonesia
function parseSafeFloat(val) {
    if (!val) return NaN;
    const str = String(val).replace(/,/g, '.').trim();
    return parseFloat(str);
}

// ==========================================
// 2. INISIALISASI APLIKASI SAAT DIMUAT
// ==========================================
function initApp() {
    // Set Default Waktu Entry ke waktu sekarang (Format YYYY-MM-DDTHH:MM)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateInput = document.getElementById('trade-date');
    if (dateInput) dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;

    const depositDateInput = document.getElementById('deposit-date');
    if (depositDateInput) depositDateInput.value = `${year}-${month}-${day}`;

    // Pasang Event Listener Tombol Tab Chart
    document.querySelectorAll('.chart-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartPeriod = e.target.getAttribute('data-period');
            updateChart();
        });
    });

    saveAndRender();
}

// Menangani DOMContentLoaded maupun jika skrip dimuat setelah DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ==========================================
// 3. FITUR AUTO-HITUNG (DENGAN DUKUNGAN KOMA)
// ==========================================
const autoCalcBtn = document.getElementById('auto-calc-btn');
if (autoCalcBtn) {
    autoCalcBtn.addEventListener('click', () => {
        const entry = parseSafeFloat(document.getElementById('entry-price').value);
        const exit = parseSafeFloat(document.getElementById('exit-price').value);
        const lot = parseSafeFloat(document.getElementById('trade-lot').value);
        const type = document.getElementById('trade-type').value;

        if (isNaN(entry) || isNaN(exit) || isNaN(lot)) {
            alert('⚠️ Tolong isi Harga Entry, Harga Exit, dan Ukuran Lot terlebih dahulu.\n(Tips: Angka koma desimal bisa memakai titik maupun koma)');
            return;
        }

        const direction = (type === 'BUY') ? 1 : -1;
        // Rumus Akun Cent Emas: Gerakan $1 pada 1.0 Lot Cent = 100 USC ($1.00 USD)
        const calculatedPnl = (exit - entry) * lot * 100 * direction;
        document.getElementById('trade-pnl').value = calculatedPnl.toFixed(2);
    });
}

// ==========================================
// 4. SIMPAN DATA TRANSAKSI TRADING
// ==========================================
const form = document.getElementById('journal-form');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const lotVal = parseSafeFloat(document.getElementById('trade-lot').value);
        const entryVal = parseSafeFloat(document.getElementById('entry-price').value);
        const exitVal = parseSafeFloat(document.getElementById('exit-price').value);
        const pnlVal = parseSafeFloat(document.getElementById('trade-pnl').value);

        if (isNaN(lotVal) || isNaN(entryVal) || isNaN(exitVal) || isNaN(pnlVal)) {
            alert('⚠️ Pastikan semua angka (Lot, Entry, Exit, PnL) terisi dengan format angka yang benar!');
            return;
        }

        const newTrade = {
            id: Date.now(),
            date: document.getElementById('trade-date').value,
            type: document.getElementById('trade-type').value,
            lot: lotVal,
            entry: entryVal,
            exit: exitVal,
            pnl: pnlVal,
            notes: document.getElementById('trade-notes').value.trim() || '-'
        };

        trades.unshift(newTrade);
        saveAndRender();
        
        // Reset form kecuali tanggal
        form.reset();
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('trade-date').value = `${y}-${m}-${d}T${h}:${min}`;
        alert('✅ Transaksi berhasil disimpan!');
    });
}

// ==========================================
// 5. SIMPAN DATA MODAL / DEPOSIT (FITUR BARU)
// ==========================================
const depositForm = document.getElementById('deposit-form');
if (depositForm) {
    depositForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amountVal = parseSafeFloat(document.getElementById('deposit-amount').value);
        
        if (isNaN(amountVal) || amountVal <= 0) {
            alert('⚠️ Masukkan jumlah modal masuk dengan benar (angka lebih besar dari 0).');
            return;
        }

        const newDeposit = {
            id: Date.now(),
            date: document.getElementById('deposit-date').value,
            amount: amountVal,
            notes: document.getElementById('deposit-notes').value.trim() || 'Top Up Modal'
        };

        deposits.push(newDeposit);
        // Urutkan deposit berdasarkan tanggal
        deposits.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        saveAndRender();
        depositForm.reset();
        document.getElementById('deposit-date').value = new Date().toISOString().slice(0, 10);
        alert('💰 Modal berhasil ditambahkan ke dalam sistem!');
    });
}

// Hapus Deposit
function deleteDeposit(id) {
    if (confirm('Apakah Anda yakin ingin menghapus catatan modal masuk ini? Saldo dan grafik akan disesuaikan.')) {
        deposits = deposits.filter(d => d.id !== id);
        saveAndRender();
    }
}

// Hapus Trade spesifik
function deleteTrade(id) {
    if (confirm('Apakah Anda yakin ingin menghapus catatan trading ini?')) {
        trades = trades.filter(t => t.id !== id);
        saveAndRender();
    }
}

// Reset Semua Data
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
    btnReset.addEventListener('click', () => {
        if (confirm('⚠️ PERINGATAN KERAS! Tindakan ini akan menghapus semua riwayat trading dan modal di jurnal secara permanen. Apakah Anda yakin?')) {
            trades = [];
            deposits = [];
            saveAndRender();
            alert('Sistem telah direset bersih.');
        }
    });
}

// ==========================================
// 6. STORAGE & RE-RENDER UI UTAMA
// ==========================================
function saveAndRender() {
    localStorage.setItem('xau_cent_journal_trades', JSON.stringify(trades));
    localStorage.setItem('xau_cent_journal_deposits', JSON.stringify(deposits));
    
    renderTable();
    renderDeposits();
    updateStats();
    updateChart();
}

// Render Data ke HTML Tabel Trading
function renderTable() {
    const tbody = document.getElementById('journal-tbody');
    const emptyState = document.getElementById('empty-state');
    if (!tbody || !emptyState) return;

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
        
        const d = new Date(t.date);
        const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        }) : t.date;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${typeBadge}</td>
            <td>${Number(t.lot).toFixed(2)}</td>
            <td>${Number(t.entry).toFixed(2)} <span style="color: var(--text-muted)">→</span> ${Number(t.exit).toFixed(2)}</td>
            <td class="${pnlClass}">${pnlSign}${Number(t.pnl).toFixed(2)} USC</td>
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

// Render Data ke Mini List Deposit di Sidebar
function renderDeposits() {
    const listContainer = document.getElementById('deposit-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    if (deposits.length === 0) {
        listContainer.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Belum ada modal masuk dicatat.</span>';
        return;
    }

    deposits.forEach(d => {
        const item = document.createElement('div');
        item.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);";
        item.innerHTML = `
            <div>
                <strong style="color: var(--green);">+${Number(d.amount).toFixed(2)} USC</strong>
                <div style="color: var(--text-muted); font-size: 0.65rem;">${d.date} (${d.notes})</div>
            </div>
            <button onclick="deleteDeposit(${d.id})" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:0.8rem;" title="Hapus Modal">❌</button>
        `;
        listContainer.appendChild(item);
    });
}

// ==========================================
// 7. UPDATE STATISTIK KESELURUHAN & MODAL
// ==========================================
function updateStats() {
    const totalTrades = trades.length;
    let netPnl = 0, winCount = 0, lossCount = 0, winSum = 0;

    trades.forEach(t => {
        netPnl += t.pnl;
        if (t.pnl > 0) { winCount++; winSum += t.pnl; }
        else if (t.pnl < 0) { lossCount++; }
    });

    let totalDeposit = 0;
    deposits.forEach(d => { totalDeposit += d.amount; });

    const totalBalance = totalDeposit + netPnl;
    const netUsd = netPnl / 100;
    const totalDepositUsd = totalDeposit / 100;
    const totalBalanceUsd = totalBalance / 100;
    const winRate = totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0;
    const avgWin = winCount > 0 ? (winSum / winCount) : 0;

    // Update Saldo Modal & Profit
    const elTotalBal = document.getElementById('stat-total-balance');
    const elTotalBalUsd = document.getElementById('stat-total-balance-usd');
    if (elTotalBal) elTotalBal.innerText = `${totalBalance.toFixed(2)} USC`;
    if (elTotalBalUsd) elTotalBalUsd.innerText = `$${totalBalanceUsd.toFixed(2)} USD`;

    const elTotalDep = document.getElementById('stat-total-deposit');
    const elTotalDepUsd = document.getElementById('stat-total-deposit-usd');
    if (elTotalDep) elTotalDep.innerText = `${totalDeposit.toFixed(2)} USC`;
    if (elTotalDepUsd) elTotalDepUsd.innerText = `$${totalDepositUsd.toFixed(2)} USD`;

    const elNetPnl = document.getElementById('stat-net-pnl');
    const elNetUsd = document.getElementById('stat-net-usd');
    if (elNetPnl) {
        elNetPnl.innerText = `${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)} USC`;
        elNetPnl.className = `stat-val ${netPnl >= 0 ? 'text-green' : 'text-red'}`;
    }
    if (elNetUsd) elNetUsd.innerText = `${netUsd >= 0 ? '+$' : '-$'}${Math.abs(netUsd).toFixed(2)} USD`;

    // Update Win Rate & Trades
    const elWinRate = document.getElementById('stat-win-rate');
    const elWinBar = document.getElementById('win-rate-bar');
    if (elWinRate) {
        elWinRate.innerText = `${winRate}%`;
        elWinRate.className = winRate >= 50 ? 'stat-val text-green' : 'stat-val text-red';
    }
    if (elWinBar) {
        elWinBar.style.width = `${winRate}%`;
        elWinBar.style.backgroundColor = winRate >= 50 ? 'var(--green)' : 'var(--red)';
    }

    const elAvgWin = document.getElementById('stat-avg-win');
    if (elAvgWin) elAvgWin.innerText = `${avgWin.toFixed(2)} USC`;

    const elTotalTrd = document.getElementById('stat-total-trades');
    const elRatio = document.getElementById('stat-ratio');
    if (elTotalTrd) elTotalTrd.innerText = totalTrades;
    if (elRatio) elRatio.innerText = `${winCount} Win / ${lossCount} Loss`;
}

// ==========================================
// 8. LOGIKA CHART PERTUMBUHAN MODAL (CHART.JS)
// ==========================================
function updateChart() {
    const canvas = document.getElementById('growthChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Gabungkan semua riwayat (deposit + trading) dan urutkan kronologis
    const allEvents = [];
    deposits.forEach(d => {
        allEvents.push({ date: d.date.slice(0, 10), type: 'deposit', amount: d.amount });
    });
    trades.forEach(t => {
        allEvents.push({ date: t.date.slice(0, 10), type: 'trade', amount: t.pnl });
    });

    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Kelompokkan berdasarkan periode (Daily / Weekly / Monthly)
    const groupedData = {};
    let runningBalance = 0;
    let runningDeposit = 0;

    allEvents.forEach(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return;

        let key = ev.date; // Default daily YYYY-MM-DD
        if (currentChartPeriod === 'weekly') {
            // Hitung Minggu ke berapa dalam tahun tersebut
            const startOfYear = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil((((d - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
            key = `W${weekNo}-${d.getFullYear()}`;
        } else if (currentChartPeriod === 'monthly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        }

        if (ev.type === 'deposit') runningDeposit += ev.amount;
        runningBalance += ev.amount;

        groupedData[key] = { balance: runningBalance, deposit: runningDeposit };
    });

    const labels = Object.keys(groupedData);
    const balanceData = labels.map(k => groupedData[k].balance);
    const depositData = labels.map(k => groupedData[k].deposit);

    // Jika belum ada data, beri sampel 1 titik nol agar chart tidak kosong total
    if (labels.length === 0) {
        labels.push(new Date().toISOString().slice(0, 10));
        balanceData.push(0);
        depositData.push(0);
    }

    if (growthChartInstance) {
        growthChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    
    // Gradasi Emas untuk kurva Total Saldo
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Saldo Modal + Profit (USC)',
                    data: balanceData,
                    borderColor: '#f59e0b',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Total Modal Disetor (USC)',
                    data: depositData,
                    borderColor: '#94a3b8',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9', font: { family: "'Plus Jakarta Sans', sans-serif" } }
                },
                tooltip: {
                    backgroundColor: '#151f32',
                    titleColor: '#f59e0b',
                    bodyColor: '#f1f5f9',
                    borderColor: '#22314d',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${Number(context.raw).toFixed(2)} USC ($${(context.raw/100).toFixed(2)} USD)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(34, 49, 77, 0.3)' },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(34, 49, 77, 0.3)' },
                    ticks: { 
                        color: '#94a3b8', font: { size: 11 },
                        callback: function(val) { return val + ' USC'; }
                    }
                }
            }
        }
    });
}

// ==========================================
// 9. EKSPOR & IMPOR CSV (100% SUPPOR ANDROID)
// ==========================================
const btnExport = document.getElementById('btn-export');
if (btnExport) {
    btnExport.addEventListener('click', () => {
        if (trades.length === 0) {
            alert('⚠️ Tidak ada data trading untuk diekspor!');
            return;
        }

        let csvContent = 'Tanggal & Waktu,Posisi,Lot,Entry,Exit,PnL (USC),Catatan\n';
        trades.forEach(t => {
            const row = [
                t.date, t.type, t.lot, t.entry, t.exit, t.pnl,
                `"${String(t.notes).replace(/"/g, '""')}"`
            ].join(',');
            csvContent += row + '\n';
        });

        // Menggunakan Blob API agar tidak diblokir oleh keamanan browser Android / Chrome Mobile
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `XAUUSD_Cent_Journal_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

const btnImport = document.getElementById('import-file');
if (btnImport) {
    btnImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target.result;
            const lines = text.split('\n').filter(line => line.trim() !== '');
            
            if (lines.length <= 1) {
                alert('⚠️ File CSV kosong atau tidak memiliki struktur data yang valid.');
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
                        lot: parseSafeFloat(row[2]),
                        entry: parseSafeFloat(row[3]),
                        exit: parseSafeFloat(row[4]),
                        pnl: parseSafeFloat(row[5]),
                        notes: row[6] ? row[6].replace(/^"|"$/g, '') : '-'
                    });
                }

                if (confirm(`Menemukan ${importedTrades.length} transaksi di file CSV.\n\nKlik [OK] untuk menggabungkan dengan data saat ini.\nKlik [Batal] untuk mengganti data sepenuhnya dengan CSV ini.`)) {
                    trades = [...trades, ...importedTrades];
                } else {
                    trades = importedTrades;
                }

                saveAndRender();
                alert('✅ Sukses mengimpor data jurnal trading!');
            } catch (error) {
                alert('⚠️ Gagal memproses file CSV. Pastikan struktur file sesuai template ekspor.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    });
}

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
