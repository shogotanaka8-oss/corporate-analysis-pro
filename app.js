// Debug Error Logging
window.onerror = function (msg, url, lineNo, columnNo, error) {
    alert('エラーが発生しました: ' + msg + '\n行: ' + lineNo + '\nURL: ' + url);
    return false;
};

// DOM Elements Container
let elements = {};

// App State
let analyses = [];
let currentEditingId = null;
let isAutoSaving = false;

// Initialize
function init() {
    try {
        console.log('Initializing app...');

        // Map elements and check for missing ones
        const elementIds = {
            companyName: 'company-name',
            analysisDate: 'analysis-date',
            saveBtn: 'save-btn',
            clearBtn: 'clear-btn',
            newBtn: 'new-analysis-btn',
            historyList: 'history-list',
            exportBtn: 'export-btn',
            importBtn: 'import-btn',
            importModal: 'import-modal',
            importArea: 'import-area',
            importConfirmBtn: 'import-confirm-btn',
            importCancelBtn: 'import-cancel-btn'
        };

        for (const [key, id] of Object.entries(elementIds)) {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`Element with ID "${id}" not found.`);
            }
            elements[key] = el;
        }

        elements.dataInputs = document.querySelectorAll('.data-input');
        elements.tableInputs = document.querySelectorAll('.table-input');
        elements.rawDataInputs = document.querySelectorAll('.raw-data');
        elements.indicatorInputs = document.querySelectorAll('.indicator-data');
        elements.tabs = document.querySelectorAll('.tab-btn');
        elements.sections = document.querySelectorAll('.analysis-section');

        // Initialize App State
        try {
            analyses = JSON.parse(localStorage.getItem('companyAnalyses_v2') || '[]');
        } catch (e) {
            console.error('Failed to parse analyses from localStorage', e);
            analyses = [];
        }

        createToastElement();

        // Set default date
        if (elements.analysisDate) {
            const today = new Date().toISOString().split('T')[0];
            elements.analysisDate.value = today;
        }

        restoreDraft();
        renderHistory();
        setupEventListeners();
        setupMobileTabs();
        setupSyncTools();

        console.log('App successfully initialized.');
    } catch (err) {
        alert('初期化中に致命的なエラーが発生しました: ' + err.message);
    }
}

// Create Toast System
function createToastElement() {
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px);
        background: #38bdf8; color: #0f172a; padding: 12px 24px;
        border-radius: 50px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 3000;
    `;
    document.body.appendChild(toast);
    elements.toast = toast;
}

function showToast(message, type = 'success') {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.style.background = type === 'success' ? '#38bdf8' : '#ef4444';
    elements.toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
        elements.toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2500);
}

// Mobile Tabs Control
function setupMobileTabs() {
    if (!elements.tabs) return;
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            elements.sections.forEach(sec => {
                sec.classList.remove('active');
                if (sec.id === `sec-${target}`) {
                    sec.classList.add('active');
                }
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// Data Sync Tools
function setupSyncTools() {
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', () => {
            const data = localStorage.getItem('companyAnalyses_v2');
            if (!data || data === '[]') {
                showToast('データがありません', 'error');
                return;
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(data).then(() => {
                    showToast('コピーしました！');
                }).catch(() => alert('コピーに失敗しました:\n' + data));
            } else {
                alert('このブラウザではコピー機能が制限されています。以下のデータを手動でコピーしてください:\n\n' + data);
            }
        });
    }

    if (elements.importBtn) {
        elements.importBtn.addEventListener('click', () => {
            elements.importModal.style.display = 'flex';
            elements.importArea.value = '';
        });
    }

    if (elements.importCancelBtn) {
        elements.importCancelBtn.addEventListener('click', () => {
            elements.importModal.style.display = 'none';
        });
    }

    if (elements.importConfirmBtn) {
        elements.importConfirmBtn.addEventListener('click', () => {
            const input = elements.importArea.value.trim();
            if (!input) return;
            try {
                const parsed = JSON.parse(input);
                if (confirm('データを読み込みますか？')) {
                    const existingIds = new Set(analyses.map(a => a.id));
                    const newItems = parsed.filter(item => !existingIds.has(item.id));
                    analyses = [...newItems, ...analyses];
                    localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));
                    renderHistory();
                    elements.importModal.style.display = 'none';
                    showToast('読み込み完了！');
                }
            } catch (e) {
                alert('不正な形式です。');
            }
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    const allInputs = [...(elements.dataInputs || []), ...(elements.tableInputs || []), elements.companyName, elements.analysisDate].filter(x => x);
    allInputs.forEach(input => {
        input.addEventListener('input', saveDraft);
    });

    // Auto-calculation listener
    if (elements.rawDataInputs) {
        elements.rawDataInputs.forEach(input => {
            input.addEventListener('input', () => {
                const col = input.dataset.col;
                calculateIndicatorsForColumn(col);
                saveDraft();
            });
        });
    }

    if (elements.saveBtn) elements.saveBtn.addEventListener('click', saveAnalysis);
    if (elements.clearBtn) elements.clearBtn.addEventListener('click', () => clearForm());
    if (elements.newBtn) {
        elements.newBtn.addEventListener('click', () => {
            const hasContent = (elements.companyName && elements.companyName.value.trim()) ||
                (elements.tableInputs && elements.tableInputs.length > 0 && elements.tableInputs[0].value);
            if (hasContent) {
                if (confirm('現在の内容をリセットしますか？')) clearForm(true);
            } else {
                clearForm(true);
            }
        });
    }
}

// Financial Auto-calculation Logic
function calculateIndicatorsForColumn(col) {
    const getVal = (row) => {
        const input = Array.from(elements.rawDataInputs).find(i => i.dataset.row === row && i.dataset.col === col);
        return input ? parseFloat(input.value.replace(/,/g, '')) : NaN;
    };

    const setIndicator = (row, val) => {
        const input = Array.from(elements.indicatorInputs).find(i => i.dataset.row === row && i.dataset.col === col);
        if (input && !isNaN(val)) {
            input.value = Number.isFinite(val) ? val.toFixed(2) : '-';
        }
    };

    const sales = getVal('sales');
    const opProfit = getVal('opProfit');
    const netProfit = getVal('netProfit');
    const totalAssets = getVal('totalAssets');
    const equity = getVal('equity');
    const curAssets = getVal('currentAssets');
    const curLiab = document.querySelector(`.raw-data[data-row="currentLiabilities"][data-col="${col}"]`);
    const currentLiabilities = curLiab ? parseFloat(curLiab.value.replace(/,/g, '')) : NaN;

    // Calculations
    if (equity && totalAssets) setIndicator('equityRatio', (equity / totalAssets) * 100);
    if (curAssets && currentLiabilities) setIndicator('currentRatio', (curAssets / currentLiabilities) * 100);
    if (opProfit && sales) setIndicator('opMargin', (opProfit / sales) * 100);
    if (netProfit && equity) setIndicator('roe', (netProfit / equity) * 100);
    if (netProfit && totalAssets) setIndicator('roa', (netProfit / totalAssets) * 100);

    // Growth rates (compared to previous column)
    const prevColMap = { 'y2': 'y1', 'y3': 'y2', 'y4': 'y3', 'y5': 'y4' };
    const prevCol = prevColMap[col];
    if (prevCol) {
        const getPrevVal = (row) => {
            const input = Array.from(elements.rawDataInputs).find(i => i.dataset.row === row && i.dataset.col === prevCol);
            return input ? parseFloat(input.value.replace(/,/g, '')) : NaN;
        };

        const prevSales = getPrevVal('sales');
        if (sales && prevSales) setIndicator('salesGrowth', ((sales - prevSales) / prevSales) * 100);

        const prevOpProfit = getPrevVal('opProfit');
        if (opProfit && prevOpProfit) setIndicator('profitGrowth', ((opProfit - prevOpProfit) / prevOpProfit) * 100);
    }
}

// Draft/Form Management
function saveDraft() {
    if (isAutoSaving) return;
    localStorage.setItem('analysis_draft', JSON.stringify(collectFormData()));
}

function restoreDraft() {
    const draftStr = localStorage.getItem('analysis_draft');
    if (draftStr && !currentEditingId) {
        try {
            applyDataToForm(JSON.parse(draftStr));
        } catch (e) { }
    }
}

function collectFormData() {
    const fields = {};
    elements.dataInputs.forEach(input => fields[input.dataset.key] = input.value);

    const tableData = {};
    elements.tableInputs.forEach(input => {
        const row = input.dataset.row;
        const col = input.dataset.col;
        if (!tableData[row]) tableData[row] = {};
        tableData[row][col] = input.value;
    });

    const rawData = {};
    elements.rawDataInputs.forEach(input => {
        const row = input.dataset.row;
        const col = input.dataset.col;
        if (!rawData[row]) rawData[row] = {};
        rawData[row][col] = input.value;
    });

    return {
        companyName: elements.companyName ? elements.companyName.value.trim() : '',
        date: elements.analysisDate ? elements.analysisDate.value : '',
        fields,
        tableData,
        rawData
    };
}

function applyDataToForm(data) {
    if (elements.companyName) elements.companyName.value = data.companyName || '';
    if (elements.analysisDate) elements.analysisDate.value = data.date || '';

    if (elements.dataInputs) {
        elements.dataInputs.forEach(input => {
            input.value = data.fields[input.dataset.key] || (input.tagName === 'SELECT' ? '-' : '');
        });
    }

    if (elements.tableInputs) {
        elements.tableInputs.forEach(input => {
            const row = input.dataset.row;
            const col = input.dataset.col;
            input.value = (data.tableData && data.tableData[row] && data.tableData[row][col]) || '';
        });
    }

    if (elements.rawDataInputs && data.rawData) {
        elements.rawDataInputs.forEach(input => {
            const row = input.dataset.row;
            const col = input.dataset.col;
            input.value = (data.rawData[row] && data.rawData[row][col]) || '';
        });
    }
}

function renderHistory() {
    if (!elements.historyList) return;
    if (analyses.length === 0) {
        elements.historyList.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">履歴なし</p>';
        return;
    }
    elements.historyList.innerHTML = analyses.map((data, index) => `
        <div class="history-item" onclick="loadAnalysis(${index})">
            <div><strong style="color: #38bdf8;">${data.companyName}</strong></div>
            <div style="font-size: 0.75rem;">${data.date} / PER: ${data.fields.adjPer || '-'}</div>
            <button onclick="deleteAnalysis(event, ${index})" style="color: #ef4444; border:none; background:none; cursor:pointer; font-size:0.7rem; float:right;">削除</button>
            <div style="clear:both;"></div>
        </div>
    `).join('');
}

function saveAnalysis() {
    const data = collectFormData();
    if (!data.companyName) {
        showToast('企業名を入力してください', 'error');
        return;
    }
    if (currentEditingId) {
        const idx = analyses.findIndex(a => a.id === currentEditingId);
        if (idx !== -1) analyses[idx] = { ...data, id: currentEditingId };
    } else {
        analyses.unshift({ ...data, id: Date.now() });
    }
    localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));
    localStorage.removeItem('analysis_draft');
    renderHistory();
    showToast('保存しました！');
}

window.loadAnalysis = (index) => {
    const data = analyses[index];
    currentEditingId = data.id;
    applyDataToForm(data);
    elements.saveBtn.textContent = '更新する';
    elements.saveBtn.style.background = '#f472b6';
    if (window.innerWidth <= 768 && elements.tabs[0]) elements.tabs[0].click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteAnalysis = (event, index) => {
    event.stopPropagation();
    if (confirm('削除しますか？')) {
        if (analyses[index].id === currentEditingId) clearForm(true);
        analyses.splice(index, 1);
        localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));
        renderHistory();
        showToast('削除しました');
    }
};

function clearForm(isNew = false) {
    if (!isNew && !confirm('クリアしますか？')) return;
    currentEditingId = null;
    elements.saveBtn.textContent = '保存する';
    elements.saveBtn.style.background = '#38bdf8';
    if (elements.companyName) elements.companyName.value = '';
    elements.dataInputs.forEach(input => input.value = (input.tagName === 'SELECT' ? '-' : ''));
    elements.tableInputs.forEach(input => input.value = '');
    localStorage.removeItem('analysis_draft');
    if (window.innerWidth <= 768 && elements.tabs[0]) elements.tabs[0].click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Start
init();
