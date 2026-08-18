import './styles.css';
import { 
  fetchForms, 
  createNewForm, 
  fetchAllFormResponses, 
  createAnnouncement 
} from './firebase.js';

let createdFields = [];
let allForms = [];

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

  // セッションキャッシュチェック
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

// 2. ナビゲーション切り替え
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

// トースト通知
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// 初期ロード
async function loadAdminData() {
  allForms = await fetchForms();
  renderFormSelectOptions();
  if (allForms.length > 0) {
    loadFormResponsesSummary(allForms[0].id);
  }
}

// ----------------------------------------------------
// 3. フォーム発行エディタ (Form Builder)
// ----------------------------------------------------
function initFormBuilder() {
  createdFields = [
    { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', options: '', required: true },
    { id: 'attendance', label: '出欠区分', type: 'radio', options: '参加, 遅刻参加, 早退, 欠席', required: true }
  ];
  renderFieldItems();

  document.getElementById('btn-add-field')?.addEventListener('click', () => {
    const newIdx = createdFields.length + 1;
    createdFields.push({
      id: 'field_' + Date.now(),
      label: '設問' + newIdx,
      type: 'text',
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
    <div class="card" style="background: rgba(13, 17, 23, 0.7); margin-bottom: 12px; border-left: 3px solid var(--accent-gold);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:700; font-size:0.85rem; color:var(--accent-gold);">設問 #${idx + 1}</span>
        ${createdFields.length > 1 ? `<button type="button" class="btn btn-secondary btn-del-field" data-idx="${idx}" style="padding:2px 8px; font-size:0.75rem; width:auto; color:#ff6b6b; border-color:rgba(230,57,70,0.3);">削除</button>` : ''}
      </div>

      <div class="form-group" style="margin-bottom:10px;">
        <label class="form-label" style="font-size:0.8rem;">項目ラベル（設問テキスト）</label>
        <input type="text" class="form-input field-label-input" data-idx="${idx}" value="${escapeHtml(f.label)}" required>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:10px;">
        <div style="flex:1;">
          <label class="form-label" style="font-size:0.8rem;">入力形式</label>
          <select class="form-select field-type-select" data-idx="${idx}">
            <option value="text" ${f.type === 'text' ? 'selected' : ''}>1行テキスト</option>
            <option value="radio" ${f.type === 'radio' ? 'selected' : ''}>単一選択（ラジオボタン）</option>
            <option value="select" ${f.type === 'select' ? 'selected' : ''}>ドロップダウン選択</option>
            <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>複数行本文テキスト</option>
            <option value="number" ${f.type === 'number' ? 'selected' : ''}>数値入力</option>
          </select>
        </div>

        <div style="display:flex; align-items:flex-end; padding-bottom:8px;">
          <label style="font-size:0.82rem; display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" class="field-req-check" data-idx="${idx}" ${f.required ? 'checked' : ''}>
            <span>必須項目</span>
          </label>
        </div>
      </div>

      ${(f.type === 'radio' || f.type === 'select') ? `
        <div class="form-group" style="margin-bottom:4px;">
          <label class="form-label" style="font-size:0.8rem;">選択肢リスト（カンマ区切り）</label>
          <input type="text" class="form-input field-options-input" data-idx="${idx}" value="${escapeHtml(f.options)}" placeholder="例: 参加, 遅刻参加, 早退, 欠席">
        </div>
      ` : ''}
    </div>
  `).join('');

  // イベントバインド
  container.querySelectorAll('.field-label-input').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-idx');
      createdFields[idx].label = e.target.value;
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

// フォーム発行送信ハンドラ
async function handleCreateFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('new-form-title').value;
  const desc = document.getElementById('new-form-desc').value;
  const deadline = document.getElementById('new-form-deadline').value || '未設定';

  const processedFields = createdFields.map(f => {
    const item = { id: f.id, label: f.label, type: f.type, required: f.required };
    if (f.type === 'radio' || f.type === 'select') {
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
// 4. 回収データ・集計ダッシュボード
// ----------------------------------------------------
function renderFormSelectOptions() {
  const select = document.getElementById('select-admin-form');
  if (!select) return;

  if (!allForms || allForms.length === 0) {
    select.innerHTML = '<option value="">発行済みフォームはありません</option>';
    return;
  }

  select.innerHTML = allForms.map(f => `
    <option value="${f.id}">${escapeHtml(f.title)} (締切: ${escapeHtml(f.deadline)})</option>
  `).join('');
}

function handleSelectAdminFormChange(e) {
  const formId = e.target.value;
  if (formId) {
    loadFormResponsesSummary(formId);
  }
}

async function loadFormResponsesSummary(formId) {
  const area = document.getElementById('responses-summary-area');
  if (!area) return;

  const responses = await fetchAllFormResponses(formId);
  const targetForm = allForms.find(f => f.id === formId);

  if (!responses || responses.length === 0) {
    area.innerHTML = '<div style="color:var(--text-muted); padding:14px 0;">まだ回収された回答はありません。</div>';
    return;
  }

  // 1. 集計データ計算 (集計サマリー)
  let summaryHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px 16px; border-radius:8px; margin-bottom:16px;">
      <div>総回収件数: <strong style="font-size:1.2rem; color:var(--accent-gold);">${responses.length} 件</strong></div>
      <div style="font-size:0.8rem; color:var(--text-muted);">最終回答: ${responses[responses.length - 1].timestamp || '直近'}</div>
    </div>
  `;

  // 2. テーブル（全メンバーの回収データ一覧）
  const headers = ['回答者', '回答日時', ...Object.keys(responses[0]?.answers || {})];

  const tableRowsHtml = responses.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.respondentName)}</strong></td>
      <td style="color:var(--text-muted); font-size:0.78rem;">${escapeHtml(r.timestamp || '')}</td>
      ${Object.values(r.answers).map(val => `<td>${escapeHtml(val)}</td>`).join('')}
    </tr>
  `).join('');

  area.innerHTML = summaryHtml + `
    <h3 style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-bottom:8px;">メンバー全員の回収回答一覧</h3>
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
}

// ----------------------------------------------------
// 5. 運営連絡・お知らせ発行
// ----------------------------------------------------
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
