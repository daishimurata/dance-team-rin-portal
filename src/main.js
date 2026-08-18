import './styles.css';
import { 
  fetchAnnouncements, 
  fetchVenues, 
  fetchForms, 
  sendFormResponse, 
  fetchBoardPosts, 
  saveBoardPost 
} from './firebase.js';

let currentFormsData = [];

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadAnnouncementsData();
  loadVenuesData();
  loadFormsData();
  loadBoardData();

  // フォームイベント登録
  document.getElementById('dynamic-form')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('board-form')?.addEventListener('submit', handleBoardSubmit);
  document.getElementById('btn-back-forms')?.addEventListener('click', closeFormArea);
});

// ナビゲーション設定
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      navBtns.forEach(b => b.classList.remove('active'));

      document.getElementById(tabId)?.classList.add('active');
      btn.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// トースト通知
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// 1. お知らせ一覧ロード
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

// 2. 会場案内ロード
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
        <a href="${escapeHtml(v.mapUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="margin-top: 14px;">
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

  container.innerHTML = forms.map(f => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="badge ${f.status === 'open' ? 'badge-high' : 'badge-normal'}">
          ${f.status === 'open' ? '受付中' : '終了'}
        </span>
        <span style="font-size:0.8rem; color:var(--text-muted);">締切: ${escapeHtml(f.deadline)}</span>
      </div>
      <h3 class="announce-title">${escapeHtml(f.title)}</h3>
      <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px;">${escapeHtml(f.description)}</p>
      <button class="btn btn-gold btn-open-form" data-form-id="${f.id}">
        📝 フォームに入力する
      </button>
    </div>
  `).join('');

  document.querySelectorAll('.btn-open-form').forEach(btn => {
    btn.addEventListener('click', () => {
      const fid = btn.getAttribute('data-form-id');
      if (fid) openForm(fid);
    });
  });
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
    const reqMark = field.required ? '<span class="required">*</span>' : '';
    
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
          <div class="radio-group">${optionsHtml}</div>
        </div>
      `;
    } else if (field.type === 'select' && field.options) {
      const optionsHtml = field.options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
      return `
        <div class="form-group">
          <label class="form-label" for="${field.id}">${escapeHtml(field.label)}${reqMark}</label>
          <select id="${field.id}" name="${field.id}" class="form-select" ${field.required ? 'required' : ''}>
            ${optionsHtml}
          </select>
        </div>
      `;
    } else if (field.type === 'textarea') {
      return `
        <div class="form-group">
          <label class="form-label" for="${field.id}">${escapeHtml(field.label)}${reqMark}</label>
          <textarea id="${field.id}" name="${field.id}" class="form-textarea" rows="3" ${field.required ? 'required' : ''}></textarea>
        </div>
      `;
    } else {
      return `
        <div class="form-group">
          <label class="form-label" for="${field.id}">${escapeHtml(field.label)}${reqMark}</label>
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
    answers[key] = value;
    if (key === 'name' || key.includes('名前')) {
      respondentName = value;
    }
  }

  const res = await sendFormResponse(formId, formTitle, respondentName, answers);
  btn.disabled = false;
  btn.textContent = '回答を送信する';

  if (res.success) {
    showToast(res.message);
    closeFormArea();
    e.target.reset();
  } else {
    alert(res.message);
  }
}

// 4. 掲示板データロード
async function loadBoardData() {
  const container = document.getElementById('board-list-container');
  if (!container) return;

  const posts = await fetchBoardPosts();
  if (!posts || posts.length === 0) {
    container.innerHTML = '<div style="text-align:center; color: var(--text-muted); padding: 10px 0;">投稿はまだありません。最初のメッセージを投稿してみましょう！</div>';
    return;
  }

  container.innerHTML = posts.map(p => `
    <div class="board-item">
      <div class="board-meta">
        <span class="board-author">👤 ${escapeHtml(p.author)}</span>
        <span>${escapeHtml(p.date)}</span>
      </div>
      <div class="board-msg">${escapeHtml(p.message)}</div>
    </div>
  `).join('');
}

async function handleBoardSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('board-submit-btn');
  const author = document.getElementById('board-author').value;
  const msg = document.getElementById('board-message').value;

  if (!author || !msg) {
    alert('お名前とメッセージを入力してください。');
    return;
  }

  btn.disabled = true;
  btn.textContent = '送信中...';

  const res = await saveBoardPost(author, msg);
  btn.disabled = false;
  btn.textContent = '投稿する';

  if (res.success) {
    showToast(res.message);
    document.getElementById('board-message').value = '';
    loadBoardData();
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
