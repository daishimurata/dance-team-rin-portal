import './styles.css';
import { 
  fetchForms, 
  createNewForm, 
  updateFormStatus,
  fetchAllFormResponses, 
  createAnnouncement 
} from './firebase.js';

let createdFields = [];
let allForms = [];
let currentFormResponses = [];
let currentFormId = null;

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupAdminNav();
  initFormBuilder();

  document.getElementById('create-form-form')?.addEventListener('submit', handleCreateFormSubmit);
  document.getElementById('create-announce-form')?.addEventListener('submit', handleCreateAnnounceSubmit);
  document.getElementById('select-admin-form')?.addEventListener('change', handleSelectAdminFormChange);
});

// 1. 管理者パスコード認証
function setupAuth() {
  const authForm = document.getElementById('auth-form');
  const authOverlay = document.getElementById('admin-auth');
  const adminMain = document.getElementById('admin-main');

  if (sessionStorage.getItem('rin_admin_authed') === 'true') {
    authOverlay.style.display = 'none';
    adminMain.style.display = 'block';
    loadAdminData();
    return;
  }

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('auth-pass').value;
    if (pass === 'rin2026' || pass === 'admin') {
      sessionStorage.setItem('rin_admin_authed', 'true');
      authOverlay.style.display = 'none';
      adminMain.style.display = 'block';
      showToast('管理者としてログインしました');
      loadAdminData();
    } else {
      alert('パスコードが正しくありません。');
    }
  });
}

function setupAdminNav() {
  const navBtns = document.querySelectorAll('.admin-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;

      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
      navBtns.forEach(b => b.classList.remove('active'));

      document.getElementById(targetId)?.classList.add('active');
      btn.classList.add('active');
    });
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

async function loadAdminData() {
  allForms = await fetchForms();
  renderFormSelectOptions();
  if (allForms.length > 0) {
    currentFormId = allForms[0].id;
    loadFormResponsesSummary(allForms[0].id);
  }
}

// ----------------------------------------------------
// 2. Google Forms 互換 フォーム発行エディタ
// ----------------------------------------------------
function initFormBuilder() {
  createdFields = [
    { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', helpText: '', options: '', required: true },
    { id: 'attendance', label: '出欠区分', type: 'radio', helpText: '該当する区分を選択してください', options: '参加, 遅刻参加, 早退, 欠席', required: true }
  ];
  renderFieldItems();

  document.getElementById('btn-add-field')?.addEventListener('click', () => {
    const newIdx = createdFields.length + 1;
    createdFields.push({
      id: 'field_' + Date.now(),
      label: '設問' + newIdx,
      type: 'text',
      helpText: '',
      options: '',
      required: false
    });
    renderFieldItems();
  });
}

function renderFieldItems() {
  const container = document.getElementById('fields-editor-container');
  if (!container) return;

  container.innerHTML = createdFields.map((f, idx) => `
    <div class="card" style="background: #f8fafc; border: 1px solid #cbd5e1; margin-bottom: 14px; border-left: 4px solid var(--gold-primary);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:700; font-size:0.88rem; color:var(--text-main);">設問 #${idx + 1}</span>
        ${createdFields.length > 1 ? `<button type="button" class="btn btn-secondary btn-del-field" data-idx="${idx}" style="padding:2px 8px; font-size:0.75rem; width:auto; color:#dc2626; border-color:#fca5a5;">削除</button>` : ''}
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label" style="font-size:0.8rem;">設問タイトル</label>
        <input type="text" class="form-input field-label-input" data-idx="${idx}" value="${escapeHtml(f.label)}" required placeholder="例: サイズ・希望カラー">
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label" style="font-size:0.8rem;">補足説明（ヘルプテキスト）</label>
        <input type="text" class="form-input field-help-input" data-idx="${idx}" value="${escapeHtml(f.helpText || '')}" placeholder="例: 普段着用しているTシャツのサイズを選択してください">
      </div>

      <div style="display:flex; gap:10px; margin-bottom:10px;">
        <div style="flex:1;">
          <label class="form-label" style="font-size:0.8rem;">回答形式</label>
          <select class="form-select field-type-select" data-idx="${idx}">
            <option value="text" ${f.type === 'text' ? 'selected' : ''}>✏️ 記述式 (短文)</option>
            <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>📄 段落 (長文)</option>
            <option value="radio" ${f.type === 'radio' ? 'selected' : ''}>🔘 ラジオボタン (単一選択)</option>
            <option value="checkbox" ${f.type === 'checkbox' ? 'selected' : ''}>☑️ チェックボックス (複数選択)</option>
            <option value="select" ${f.type === 'select' ? 'selected' : ''}>🔽 ドロップダウン選択</option>
            <option value="scale" ${f.type === 'scale' ? 'selected' : ''}>⭐ 5段階評価スケール</option>
            <option value="number" ${f.type === 'number' ? 'selected' : ''}>🔢 数値入力</option>
            <option value="date" ${f.type === 'date' ? 'selected' : ''}>📅 日付入力</option>
          </select>
        </div>

        <div style="display:flex; align-items:flex-end; padding-bottom:8px;">
          <label style="font-size:0.82rem; display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:700;">
            <input type="checkbox" class="field-req-check" data-idx="${idx}" ${f.required ? 'checked' : ''}>
            <span>必須項目</span>
          </label>
        </div>
      </div>

      ${(f.type === 'radio' || f.type === 'checkbox' || f.type === 'select') ? `
        <div class="form-group" style="margin-bottom:4px;">
          <label class="form-label" style="font-size:0.8rem;">選択肢リスト（カンマ区切り）</label>
          <input type="text" class="form-input field-options-input" data-idx="${idx}" value="${escapeHtml(f.options)}" placeholder="例: 参加, 遅刻参加, 早退, 欠席">
        </div>
      ` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.field-label-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      createdFields[idx].label = e.target.value;
    });
  });

  container.querySelectorAll('.field-help-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      createdFields[idx].helpText = e.target.value;
    });
  });

  container.querySelectorAll('.field-type-select').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = e.target.getAttribute('data-idx');
      createdFields[idx].type = e.target.value;
      renderFieldItems();
    });
  });

  container.querySelectorAll('.field-options-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      createdFields[idx].options = e.target.value;
    });
  });

  container.querySelectorAll('.field-req-check').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = e.target.getAttribute('data-idx');
      createdFields[idx].required = e.target.checked;
    });
  });

  container.querySelectorAll('.btn-del-field').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      createdFields.splice(idx, 1);
      renderFieldItems();
    });
  });
}

async function handleCreateFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('new-form-title').value;
  const desc = document.getElementById('new-form-desc').value;
  const deadline = document.getElementById('new-form-deadline').value || '未設定';

  const processedFields = createdFields.map(f => {
    const item = { 
      id: f.id, 
      label: f.label, 
      type: f.type, 
      helpText: f.helpText || '',
      required: f.required 
    };
    if (f.type === 'radio' || f.type === 'checkbox' || f.type === 'select') {
      item.options = f.options.split(',').map(s => s.trim()).filter(Boolean);
    }
    return item;
  });

  const res = await createNewForm(title, desc, deadline, processedFields);
  if (res.success) {
    showToast(res.message);
    e.target.reset();
    initFormBuilder();
    loadAdminData();
  } else {
    alert('エラー: ' + res.message);
  }
}

// ----------------------------------------------------
// 3. 自動集計ダッシュボード (クリーンSaaSスタイル)
// ----------------------------------------------------
function renderFormSelectOptions() {
  const select = document.getElementById('select-admin-form');
  if (!select) return;

  if (!allForms || allForms.length === 0) {
    select.innerHTML = '<option value="">発行済みフォームはありません</option>';
    return;
  }

  select.innerHTML = allForms.map(f => `
    <option value="${f.id}">${escapeHtml(f.title)} (${f.status === 'open' ? '受付中' : '停止中'})</option>
  `).join('');
}

function handleSelectAdminFormChange(e) {
  const formId = e.target.value;
  if (formId) {
    currentFormId = formId;
    loadFormResponsesSummary(formId);
  }
}

async function loadFormResponsesSummary(formId) {
  const area = document.getElementById('responses-summary-area');
  if (!area) return;

  const responses = await fetchAllFormResponses(formId);
  currentFormResponses = responses;

  const targetForm = allForms.find(f => f.id === formId);
  if (!targetForm) return;

  const isOpen = targetForm.status === 'open';

  let summaryHeaderHtml = `
    <div style="background:#f8fafc; padding:16px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-main);">${escapeHtml(targetForm.title)}</h3>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">回収件数: <strong style="color:var(--text-main); font-size:1rem;">${responses.length} 件</strong> ｜ 締切: ${escapeHtml(targetForm.deadline)}</div>
        </div>

        <div style="display:flex; gap:10px; align-items:center;">
          <button id="btn-toggle-status" class="btn ${isOpen ? 'btn-secondary' : 'btn-primary'}" style="width:auto; padding:6px 14px; font-size:0.82rem;">
            ${isOpen ? '🛑 回答の受付を停止する' : '🟢 回答の受付を再開する'}
          </button>
          <button id="btn-download-csv" class="btn btn-gold" style="width:auto; padding:6px 14px; font-size:0.82rem;">
            📥 CSVでダウンロード
          </button>
        </div>
      </div>
    </div>
  `;

  if (!responses || responses.length === 0) {
    area.innerHTML = summaryHeaderHtml + '<div style="color:var(--text-muted); padding:20px 0; text-align:center;">まだ回収された回答データはありません。</div>';
    bindSummaryEvents(formId, isOpen);
    return;
  }

  // バーグラフ計算
  let chartsHtml = '';
  if (targetForm.fields) {
    chartsHtml = targetForm.fields.map(field => {
      if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') {
        const optionCounts = {};
        if (field.options) {
          field.options.forEach(opt => optionCounts[opt] = 0);
        }

        let totalResForField = 0;
        responses.forEach(r => {
          const ansVal = r.answers[field.id] || r.answers[field.label];
          if (ansVal) {
            const selectedArr = String(ansVal).split(',').map(s => s.trim());
            selectedArr.forEach(sel => {
              optionCounts[sel] = (optionCounts[sel] || 0) + 1;
              totalResForField++;
            });
          }
        });

        const barItems = Object.entries(optionCounts).map(([optName, count]) => {
          const pct = totalResForField > 0 ? Math.round((count / responses.length) * 100) : 0;
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px; font-weight:500;">
                <span>${escapeHtml(optName)}</span>
                <span style="color:var(--text-muted); font-weight:700;">${count} 票 (${pct}%)</span>
              </div>
              <div style="background:#e2e8f0; height:12px; border-radius:6px; overflow:hidden;">
                <div style="background:var(--gold-gradient); width:${pct}%; height:100%; transition:width 0.4s ease;"></div>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="card" style="background:#ffffff; margin-bottom:14px; border:1px solid #cbd5e1;">
            <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-bottom:12px;">📊 ${escapeHtml(field.label)}</h4>
            ${barItems}
          </div>
        `;
      }
      return '';
    }).join('');
  }

  // メンバー全回答一覧テーブル
  const headers = ['回答者', '回答日時', ...Object.keys(responses[0]?.answers || {})];
  const tableRowsHtml = responses.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.respondentName)}</strong></td>
      <td style="color:var(--text-muted); font-size:0.78rem;">${escapeHtml(r.timestamp || '')}</td>
      ${Object.values(r.answers).map(val => `<td>${escapeHtml(val)}</td>`).join('')}
    </tr>
  `).join('');

  area.innerHTML = summaryHeaderHtml + chartsHtml + `
    <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin: 20px 0 8px;">📋 回答明細データ一覧表</h4>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>
  `;

  bindSummaryEvents(formId, isOpen);
}

function bindSummaryEvents(formId, currentIsOpen) {
  document.getElementById('btn-toggle-status')?.addEventListener('click', async () => {
    const nextStatus = currentIsOpen ? 'closed' : 'open';
    const res = await updateFormStatus(formId, nextStatus);
    showToast(res.message);
    loadAdminData();
  });

  document.getElementById('btn-download-csv')?.addEventListener('click', () => {
    downloadCSV(formId);
  });
}

function downloadCSV(formId) {
  if (!currentFormResponses || currentFormResponses.length === 0) {
    alert('ダウンロードする回答データがありません。');
    return;
  }

  const targetForm = allForms.find(f => f.id === formId);
  const title = targetForm ? targetForm.title : 'フォーム回答集計';

  const firstAnswers = currentFormResponses[0].answers;
  const answerKeys = Object.keys(firstAnswers);

  const csvRows = [];
  csvRows.push(['回答日時', '回答者名', ...answerKeys].map(escapeCSV).join(','));

  currentFormResponses.forEach(r => {
    const row = [
      r.timestamp || '',
      r.respondentName || '',
      ...answerKeys.map(k => r.answers[k] || '')
    ];
    csvRows.push(row.map(escapeCSV).join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_回収集計_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('CSVファイルをダウンロードしました！');
}

function escapeCSV(str) {
  const s = String(str || '').replace(/"/g, '""');
  return `"${s}"`;
}

async function handleCreateAnnounceSubmit(e) {
  e.preventDefault();
  const category = document.getElementById('announce-category').value;
  const importance = document.getElementById('announce-importance').value;
  const title = document.getElementById('announce-title').value;
  const content = document.getElementById('announce-content').value;

  const res = await createAnnouncement(category, title, content, importance);
  if (res.success) {
    showToast(res.message);
    e.target.reset();
  } else {
    alert(res.message);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
