// DOM Elements
const elements = {
    companyName: document.getElementById('company-name'),
    analysisDate: document.getElementById('analysis-date'),
    dataInputs: document.querySelectorAll('.data-input'),
    tableInputs: document.querySelectorAll('.table-input'),
    saveBtn: document.getElementById('save-btn'),
    clearBtn: document.getElementById('clear-btn'),
    historyList: document.getElementById('history-list')
};

// App State
let analyses = JSON.parse(localStorage.getItem('companyAnalyses_v2') || '[]');

// Initialize
function init() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.analysisDate.value = today;

    renderHistory();
}

// Render Analysis History
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
                <div style="text-align: right;">
                    <div style="font-size: 0.7rem; color: var(--text-muted);">時価総額: ${data.fields.marketCap || '-'}</div>
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

// Save current form data
function saveAnalysis() {
    const companyName = elements.companyName.value.trim();
    if (!companyName) {
        alert('企業名を入力してください！');
        return;
    }

    // Collect standard field data
    const fields = {};
    elements.dataInputs.forEach(input => {
        fields[input.dataset.key] = input.value;
    });

    // Collect table data
    const tableData = {};
    elements.tableInputs.forEach(input => {
        const row = input.dataset.row;
        const col = input.dataset.col;
        if (!tableData[row]) tableData[row] = {};
        tableData[row][col] = input.value;
    });

    const newAnalysis = {
        id: Date.now(),
        companyName,
        date: elements.analysisDate.value,
        fields,
        tableData
    };

    analyses.unshift(newAnalysis); // Add to beginning
    localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));

    renderHistory();
    alert('詳細な分析結果を保存しました！');
}

// Load analysis into form
window.loadAnalysis = (index) => {
    const data = analyses[index];
    elements.companyName.value = data.companyName;
    elements.analysisDate.value = data.date;

    // Restore standard field data
    elements.dataInputs.forEach(input => {
        input.value = data.fields[input.dataset.key] || (input.tagName === 'SELECT' ? '-' : '');
    });

    // Restore table data
    elements.tableInputs.forEach(input => {
        const row = input.dataset.row;
        const col = input.dataset.col;
        input.value = (data.tableData[row] && data.tableData[row][col]) || '';
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Delete analysis
window.deleteAnalysis = (event, index) => {
    event.stopPropagation();
    if (confirm('この分析データを削除してもよろしいですか？')) {
        analyses.splice(index, 1);
        localStorage.setItem('companyAnalyses_v2', JSON.stringify(analyses));
        renderHistory();
    }
};

// Clear form
function clearForm() {
    if (!confirm('フォームの内容をすべてクリアしますか？')) return;

    elements.companyName.value = '';
    elements.analysisDate.value = new Date().toISOString().split('T')[0];
    elements.dataInputs.forEach(input => {
        input.value = (input.tagName === 'SELECT' ? '-' : '');
    });
    elements.tableInputs.forEach(input => input.value = '');
}

// Event Listeners
elements.saveBtn.addEventListener('click', saveAnalysis);
elements.clearBtn.addEventListener('click', clearForm);

// Start app
init();
