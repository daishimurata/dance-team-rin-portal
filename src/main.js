import './styles.css';
import { 
  fetchAnnouncements, 
  fetchVenues, 
  fetchForms, 
  sendFormResponse, 
  fetchMyFormResponses 
} from './firebase.js';

let currentFormsData = [];

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadAnnouncementsData();
  loadVenuesData();
  loadFormsData();

  document.getElementById('dynamic-form')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-back-forms')?.addEventListener('click', closeFormArea);
  document.getElementById('btn-search-my-response')?.addEventListener('click', handleSearchMyResponse);
});

// PC(サイドバー) ＆ スマホ(ボトムナビ) の双方向SaaSナビ連動
function setupNavigation() {
  const allNavBtns = document.querySelectorAll('.nav-item, .sidebar-btn');
  
  allNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      allNavBtns.forEach(b => b.classList.remove('active'));

      document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));
      document.getElementById(tabId)?.classList.add('active');
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// 1. 運営からのお知らせ
async function loadAnnouncementsData() {
  const container = document.getElementById('announce-list');
  if (!container) return;

  const list = await fetchAnnouncements();
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; color: var(--text-muted);">現在お知らせはありません。</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    let badgeClass = 'badge-normal';
    if (item.importance === 'high') badgeClass = 'badge-high';
    else if (item.importance === 'medium') badgeClass = 'badge-medium';

    return `
      <article class="card">
        <div class="announce-header">
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="badge ${badgeClass}">${escapeHtml(item.category || 'お知らせ')}</span>
            ${item.importance === 'high' ? '<span class="badge badge-high">重要</span>' : ''}
          </div>
          <span class="announce-date">${escapeHtml(item.date)}</span>
        </div>
        <h3 class="announce-title">${escapeHtml(item.title)}</h3>
        <div class="announce-body">${escapeHtml(item.content)}</div>
      </article>
    `;
  }).join('');
}

// 2. 会場案内
async function loadVenuesData() {
  const container = document.getElementById('venues-list');
  if (!container) return;

  const venues = await fetchVenues();
  if (!venues || venues.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; color: var(--text-muted);">会場情報はありません。</div>';
    return;
  }

  container.innerHTML = venues.map(v => `
    <div class="card">
      <div class="venue-title">
        <span>📍</span> ${escapeHtml(v.name)}
      </div>

      <div class="venue-info-item">
        <div class="venue-info-label">最寄り駅・アクセス</div>
        <div>${escapeHtml(v.access)}</div>
      </div>

      <div class="venue-info-item">
        <div class="venue-info-label">住所</div>
        <div>${escapeHtml(v.address)}</div>
      </div>

      ${v.directions ? `
        <div class="venue-info-item">
          <div class="venue-info-label">駅からの道案内</div>
          <div class="venue-directions">${escapeHtml(v.directions)}</div>
        </div>
      ` : ''}

      ${v.notice ? `
        <div class="venue-notice">
          ⚠️ <strong>利用注意事項:</strong> ${escapeHtml(v.notice)}
        </div>
      ` : ''}

      ${v.mapUrl ? `
        <a href="${escapeHtml(v.mapUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-gold" style="margin-top: 14px;">
          <span>🗺️</span> Googleマップでナビを開く
        </a>
      ` : ''}
    </div>
  `).join('');
}

// 3. フォーム一覧ロード
async function loadFormsData() {
  const container = document.getElementById('forms-list');
  if (!container) return;

  const forms = await fetchForms();
  currentFormsData = forms;

  if (!forms || forms.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; color: var(--text-muted);">現在受付中のフォームはありません。</div>';
    return;
  }

  container.innerHTML = forms.map(f => {
    const isOpen = f.status === 'open';
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span class="badge ${isOpen ? 'badge-high' : 'badge-normal'}">
            ${isOpen ? '受付中' : '受付終了'}
          </span>
          <span style="font-size:0.8rem; color:var(--text-muted);">締切: ${escapeHtml(f.deadline)}</span>
        </div>
        <h3 class="announce-title" style="color:var(--gold-light);">${escapeHtml(f.title)}</h3>
        <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px;">${escapeHtml(f.description)}</p>
        
        ${isOpen ? `
          <button class="btn btn-gold btn-open-form" data-form-id="${f.id}">
            📝 フォームに入力する
          </button>
        ` : `
          <button class="btn btn-secondary" disabled style="opacity:0.6;">
            🔒 回答受付は終了しました
          </button>
        `}
      </div>
    `;
  }).join('');

  document.querySelectorAll('.btn-open-form').forEach(btn => {
    btn.addEventListener('click', () => {
      const fid = btn.getAttribute('data-form-id');
      if (fid) openForm(fid);
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const targetFormId = urlParams.get('form');
  if (targetFormId) {
    const formTabBtn = document.querySelector('[data-tab="tab-forms"]');
    if (formTabBtn) formTabBtn.click();
    openForm(targetFormId);
  }
}

function openForm(formId) {
  const form = currentFormsData.find(f => f.id === formId);
  if (!form) return;

  document.getElementById('forms-list').style.display = 'none';
  const area = document.getElementById('form-render-area');
  area.style.display = 'block';

  document.getElementById('form-id-input').value = form.id;
  document.getElementById('form-title-input').value = form.title;
  document.getElementById('render-form-title').textContent = form.title;
  document.getElementById('render-form-desc').textContent = form.description;

  const fieldsContainer = document.getElementById('form-fields-container');
  fieldsContainer.innerHTML = form.fields.map(field => {
    const reqMark = field.required ? '<span class="required" style="color:var(--gold-primary);">*</span>' : '';
    const helpHtml = field.helpText ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px;">${escapeHtml(field.helpText)}</div>` : '';
    
    if (field.type === 'radio' && field.options) {
      const optionsHtml = field.options.map((opt, idx) => `
        <label class="radio-option">
          <input type="radio" name="${field.id}" value="${escapeHtml(opt)}" ${field.required && idx === 0 ? 'required' : ''}>
          <span>${escapeHtml(opt)}</span>
        </label>
      `).join('');
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <div class="radio-group">${optionsHtml}</div>
        </div>
      `;
    } 
    else if (field.type === 'checkbox' && field.options) {
      const optionsHtml = field.options.map(opt => `
        <label class="radio-option">
          <input type="checkbox" name="${field.id}" value="${escapeHtml(opt)}">
          <span>${escapeHtml(opt)}</span>
        </label>
      `).join('');
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <div class="radio-group">${optionsHtml}</div>
        </div>
      `;
    }
    else if (field.type === 'scale') {
      const min = field.min || 1;
      const max = field.max || 5;
      let scaleBtns = '';
      for (let i = min; i <= max; i++) {
        scaleBtns += `
          <label style="display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer;">
            <input type="radio" name="${field.id}" value="${i}" ${field.required && i === min ? 'required' : ''} style="width:18px; height:18px; accent-color:var(--gold-primary);">
            <span style="font-size:0.85rem; font-weight:700; color:var(--gold-light);">${i}</span>
          </label>
        `;
      }
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(9,12,16,0.6); padding:12px 16px; border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-top:6px;">
            <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(field.minLabel || '低い')}</span>
            <div style="display:flex; gap:16px;">${scaleBtns}</div>
            <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(field.maxLabel || '高い')}</span>
          </div>
        </div>
      `;
    }
    else if (field.type === 'select' && field.options) {
      const optionsHtml = field.options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
      return `
        <div class="form-group">
          <label class="form-label" for="${field.id}">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <select id="${field.id}" name="${field.id}" class="form-select" ${field.required ? 'required' : ''}>
            ${optionsHtml}
          </select>
        </div>
      `;
    } 
    else if (field.type === 'textarea') {
      return `
        <div class="form-group">
          <label class="form-label" for="${field.id}">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <textarea id="${field.id}" name="${field.id}" class="form-textarea" rows="3" ${field.required ? 'required' : ''}></textarea>
        </div>
      `;
    } 
    else {
      return `
        <div class="form-group">
          <label class="form-label" for="${field.id}">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <input type="${field.type || 'text'}" id="${field.id}" name="${field.id}" class="form-input" ${field.required ? 'required' : ''}>
        </div>
      `;
    }
  }).join('');

  area.scrollIntoView({ behavior: 'smooth' });
}

function closeFormArea() {
  document.getElementById('form-render-area').style.display = 'none';
  document.getElementById('forms-list').style.display = 'block';
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('form-submit-btn');
  btn.disabled = true;
  btn.textContent = '送信中...';

  const formId = document.getElementById('form-id-input').value;
  const formTitle = document.getElementById('form-title-input').value;
  const formDataObj = new FormData(e.target);
  const answers = {};
  let respondentName = '未入力';

  for (let [key, value] of formDataObj.entries()) {
    if (key === 'form-id-input' || key === 'form-title-input') continue;

    if (answers[key]) {
      if (Array.isArray(answers[key])) {
        answers[key].push(value);
      } else {
        answers[key] = [answers[key], value];
      }
    } else {
      answers[key] = value;
    }

    if (key === 'name' || key.includes('名前')) {
      respondentName = value;
    }
  }

  Object.keys(answers).forEach(k => {
    if (Array.isArray(answers[k])) {
      answers[k] = answers[k].join(', ');
    }
  });

  const res = await sendFormResponse(formId, formTitle, respondentName, answers);
  btn.disabled = false;
  btn.textContent = '回答を送信する';

  if (res.success) {
    const area = document.getElementById('form-render-area');
    area.innerHTML = `
      <div style="text-align:center; padding:30px 10px;">
        <div style="font-size:48px; margin-bottom:12px; filter: drop-shadow(0 0 10px rgba(212,175,55,0.4));">✨</div>
        <h3 style="font-family: var(--font-family-mincho); font-size:1.35rem; font-weight:700; color:var(--gold-light); margin-bottom:8px;">ご回答ありがとうございました！</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:24px;">「${escapeHtml(formTitle)}」への送信が正常に完了いたしました。</p>
        <button class="btn btn-gold" onclick="location.reload()">
          フォーム一覧へ戻る
        </button>
      </div>
    `;
    showToast(res.message);
  } else {
    alert(res.message);
  }
}

async function handleSearchMyResponse() {
  const nameInput = document.getElementById('my-name-input');
  const resultsDiv = document.getElementById('my-response-results');
  const name = nameInput.value.trim();

  if (!name) {
    alert('確認したいお名前を入力してください');
    return;
  }

  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted);">検索中...</div>';

  const myResponses = await fetchMyFormResponses(name);

  if (!myResponses || myResponses.length === 0) {
    resultsDiv.innerHTML = '<div style="font-size:0.82rem; color:var(--text-muted); margin-top:6px;">「' + escapeHtml(name) + '」様の過去回答履歴は見つかりませんでした。</div>';
    return;
  }

  resultsDiv.innerHTML = myResponses.map(r => `
    <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; margin-top:8px; font-size:0.85rem; border-left:3px solid var(--gold-primary);">
      <div style="font-weight:700; color:var(--gold-light);">${escapeHtml(r.formTitle)}</div>
      <div style="font-size:0.75rem; color:var(--text-muted);">回答日時: ${escapeHtml(r.timestamp || r.createdAt)}</div>
      <div style="margin-top:6px;">
        ${Object.entries(r.answers).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`).join('')}
      </div>
    </div>
  `).join('');
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
