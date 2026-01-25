// DOM Elements
const form = {
    companyName: document.getElementById('company-name'),
    analysisDate: document.getElementById('analysis-date'),
    judgment: document.getElementById('investment-judgment'),
    scores: document.querySelectorAll('.score-input')
};

const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const historyList = document.getElementById('history-list');

// App State
let analyses = JSON.parse(localStorage.getItem('companyAnalyses') || '[]');

// Initialize
function init() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    form.analysisDate.value = today;

    renderHistory();
}

// Render Analysis History
function renderHistory() {
    if (analyses.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">履歴がありません</p>';
        return;
    }

    historyList.innerHTML = analyses.map((data, index) => `
        <div class="history-item" onclick="loadAnalysis(${index})">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div>
                    <strong style="display: block; font-size: 1.1rem;">${data.companyName}</strong>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${data.date}</span>
                </div>
                <span class="judgment-badge judgment-${data.judgment}">${data.judgment}判定</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.75rem;">
                <span>自己資本: ${data.scores.equityRatio || '-'}%</span>
                <span>ROE: ${data.scores.roe || '-'}%</span>
                <span>PER: ${data.scores.per || '-'}倍</span>
            </div>
            <button onclick="deleteAnalysis(event, ${index})" style="background: none; border: none; color: var(--danger); font-size: 0.75rem; margin-top: 0.5rem; cursor: pointer; float: right;">削除</button>
            <div style="clear: both;"></div>
        </div>
    `).join('');
}

// Add CSS for badges dynamically
const style = document.createElement('style');
style.textContent = `
    .judgment-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.8rem;
    }
    .judgment-S { background: #eab308; color: #000; }
    .judgment-A { background: #22c55e; color: #fff; }
    .judgment-B { background: #3b82f6; color: #fff; }
    .judgment-C { background: #94a3b8; color: #fff; }
    .judgment-D { background: #ef4444; color: #fff; }
`;
document.head.appendChild(style);

// Save current form data
function saveAnalysis() {
    const companyName = form.companyName.value.trim();
    if (!companyName) {
        alert('企業名を入力してください！');
        return;
    }

    const scores = {};
    form.scores.forEach(input => {
        scores[input.dataset.key] = input.value;
    });

    const newAnalysis = {
        id: Date.now(),
        companyName,
        date: form.analysisDate.value,
        judgment: form.judgment.value,
        scores
    };

    analyses.unshift(newAnalysis); // Add to beginning
    localStorage.setItem('companyAnalyses', JSON.stringify(analyses));
    
    renderHistory();
    alert('保存しました！');
}

// Load analysis into form
window.loadAnalysis = (index) => {
    const data = analyses[index];
    form.companyName.value = data.companyName;
    form.analysisDate.value = data.date;
    form.judgment.value = data.judgment;
    
    form.scores.forEach(input => {
        input.value = data.scores[input.dataset.key] || '';
    });
};

// Delete analysis
window.deleteAnalysis = (event, index) => {
    event.stopPropagation(); // Prevent loading the analysis
    if (confirm('この分析データを削除してもよろしいですか？')) {
        analyses.splice(index, 1);
        localStorage.setItem('companyAnalyses', JSON.stringify(analyses));
        renderHistory();
    }
};

// Clear form
function clearForm() {
    form.companyName.value = '';
    form.analysisDate.value = new Date().toISOString().split('T')[0];
    form.judgment.value = 'S';
    form.scores.forEach(input => input.value = '');
}

// Event Listeners
saveBtn.addEventListener('click', saveAnalysis);
clearBtn.addEventListener('click', clearForm);

// Start app
init();
