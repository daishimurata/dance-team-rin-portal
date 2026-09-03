import './styles.css';
import {
  fetchAnnouncements,
  fetchVenues,
  fetchForms,
  sendFormResponse,
  fetchMyFormResponses,
  fetchPracticeSchedules,
  savePracticeSchedule,
  deletePracticeSchedule
} from './firebase.js';

let currentFormsData = [];

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupDrawerMenu();
  loadAnnouncementsData();
  loadVenuesData();
  loadFormsData();
  initMainCountdown();
  setupChecklist();
  setupPracticeScheduleFeature();

  document.getElementById('dynamic-form')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-back-forms')?.addEventListener('click', closeFormArea);
  document.getElementById('btn-search-my-response')?.addEventListener('click', handleSearchMyResponse);
});

function setupChecklist() {
  document.querySelectorAll('.domatsuri-checklist-item input').forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.checked) {
        e.target.parentNode.classList.add('checked');
      } else {
        e.target.parentNode.classList.remove('checked');
      }
    });
  });
}

function initMainCountdown() {
  const targetRin = new Date('2026-09-05T10:20:00+09:00').getTime(); // 9/5 10:20 弁天山公園
  const targetJr = new Date('2026-09-05T12:10:00+09:00').getTime();  // 9/5 12:10 弁天山公園
  const targetKids = new Date('2026-09-05T11:35:00+09:00').getTime(); // 9/5 11:35 鈴鹿ハンター

  function updateTeam(targetTime, prefix) {
    const now = new Date().getTime();
    const diff = targetTime - now;

    const daysEl = document.getElementById(prefix + '-days');
    const hoursEl = document.getElementById(prefix + '-hours');
    const minsEl = document.getElementById(prefix + '-mins');
    const secsEl = document.getElementById(prefix + '-secs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    if (diff <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(mins).padStart(2, '0');
    secsEl.textContent = String(secs).padStart(2, '0');
  }

  function updateAll() {
    updateTeam(targetRin, 'cd-rin');
    updateTeam(targetJr, 'cd-jr');
    updateTeam(targetKids, 'cd-kids');
  }

  updateAll();
  setInterval(updateAll, 1000);
}

function setupNavigation() {
  const allNavBtns = document.querySelectorAll('.sidebar-btn, .drawer-item-btn[data-tab]');

  allNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;

      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      allNavBtns.forEach(b => b.classList.remove('active'));

      document.querySelectorAll('[data-tab="' + tabId + '"]').forEach(b => b.classList.add('active'));
      document.getElementById(tabId)?.classList.add('active');

      closeDrawer();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function setupDrawerMenu() {
  const hamburgerBtn = document.getElementById('btn-hamburger');
  const closeBtn = document.getElementById('btn-drawer-close');
  const overlay = document.getElementById('drawer-overlay');

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openDrawer);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrawer);
  }
  if (overlay) {
    overlay.addEventListener('click', closeDrawer);
  }
}

function openDrawer() {
  document.getElementById('drawer-menu')?.classList.add('active');
  document.getElementById('drawer-overlay')?.classList.add('active');
}

function closeDrawer() {
  document.getElementById('drawer-menu')?.classList.remove('active');
  document.getElementById('drawer-overlay')?.classList.remove('active');
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

async function loadAnnouncementsData() {
  const container = document.getElementById('announce-list');
  if (!container) return;

  const list = await fetchAnnouncements();
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; color: var(--text-muted);">現在連絡事項はありません。</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    let badgeClass = 'badge-normal';
    if (item.importance === 'high') badgeClass = 'badge-high';
    else if (item.importance === 'medium') badgeClass = 'badge-medium';

    return (
      '<article class="card">' +
      '<div class="announce-header">' +
      '<div style="display:flex; gap:6px; align-items:center;">' +
      '<span class="badge ' + badgeClass + '">' + escapeHtml(item.category || '連絡事項') + '</span>' +
      (item.importance === 'high' ? '<span class="badge badge-high">重要</span>' : '') +
      '</div>' +
      '<span class="announce-date" style="font-size:0.8rem; color:var(--text-muted);">' + escapeHtml(item.date) + '</span>' +
      '</div>' +
      '<h3 class="announce-title">' + escapeHtml(item.title) + '</h3>' +
      '<div class="announce-body" style="margin-bottom:12px;">' + escapeHtml(item.content) + '</div>' +
      (item.linkUrl ? '<a href="' + escapeHtml(item.linkUrl) + '" class="btn btn-gold" style="margin-top:10px; font-size:0.9rem;">' + escapeHtml(item.linkText || '関連ページを開く') + '</a>' : '') +
      '</article>'
    );
  }).join('');
}

async function loadVenuesData() {
  const container = document.getElementById('venues-list');
  if (!container) return;

  const pastEvents = [
    {
      id: 'domatsuri2026',
      title: '第28回 にっぽんど真ん中祭り（どまつり）2026',
      date: '📅 開催日: 2026年8月28日(金) 〜 8月30日(日)',
      badge: '演舞 ＆ サポートアーカイブ',
      open: true,
      children: [
        {
          title: '📄 どまつり総合ポータル（演舞スケジュール ＆ サポートシフト統合）',
          url: '/domatsuri.html',
          desc: '演舞スケジュールとサポートシフト表をタブ切替で一括確認'
        },
        {
          title: '📅 演舞スケジュール詳細・会場ナビ',
          url: '/schedule.html',
          desc: '全3日間の演舞時間、移動ルート、会場Google Mapリンク'
        },
        {
          title: '🤝 サポートスタッフ・補助凛 シフト表',
          url: '/support.html',
          desc: '16名のサポートメンバー会場別シフト＆個人シフト照会'
        },
        {
          title: '📱 スマホ持ち歩き用 演舞スケジュール (PDF)',
          url: '/pdf_template_mobile.html',
          desc: 'スマホ画面に最適化された軽量表示＆印刷テンプレート'
        },
        {
          title: '🖨️ A4印刷用 演舞スケジュール一覧 (PDF)',
          url: '/pdf_template_a4.html',
          desc: 'A4用紙1枚で綺麗に印刷できるオフィシャルスケジュール'
        }
      ]
    }
  ];

  const html = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 1.2rem; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
        📂 過去のイベント・演舞アーカイブ
      </h3>
      <p style="font-size: 0.85rem; color: #cbd5e1;">
        過去に参加したお祭り・演舞イベントのスケジュールやサポートシフトの記録アーカイブです。イベント名をクリックしてツリーを展開できます。
      </p>
    </div>
    <div class="past-events-tree-container">
      ${pastEvents.map(event => `
        <div class="tree-card ${event.open ? 'open' : ''}" id="tree-card-${event.id}">
          <div class="tree-card-header" onclick="toggleTreeCard('${event.id}')">
            <div>
              <div class="tree-card-title">
                <span class="badge" style="background: #0f1b29; color: #fef08a; border: 1px solid #d4af37;">${escapeHtml(event.badge)}</span>
                ${escapeHtml(event.title)}
              </div>
              <div class="tree-card-date">${escapeHtml(event.date)}</div>
            </div>
            <div class="tree-toggle-icon">▼</div>
          </div>
          <div class="tree-card-body">
            <div style="font-size: 0.85rem; color: #475569; font-weight: 700; margin-bottom: 10px;">
              📁 関連ページ・コンテンツ（クリックして開く）:
            </div>
            <ul class="tree-list">
              ${event.children.map(child => `
                <li class="tree-item">
                  <a href="${child.url}" class="tree-link">
                    <span style="font-weight: 700;">${escapeHtml(child.title)}</span>
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

window.toggleTreeCard = function(id) {
  const card = document.getElementById('tree-card-' + id);
  if (card) {
    card.classList.toggle('open');
  }
}

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
    return (
      '<div class="card">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
      '<span class="badge ' + (isOpen ? 'badge-high' : 'badge-normal') + '">' +
      (isOpen ? '受付中' : '受付終了') +
      '</span>' +
      '<span style="font-size:0.8rem; color:var(--text-muted);">締切: ' + escapeHtml(f.deadline) + '</span>' +
      '</div>' +
      '<h3 class="announce-title">' + escapeHtml(f.title) + '</h3>' +
      '<p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:14px;">' + escapeHtml(f.description) + '</p>' +
      (isOpen ? '<button class="btn btn-gold btn-open-form" data-form-id="' + f.id + '">フォームに入力する</button>' : '<button class="btn btn-secondary" disabled style="opacity:0.6;">回答受付は終了しました</button>') +
      '</div>'
    );
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
    const reqMark = field.required ? '<span class="required" style="color:#dc2626;">*</span>' : '';
    const helpHtml = field.helpText ? '<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px;">' + escapeHtml(field.helpText) + '</div>' : '';

    if (field.type === 'radio' && field.options) {
      const optionsHtml = field.options.map((opt, idx) => (
        '<label class="radio-option">' +
        '<input type="radio" name="' + field.id + '" value="' + escapeHtml(opt) + '" ' + (field.required && idx === 0 ? 'required' : '') + '>' +
        '<span>' + escapeHtml(opt) + '</span>' +
        '</label>'
      )).join('');
      return (
        '<div class="form-group">' +
        '<label class="form-label">' + escapeHtml(field.label) + reqMark + '</label>' +
        helpHtml +
        '<div class="radio-group">' + optionsHtml + '</div>' +
        '</div>'
      );
    }
    else if (field.type === 'checkbox' && field.options) {
      const optionsHtml = field.options.map(opt => (
        '<label class="radio-option">' +
        '<input type="checkbox" name="' + field.id + '" value="' + escapeHtml(opt) + '">' +
        '<span>' + escapeHtml(opt) + '</span>' +
        '</label>'
      )).join('');
      return (
        '<div class="form-group">' +
        '<label class="form-label">' + escapeHtml(field.label) + reqMark + '</label>' +
        helpHtml +
        '<div class="radio-group">' + optionsHtml + '</div>' +
        '</div>'
      );
    }
    else if (field.type === 'scale') {
      const min = field.min || 1;
      const max = field.max || 5;
      let scaleBtns = '';
      for (let i = min; i <= max; i++) {
        scaleBtns += (
          '<label style="display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer;">' +
          '<input type="radio" name="' + field.id + '" value="' + i + '" ' + (field.required && i === min ? 'required' : '') + ' style="width:18px; height:18px; accent-color:var(--gold-primary);">' +
          '<span style="font-size:0.85rem; font-weight:700;">' + i + '</span>' +
          '</label>'
        );
      }
      return (
        '<div class="form-group">' +
        '<label class="form-label">' + escapeHtml(field.label) + reqMark + '</label>' +
        helpHtml +
        '<div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px 16px; border-radius:var(--radius-sm); border:1px solid #cbd5e1; margin-top:6px;">' +
        '<span style="font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(field.minLabel || '低い') + '</span>' +
        '<div style="display:flex; gap:16px;">' + scaleBtns + '</div>' +
        '<span style="font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(field.maxLabel || '高い') + '</span>' +
        '</div>' +
        '</div>'
      );
    }
    else if (field.type === 'select' && field.options) {
      const optionsHtml = field.options.map(opt => '<option value="' + escapeHtml(opt) + '">' + escapeHtml(opt) + '</option>').join('');
      return (
        '<div class="form-group">' +
        '<label class="form-label" for="' + field.id + '">' + escapeHtml(field.label) + reqMark + '</label>' +
        helpHtml +
        '<select id="' + field.id + '" name="' + field.id + '" class="form-select" ' + (field.required ? 'required' : '') + '>' +
        optionsHtml +
        '</select>' +
        '</div>'
      );
    }
    else if (field.type === 'textarea') {
      return (
        '<div class="form-group">' +
        '<label class="form-label" for="' + field.id + '">' + escapeHtml(field.label) + reqMark + '</label>' +
        helpHtml +
        '<textarea id="' + field.id + '" name="' + field.id + '" class="form-textarea" rows="3" ' + (field.required ? 'required' : '') + '></textarea>' +
        '</div>'
      );
    }
    else {
      return (
        '<div class="form-group">' +
        '<label class="form-label" for="' + field.id + '">' + escapeHtml(field.label) + reqMark + '</label>' +
        helpHtml +
        '<input type="' + (field.type || 'text') + '" id="' + field.id + '" name="' + field.id + '" class="form-input" ' + (field.required ? 'required' : '') + '>' +
        '</div>'
      );
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
    area.innerHTML = (
      '<div style="text-align:center; padding:30px 10px;">' +
      '<h3 style="font-family: var(--font-family-mincho); font-size:1.35rem; font-weight:700; color:var(--text-main); margin-bottom:8px;">ご回答ありがとうございました</h3>' +
      '<p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:24px;">「' + escapeHtml(formTitle) + '」への送信が正常に完了いたしました。</p>' +
      '<button class="btn btn-gold" onclick="location.reload()">フォーム一覧へ戻る</button>' +
      '</div>'
    );
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

  resultsDiv.innerHTML = myResponses.map(r => (
    '<div style="background:#ffffff; border:1px solid #cbd5e1; padding:10px; border-radius:6px; margin-top:8px; font-size:0.85rem; border-left:4px solid var(--gold-primary);">' +
    '<div style="font-weight:700; color:var(--text-main);">' + escapeHtml(r.formTitle) + '</div>' +
    '<div style="font-size:0.75rem; color:var(--text-muted);">回答日時: ' + escapeHtml(r.timestamp || r.createdAt) + '</div>' +
    '<div style="margin-top:6px;">' +
    Object.entries(r.answers).map(([k, v]) => '<div><strong>' + escapeHtml(k) + ':</strong> ' + escapeHtml(v) + '</div>').join('') +
    '</div>' +
    '</div>'
  )).join('');
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

function setupPracticeScheduleFeature() {
  const authForm = document.getElementById('practice-auth-form');
  const authLock = document.getElementById('practice-auth-lock');
  const contentArea = document.getElementById('practice-content-area');
  const authPassInput = document.getElementById('practice-auth-pass');
  const authError = document.getElementById('practice-auth-error');
  const btnLock = document.getElementById('btn-practice-lock');
  const addForm = document.getElementById('form-add-practice');

  const checkAuth = () => {
    if (sessionStorage.getItem('rin_practice_auth') === 'true') {
      if (authLock) authLock.style.display = 'none';
      if (contentArea) contentArea.style.display = 'block';
      loadPracticeSchedulesData();
    } else {
      if (authLock) authLock.style.display = 'block';
      if (contentArea) contentArea.style.display = 'none';
    }
  };

  checkAuth();

  authForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = authPassInput ? authPassInput.value.trim() : '';
    if (pass === 'rin2026') {
      sessionStorage.setItem('rin_practice_auth', 'true');
      if (authError) authError.style.display = 'none';
      if (authPassInput) authPassInput.value = '';
      checkAuth();
      showToast('🔑 認証に成功しました。練習予定の閲覧・登録が可能です。');
    } else {
      if (authError) authError.style.display = 'block';
    }
  });

  btnLock?.addEventListener('click', () => {
    sessionStorage.removeItem('rin_practice_auth');
    checkAuth();
    showToast('🔒 ログアウトしました。保護状態に戻りました。');
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('prac-date').value;
    const time = document.getElementById('prac-time').value.trim();
    const location = document.getElementById('prac-location').value.trim();
    const notes = document.getElementById('prac-notes').value.trim();

    if (!date || !time || !location) {
      alert('練習日、練習時間、練習場所を入力してください。');
      return;
    }

    const res = await savePracticeSchedule({ date, time, location, notes });
    if (res.success) {
      showToast(res.message);
      addForm.reset();
      loadPracticeSchedulesData();
    } else {
      alert(res.message);
    }
  });
}

async function loadPracticeSchedulesData() {
  const container = document.getElementById('practice-list-container');
  if (!container) return;

  container.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">読み込み中...</div>';

  const list = await fetchPracticeSchedules();

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center; color:var(--text-muted); padding:30px 10px;">
        まだ登録された練習予定はありません。上のフォームから新しい練習日を追加してください。
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const d = new Date(item.date);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()] || '';
    const formattedDate = `${item.date} (${dayOfWeek})`;

    return `
      <div class="card" style="margin-bottom:16px; border-left:4px solid var(--domatsuri-navy);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
          <div>
            <span class="badge" style="background:var(--domatsuri-navy); color:#ffffff; font-weight:700; font-size:0.85rem;">
              📅 ${escapeHtml(formattedDate)}
            </span>
            <span style="font-weight:700; color:var(--domatsuri-gold); font-size:0.95rem; margin-left:8px;">
              ⏰ ${escapeHtml(item.time)}
            </span>
          </div>
          <button type="button" class="btn btn-secondary btn-del-practice" data-id="${item.id}" style="padding:3px 8px; font-size:0.75rem; color:#dc2626; border-color:#fca5a5;">
            削除
          </button>
        </div>

        <div style="font-weight:700; font-size:1.05rem; color:var(--text-main); margin-bottom:6px;">
          📍 場所: ${escapeHtml(item.location)}
        </div>

        ${item.notes ? `
          <div style="background:#f8fafc; padding:10px 12px; border-radius:6px; font-size:0.88rem; color:#334155; line-height:1.6; border:1px solid #e2e8f0;">
            📝 <strong>内容・持ち物:</strong><br>${escapeHtml(item.notes).replace(/\n/g, '<br>')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-del-practice').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('この練習予定を削除して宜しいですか？')) return;
      const id = e.target.getAttribute('data-id');
      const res = await deletePracticeSchedule(id);
      showToast(res.message);
      loadPracticeSchedulesData();
    });
  });
}
