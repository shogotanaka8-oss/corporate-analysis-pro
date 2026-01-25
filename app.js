// DOM Elements
const elements = {
    companyName: document.getElementById('company-name'),
    analysisDate: document.getElementById('analysis-date'),
    dataInputs: document.querySelectorAll('.data-input'),
    tableInputs: document.querySelectorAll('.table-input'),
    saveBtn: document.getElementById('save-btn'),
    clearBtn: document.getElementById('clear-btn'),
    newBtn: document.getElementById('new-analysis-btn'),
    historyList: document.getElementById('history-list'),

    // Mobile Tabs
    tabs: document.querySelectorAll('.tab-btn'),
    sections: document.querySelectorAll('.analysis-section'),

    // Sync Tools
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importModal: document.getElementById('import-modal'),
    importArea: document.getElementById('import-area'),
    importConfirmBtn: document.getElementById('import-confirm-btn'),
    importCancelBtn: document.getElementById('import-cancel-btn'),

    toast: null // Dynamically created
};

// App State
let analyses = JSON.parse(localStorage.getItem('companyAnalyses_v2') || '[]');
let currentEditingId = null;
let isAutoSaving = false;

// Initialize
function init() {
    createToastElement();

    const today = new Date().toISOString().split('T')[0];
    elements.analysisDate.value = today;

    restoreDraft();
    renderHistory();
    setupEventListeners();
    setupMobileTabs();
    setupSyncTools();
}

// Create Toast System
function createToastElement() {
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px);
        background: var(--primary-color); color: var(--bg-color); padding: 12px 24px;
        border-radius: 50px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 3000;
    `;
    document.body.appendChild(toast);
    elements.toast = toast;
}

function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.style.background = type === 'success' ? 'var(--primary-color)' : 'var(--danger)';
    elements.toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
        elements.toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2500);
}

// Mobile Tabs Control
function setupMobileTabs() {
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;

            // Update buttons
            elements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update sections
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

// Data Sync Tools (Export/Import)
function setupSyncTools() {
    // Export: Copy to clipboard
    elements.exportBtn.addEventListener('click', () => {
        const data = localStorage.getItem('companyAnalyses_v2');
        if (!data || data === '[]') {
            showToast('エクスポートするデータがありません', 'error');
            return;
        }

        navigator.clipboard.writeText(data).then(() => {
            showToast('全データをコピーしました！');
        }).catch(err => {
            alert('コピーに失敗しました。以下のデータを手動でコピーしてください:\n\n' + data);
        });
    });

    // Import: Open modal
    elements.importBtn.addEventListener('click', () => {
        elements.importModal.style.display = 'flex';
        elements.importArea.value = '';
        elements.importArea.focus();
    });

    elements.importCancelBtn.addEventListener('click', () => {
        elements.importModal.style.display = 'none';
    });

    elements.importConfirmBtn.addEventListener('click', () => {
        const input = elements.importArea.value.trim();
        if (!input) return;

        try {
            const parsed = JSON.parse(input);
            if (!Array.isArray(parsed)) throw new Error('Invalid data format');

            if (confirm('現在のデータを上書きして、読み込んだデータを追加しますか？')) {
                // Merge or Overwrite? Let's Merge by ID to avoid duplicates
                const existingIds = new Set(analyses.map(a => a.id));
                const newItems = parsed.filter(item => !existingIds.has(item.id));

                analyses = [...newItems, ...analyses];
                localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));

                renderHistory();
                elements.importModal.style.display = 'none';
                showToast(`${newItems.length}件のデータを読み込みました！`);
            }
        } catch (e) {
            alert('データの形式が正しくありません。正しいデータを貼り付けてください。');
        }
    });
}

// Setup Event Listeners for Input Monitoring
function setupEventListeners() {
    const allInputs = [...elements.dataInputs, ...elements.tableInputs, elements.companyName, elements.analysisDate];
    allInputs.forEach(input => {
        input.addEventListener('input', saveDraft);
    });

    elements.saveBtn.addEventListener('click', saveAnalysis);
    elements.clearBtn.addEventListener('click', () => clearForm());
    elements.newBtn.addEventListener('click', () => {
        if (elements.companyName.value.trim() || elements.tableInputs[0].value) {
            if (confirm('現在の内容をリセットして、新しい分析を作成しますか？')) {
                clearForm(true);
                showToast('新しい分析を開始しました');
            }
        } else {
            clearForm(true);
        }
    });
}

// Draft Management (Auto-save)
function saveDraft() {
    if (isAutoSaving) return;
    const data = collectFormData();
    localStorage.setItem('analysis_draft', JSON.stringify(data));
}

function restoreDraft() {
    const draft = JSON.parse(localStorage.getItem('analysis_draft'));
    if (draft && !currentEditingId) {
        applyDataToForm(draft);
    }
}

function collectFormData() {
    const fields = {};
    elements.dataInputs.forEach(input => {
        fields[input.dataset.key] = input.value;
    });

    const tableData = {};
    elements.tableInputs.forEach(input => {
        const row = input.dataset.row;
        const col = input.dataset.col;
        if (!tableData[row]) tableData[row] = {};
        tableData[row][col] = input.value;
    });

    return {
        companyName: elements.companyName.value.trim(),
        date: elements.analysisDate.value,
        fields,
        tableData
    };
}

function applyDataToForm(data) {
    elements.companyName.value = data.companyName || '';
    elements.analysisDate.value = data.date || '';

    elements.dataInputs.forEach(input => {
        input.value = data.fields[input.dataset.key] || (input.tagName === 'SELECT' ? '-' : '');
    });

    elements.tableInputs.forEach(input => {
        const row = input.dataset.row;
        const col = input.dataset.col;
        input.value = (data.tableData[row] && data.tableData[row][col]) || '';
    });
}

function renderHistory() {
    if (analyses.length === 0) {
        elements.historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">履歴がありません</p>';
        return;
    }

    elements.historyList.innerHTML = analyses.map((data, index) => `
        <div class="history-item" onclick="loadAnalysis(${index})">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="flex: 1;">
                    <strong style="display: block; font-size: 1.1rem; color: var(--primary-color);">${data.companyName}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${data.date}</span>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; font-size: 0.75rem; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 4px;">
                <span>PER: ${data.fields.adjPer || '-'}</span>
                <span>PBR: ${data.fields.pbr || '-'}</span>
                <span>ROE: ${data.tableData.roe?.y5 || '-'}%</span>
                <span>健全性: ${data.fields.rateHealth || '-'}</span>
            </div>
            <button onclick="deleteAnalysis(event, ${index})" style="background: none; border: none; color: var(--danger); font-size: 0.75rem; margin-top: 0.5rem; cursor: pointer; float: right;">削除</button>
            <div style="clear: both;"></div>
        </div>
    `).join('');
}

function saveAnalysis() {
    const data = collectFormData();
    if (!data.companyName) {
        showToast('企業名を入力してください！', 'error');
        return;
    }

    if (currentEditingId) {
        const index = analyses.findIndex(a => a.id === currentEditingId);
        if (index !== -1) {
            analyses[index] = { ...data, id: currentEditingId };
            showToast('分析データを更新しました！');
        }
    } else {
        const newAnalysis = { ...data, id: Date.now() };
        analyses.unshift(newAnalysis);
        showToast('分析データを新規保存しました！');
    }

    localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));
    localStorage.removeItem('analysis_draft');
    renderHistory();
}

window.loadAnalysis = (index) => {
    const data = analyses[index];
    currentEditingId = data.id;
    applyDataToForm(data);

    elements.saveBtn.textContent = '分析結果を更新する';
    elements.saveBtn.style.background = 'var(--accent-color)';

    // Switch to basic tab on mobile
    if (window.innerWidth <= 768) {
        elements.tabs[0].click();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteAnalysis = (event, index) => {
    event.stopPropagation();
    if (confirm('この分析データを削除してもよろしいですか？')) {
        if (analyses[index].id === currentEditingId) {
            clearForm(true);
        }
        analyses.splice(index, 1);
        localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));
        renderHistory();
        showToast('削除しました');
    }
};

function clearForm(isNew = false) {
    if (!isNew && !confirm('フォームの内容をすべてクリアしますか？')) return;

    currentEditingId = null;
    elements.saveBtn.textContent = '分析結果を保存する';
    elements.saveBtn.style.background = 'var(--primary-color)';

    elements.companyName.value = '';
    elements.analysisDate.value = new Date().toISOString().split('T')[0];
    elements.dataInputs.forEach(input => {
        input.value = (input.tagName === 'SELECT' ? '-' : '');
    });
    elements.tableInputs.forEach(input => input.value = '');

    localStorage.removeItem('analysis_draft');

    if (window.innerWidth <= 768) {
        elements.tabs[0].click();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Start app
init();
