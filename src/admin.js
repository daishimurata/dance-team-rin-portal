import './styles.css';
import { 
  fetchForms, 
  createNewForm, 
  updateFormStatus,
  fetchAllFormResponses, 
  createAnnouncement,
  fetchInvoices,
  createNewInvoice,
  updateInvoiceStatus,
  deleteInvoice
} from './firebase.js';

let createdFields = [];
let allForms = [];
let currentFormResponses = [];
let currentFormId = null;

let invoiceItems = [];
let allInvoices = [];

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupAdminNav();
  initFormBuilder();
  initInvoiceForm();

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
    const rawPass = document.getElementById('auth-pass').value || '';
    const pass = rawPass.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).trim();
    if (pass === '0713' || pass === '713' || pass === 'rin2026' || pass === 'admin') {
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
  loadInvoicesData();
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

// ----------------------------------------------------
// 4. 請求書発行・印刷・管理モジュール (Invoice Generator)
// ----------------------------------------------------
function initInvoiceForm() {
  const invNoInput = document.getElementById('inv-no');
  const issueDateInput = document.getElementById('inv-issue-date');
  const dueDateInput = document.getElementById('inv-due-date');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const defaultIssueDate = `${yyyy}-${mm}-${dd}`;
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 14);
  const fyyyy = futureDate.getFullYear();
  const fmm = String(futureDate.getMonth() + 1).padStart(2, '0');
  const fdd = String(futureDate.getDate()).padStart(2, '0');
  const defaultDueDate = `${fyyyy}-${fmm}-${fdd}`;

  if (issueDateInput) issueDateInput.value = defaultIssueDate;
  if (dueDateInput) dueDateInput.value = defaultDueDate;
  if (invNoInput) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    invNoInput.value = `RIN-${yyyy}${mm}${dd}-${randomNum}`;
  }

  // デフォルトの明細行項目
  invoiceItems = [
    { name: 'にっぽんど真ん中祭り 演舞遠征・参加分担金', qty: 1, unit: '人', price: 15000 },
    { name: '凛 公式よさこい演舞衣装一式', qty: 1, unit: '着', price: 28000 }
  ];

  renderInvoiceItemsTable();

  // イベント登録
  document.getElementById('inv-doc-type')?.addEventListener('change', (e) => {
    const dueDateInput = document.getElementById('inv-due-date');
    const dueDateLabel = document.getElementById('inv-due-date-label');
    if (e.target.value === 'estimate') {
      if (dueDateLabel) dueDateLabel.innerHTML = '有効期限 <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(任意)</span>';
      if (dueDateInput) dueDateInput.value = '';
    } else {
      if (dueDateLabel) dueDateLabel.innerHTML = 'お支払期限 <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(任意)</span>';
    }
  });

  document.getElementById('btn-add-item-row')?.addEventListener('click', () => {
    invoiceItems.push({ name: '', qty: 1, unit: '件', price: 0 });
    renderInvoiceItemsTable();
  });

  document.getElementById('inv-tax-rate')?.addEventListener('change', calculateInvoiceTotals);
  document.getElementById('create-invoice-form')?.addEventListener('submit', handleCreateInvoiceSubmit);
  document.getElementById('btn-save-inv')?.addEventListener('click', handleCreateInvoiceSubmit);

  document.getElementById('btn-preview-inv')?.addEventListener('click', () => {
    const data = getInvoiceFormData();
    if (!data.toName) {
      alert('宛名を入力してください。');
      return;
    }
    openInvoicePreviewModal(data);
  });

  document.getElementById('btn-close-inv-modal')?.addEventListener('click', () => {
    document.getElementById('invoice-preview-modal').style.display = 'none';
  });

  document.getElementById('btn-print-invoice')?.addEventListener('click', () => {
    window.print();
  });
}

function renderInvoiceItemsTable() {
  const tbody = document.getElementById('invoice-items-tbody');
  if (!tbody) return;

  tbody.innerHTML = invoiceItems.map((item, idx) => `
    <tr>
      <td>
        <input type="text" class="form-input inv-item-name" data-idx="${idx}" value="${escapeHtml(item.name)}" placeholder="項目名 (例: 大会参加費)" required style="padding:6px 10px; font-size:0.85rem;">
      </td>
      <td>
        <input type="number" class="form-input inv-item-qty" data-idx="${idx}" value="${item.qty}" min="1" required style="padding:6px 10px; font-size:0.85rem; text-align:right;">
      </td>
      <td>
        <input type="text" class="form-input inv-item-unit" data-idx="${idx}" value="${escapeHtml(item.unit)}" placeholder="単位" style="padding:6px 10px; font-size:0.85rem; text-align:center;">
      </td>
      <td>
        <input type="number" class="form-input inv-item-price" data-idx="${idx}" value="${item.price}" min="0" step="100" required style="padding:6px 10px; font-size:0.85rem; text-align:right;">
      </td>
      <td style="text-align:center;">
        ${invoiceItems.length > 1 ? `
          <button type="button" class="btn btn-secondary btn-del-inv-row" data-idx="${idx}" style="padding:4px 8px; font-size:0.75rem; width:auto; color:#dc2626; border-color:#fca5a5;">
            削除
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.inv-item-name').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      invoiceItems[idx].name = e.target.value;
    });
  });

  tbody.querySelectorAll('.inv-item-qty').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      invoiceItems[idx].qty = parseFloat(e.target.value) || 0;
      calculateInvoiceTotals();
    });
  });

  tbody.querySelectorAll('.inv-item-unit').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      invoiceItems[idx].unit = e.target.value;
    });
  });

  tbody.querySelectorAll('.inv-item-price').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      invoiceItems[idx].price = parseFloat(e.target.value) || 0;
      calculateInvoiceTotals();
    });
  });

  tbody.querySelectorAll('.btn-del-inv-row').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      invoiceItems.splice(idx, 1);
      renderInvoiceItemsTable();
    });
  });

  calculateInvoiceTotals();
}

function calculateInvoiceTotals() {
  let subtotal = 0;
  invoiceItems.forEach(item => {
    subtotal += (item.qty || 0) * (item.price || 0);
  });

  const taxRate = parseFloat(document.getElementById('inv-tax-rate')?.value || '0.10');
  const tax = Math.floor(subtotal * taxRate);
  const total = subtotal + tax;

  const subtotalEl = document.getElementById('calc-subtotal');
  const taxEl = document.getElementById('calc-tax');
  const totalEl = document.getElementById('calc-total');

  if (subtotalEl) subtotalEl.textContent = `￥${subtotal.toLocaleString()}`;
  if (taxEl) taxEl.textContent = `￥${tax.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `￥${total.toLocaleString()}`;

  return { subtotal, taxRate, tax, total };
}

function getInvoiceFormData() {
  const totals = calculateInvoiceTotals();
  return {
    docType: document.getElementById('inv-doc-type')?.value || 'invoice',
    invNo: document.getElementById('inv-no').value,
    toName: document.getElementById('inv-to-name').value,
    issueDate: document.getElementById('inv-issue-date').value,
    dueDate: document.getElementById('inv-due-date').value,
    fromName: document.getElementById('inv-from-name').value,
    bankName: document.getElementById('inv-bank-name').value,
    bankAccount: document.getElementById('inv-bank-account').value,
    bankHolder: document.getElementById('inv-bank-holder').value,
    notes: document.getElementById('inv-notes').value,
    items: invoiceItems,
    subtotal: totals.subtotal,
    taxRate: totals.taxRate,
    tax: totals.tax,
    total: totals.total,
    status: 'unpaid'
  };
}

async function handleCreateInvoiceSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const invoiceData = getInvoiceFormData();
  if (!invoiceData.toName || !invoiceData.toName.trim()) {
    alert('宛名（請求先/見積先）を入力してください。');
    return;
  }

  const res = await createNewInvoice(invoiceData);
  if (res.success) {
    showToast(res.message);
    initInvoiceForm();
    loadInvoicesData();
    openInvoicePreviewModal(invoiceData);
  } else {
    alert(res.message);
  }
}

async function loadInvoicesData() {
  const container = document.getElementById('invoices-list-area');
  if (!container) return;

  allInvoices = await fetchInvoices();
  renderInvoicesList(allInvoices);
}

function renderInvoicesList(invoices) {
  const container = document.getElementById('invoices-list-area');
  if (!container) return;

  if (!invoices || invoices.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); padding:20px 0; text-align:center;">まだ発行された伝票データはありません。</div>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>種別 / 伝票番号</th>
            <th>宛名（請求先/見積先）</th>
            <th>発行日 / お支払期限</th>
            <th style="text-align:right;">合計金額（税込）</th>
            <th style="text-align:center;">ステータス</th>
            <th style="text-align:center;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map(inv => {
            const isEst = inv.docType === 'estimate';
            return `
              <tr>
                <td>
                  <span style="font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:700; background:${isEst ? '#e0f2fe; color:#0369a1;' : '#fef3c7; color:#92400e;'}">
                    ${isEst ? '見積書' : '請求書'}
                  </span>
                  <strong style="font-family: monospace; font-size:0.88rem; margin-left:4px;">${escapeHtml(inv.invNo)}</strong>
                </td>
                <td><strong>${escapeHtml(inv.toName)}</strong></td>
                <td style="font-size:0.8rem; color:var(--text-muted);">
                  ${escapeHtml(inv.issueDate)} ～ <strong style="color:var(--domatsuri-navy);">${escapeHtml(inv.dueDate)}</strong>
                </td>
                <td style="text-align:right; font-weight:700; color:#0f172a; font-size:1.05rem;">
                  ￥${(inv.total || 0).toLocaleString()}
                </td>
                <td style="text-align:center;">
                  ${inv.status === 'paid' 
                    ? '<span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.78rem;">🟢 完了/入金済</span>' 
                    : '<span style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.78rem;">🔴 未完了</span>'}
                </td>
                <td style="text-align:center;">
                  <div style="display:flex; gap:6px; justify-content:center;">
                    <button type="button" class="btn btn-secondary btn-view-inv" data-id="${inv.id}" style="padding:3px 8px; font-size:0.75rem; width:auto;">
                      👁️ プレビュー
                    </button>
                    <button type="button" class="btn btn-secondary btn-toggle-inv-status" data-id="${inv.id}" data-status="${inv.status}" style="padding:3px 8px; font-size:0.75rem; width:auto;">
                      ${inv.status === 'paid' ? '未済に戻す' : '済にする'}
                    </button>
                    <button type="button" class="btn btn-secondary btn-del-inv" data-id="${inv.id}" style="padding:3px 8px; font-size:0.75rem; width:auto; color:#dc2626; border-color:#fca5a5;">
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.btn-view-inv').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const inv = allInvoices.find(item => item.id === id);
      if (inv) openInvoicePreviewModal(inv);
    });
  });

  container.querySelectorAll('.btn-toggle-inv-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const currentStatus = e.target.getAttribute('data-status');
      const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      const res = await updateInvoiceStatus(id, nextStatus);
      showToast(res.message);
      loadInvoicesData();
    });
  });

  container.querySelectorAll('.btn-del-inv').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('この伝票レコードを削除して宜しいですか？')) return;
      const id = e.target.getAttribute('data-id');
      const res = await deleteInvoice(id);
      showToast(res.message);
      loadInvoicesData();
    });
  });
}

function openInvoicePreviewModal(invData) {
  const paper = document.getElementById('printable-invoice-paper');
  if (!paper) return;

  paper.innerHTML = renderInvoicePaperHtml(invData);
  document.getElementById('invoice-preview-modal').style.display = 'flex';
}

function renderInvoicePaperHtml(data) {
  const taxPct = Math.round((data.taxRate || 0.10) * 100);
  const isEstimate = data.docType === 'estimate';

  const titleText = isEstimate ? '御 見 積 書' : '御 請 求 書';
  const subTitleText = isEstimate ? '見積明細書' : '請求明細書';
  const noLabel = isEstimate ? '見積番号' : '請求番号';
  const totalBoxLabel = isEstimate ? 'お見積金額（税込）' : 'ご請求金額（税込）';
  const leadText = isEstimate ? '下記の通り、お見積申し上げます。' : '下記の通り、ご請求申し上げます。';
  const dateLabel = isEstimate ? '有効期限' : 'お支払期限';
  const dueDateHtml = data.dueDate 
    ? `<div style="margin-top:4px; font-weight:700; color:var(--domatsuri-navy);">${dateLabel}: ${escapeHtml(data.dueDate)}</div>` 
    : '';

  return `
    <div class="inv-paper-header">
      <div>
        <div class="inv-paper-title">${titleText}</div>
        <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">${subTitleText}</div>
      </div>
      <div class="inv-paper-meta">
        <div>${noLabel}: <strong>${escapeHtml(data.invNo)}</strong></div>
        <div>発行年月日: ${escapeHtml(data.issueDate)}</div>
        ${dueDateHtml}
      </div>
    </div>

    <div class="inv-paper-to-from">
      <div class="inv-paper-to">
        <div class="inv-paper-to-name">${escapeHtml(data.toName)}</div>
        <div style="font-size:0.85rem; color:#475569; margin-top:8px;">
          ${leadText}
        </div>
      </div>

      <div class="inv-paper-from">
        <div style="font-weight:700; font-size:1.1rem; color:var(--domatsuri-navy);">${escapeHtml(data.fromName)}</div>
        <div>〒510-0256 三重県鈴鹿市磯山1-14-12</div>
        <div>TEL: 080-5155-2602</div>
      </div>
    </div>

    <div class="inv-paper-total-box">
      <div class="inv-paper-total-label">${totalBoxLabel}</div>
      <div class="inv-paper-total-val">￥${(data.total || 0).toLocaleString()} -</div>
    </div>

    <table class="inv-paper-table">
      <thead>
        <tr>
          <th style="text-align:left;">品名・明細内容</th>
          <th style="width:12%; text-align:center;">数量</th>
          <th style="width:12%; text-align:center;">単位</th>
          <th style="width:20%; text-align:right;">単価 (円)</th>
          <th style="width:22%; text-align:right;">金額 (円)</th>
        </tr>
      </thead>
      <tbody>
        ${(data.items || []).map(item => {
          const rowTotal = (item.qty || 0) * (item.price || 0);
          return `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td style="text-align:center;">${item.qty}</td>
              <td style="text-align:center;">${escapeHtml(item.unit || '')}</td>
              <td style="text-align:right;">￥${(item.price || 0).toLocaleString()}</td>
              <td style="text-align:right; font-weight:700;">￥${rowTotal.toLocaleString()}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div style="display:flex; justify-content:flex-end; margin-bottom:24px;">
      <div style="width:260px; font-size:0.88rem; line-height:1.8;">
        <div style="display:flex; justify-content:space-between;">
          <span>小計（税抜）:</span>
          <strong>￥${(data.subtotal || 0).toLocaleString()}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; color:#64748b;">
          <span>消費税 (${taxPct}%):</span>
          <strong>￥${(data.tax || 0).toLocaleString()}</strong>
        </div>
        <hr style="border-color:#cbd5e1; margin:6px 0;">
        <div style="display:flex; justify-content:space-between; font-size:1rem; font-weight:700; color:var(--domatsuri-navy);">
          <span>合計（税込）:</span>
          <span style="color:#0f172a;">￥${(data.total || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div class="inv-paper-footer-info">
      <div>
        <div style="font-weight:700; color:var(--domatsuri-navy); margin-bottom:4px;">【お振込先口座】</div>
        <div>銀行名: ${escapeHtml(data.bankName)}</div>
        <div>口座番号: ${escapeHtml(data.bankAccount)}</div>
        <div>口座名義: ${escapeHtml(data.bankHolder)}</div>
      </div>
      <div>
        <div style="font-weight:700; color:var(--domatsuri-navy); margin-bottom:4px;">【備考】</div>
        <div>${escapeHtml(data.notes || 'お振込手数料はお客様負担にてお願い申し上げます。')}</div>
      </div>
    </div>
  `;
}

