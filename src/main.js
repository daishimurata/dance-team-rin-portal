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
  loadDomatsuriData();

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

// ----------------------------------------------------
// 4. どまつりタイムスケジュール ＆ ポーチ規定チェックリスト
// ----------------------------------------------------
function loadDomatsuriData() {
  const scheduleContainer = document.getElementById('domatsuri-schedule-container');
  const checklistContainer = document.getElementById('domatsuri-checklist-container');
  if (!scheduleContainer || !checklistContainer) return;

  const domatsuriSchedule = [
    {
      dayTitle: '1日目：8月28日（金）前夜祭',
      assembly: '集合 15:00 @ 白川公園',
      items: [
        { time: '15:00', type: '集合', name: '白川公園 集合', detail: '点呼・隊列調整・ストレッチ', code: '-' },
        { time: '17:50', type: '演舞', name: '[1] 前夜祭 演舞（久屋メイン）', detail: '徒歩移動（白川公園→久屋大通公園）。※出場目安時刻', code: '1016' },
        { time: '18:59', type: '演舞', name: '[3] ぐるめぱーく会場（キャンパスバトル）', detail: 'エンゼル広場（久屋公園内徒歩移動）。※出場目安時刻', code: '1077' }
      ]
    },
    {
      dayTitle: '2日目：8月29日（土）本祭 1日目',
      assembly: '集合 08:00 @ 白川公園',
      items: [
        { time: '08:00', type: '集合', name: '白川公園 集合', detail: '朝の点呼・隊列確認', code: '-' },
        { time: '09:48', type: '電車', name: '矢場町駅 → 名古屋城駅', detail: '地下鉄名城線（右回り） 09:48発→09:55着（運賃200円）/ 7番出口徒歩10分', code: '-' },
        { time: '10:42', type: '演舞', name: '[9] 名古屋城会場', detail: '名古屋城特設ステージ演舞', code: '1759' },
        { time: '11:08', type: '電車', name: '名古屋城駅 → 久屋大通駅', detail: '地下鉄名城線（左回り） 11:08発→11:11着（運賃210円）', code: '-' },
        { time: '11:42', type: '演舞', name: '[4] テレビ塔パレード会場', detail: 'パレード通常演舞', code: '1398' },
        { time: '12:08', type: '電車', name: '栄駅 → 上前津駅', detail: '地下鉄名城線（左回り） 12:08発→12:12着（運賃210円）/ 上前津から徒歩8分', code: '-' },
        { time: '12:42', type: '演舞', name: '[10] 大須観音会場', detail: '大須観音境内ステージ演舞', code: '1844' },
        { time: '13:38', type: '電車', name: '大須観音駅 → 名古屋駅', detail: '鶴舞線＋東山線（伏見乗換） 13:38発→伏見乗換→13:49名古屋着（運賃210円）', code: '-' },
        { time: '14:42', type: '演舞', name: '[8] 名古屋駅前JRタワーズガーデン会場', detail: '名駅タワー前ガーデンステージ演舞', code: '1719' },
        { time: '15:45', type: '電車', name: '名古屋駅 → 栄駅', detail: '地下鉄東山線 15:45発→15:50栄着（運賃210円）※桜通線久屋大通着も可', code: '-' },
        { time: '16:42', type: '審査演舞', name: '[4] テレビ塔パレード会場（審査演舞）', detail: '🔥 審査グループ ④ 重点勝負演舞！', code: '1448', isShinsa: true },
        { time: '19:30', type: '演舞', name: '[1] ファイナルシード決定戦', detail: '久屋メインステージ（久屋公園内徒歩移動）', code: '1282' }
      ]
    },
    {
      dayTitle: '3日目：8月30日（日）本祭 2日目',
      assembly: '集合 09:30 @ オアシス21',
      items: [
        { time: '09:30', type: '集合', name: 'オアシス21 集合', detail: '点呼・最終確認・演舞準備', code: '-' },
        { time: '10:54', type: '演舞', name: '[6] オアシス21会場', detail: '銀河の広場ステージ演舞', code: '2353' },
        { time: '12:50', type: '演舞', name: '[1] 久屋メイン（通常演舞）', detail: 'オアシス21より徒歩移動（徒歩約4分）', code: '2009' },
        { time: '13:33', type: '電車', name: '栄駅 → 金山駅 → 道徳駅', detail: '地下鉄名城線＋名鉄常滑線（金山乗換） 栄13:33→金山13:47発(名鉄普通)→13:53道徳着［地下鉄210円+名鉄190円］', code: '-' },
        { time: '14:48', type: '演舞', name: '[11] どえりゃ〜どうとくパレード会場', detail: '道徳商店街パレード演舞（道徳駅から徒歩4分）', code: '2652' },
        { time: '15:15', type: '電車', name: '道徳駅 → 金山駅 → 栄駅', detail: '名鉄常滑線＋地下鉄名城線（金山乗換） 道徳15:15(名鉄普通)→金山15:28発(名城線)→15:36栄着［名鉄190円+地下鉄210円］', code: '-' },
        { time: '16:54', type: '演舞', name: '[4] テレビ塔パレード会場', detail: '最終演舞ステージ！', code: '2252' }
      ]
    }
  ];

  scheduleContainer.innerHTML = domatsuriSchedule.map(day => {
    const rowsHtml = day.items.map(item => {
      let badgeClass = 'badge-normal';
      if (item.type === '審査演舞') badgeClass = 'badge-shinsa';
      else if (item.type === '集合') badgeClass = 'badge-syugo';
      else if (item.type === '電車') badgeClass = 'badge-densha';
      else if (item.type === '演舞') badgeClass = 'badge-high';

      return `
        <tr class="${item.isShinsa ? 'shinsa-row' : ''}">
          <td style="font-weight:700; white-space:nowrap;">${escapeHtml(item.time)}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(item.type)}</span></td>
          <td style="font-weight:700;">${escapeHtml(item.name)}</td>
          <td style="font-size:0.84rem; color:var(--text-muted);">${escapeHtml(item.detail)}</td>
          <td style="font-family:monospace; font-weight:700; text-align:center;">${escapeHtml(item.code)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="domatsuri-day-card">
        <div class="domatsuri-day-header">
          <div class="domatsuri-day-title">
            <span>📅</span> ${escapeHtml(day.dayTitle)}
          </div>
          <span class="badge badge-syugo">${escapeHtml(day.assembly)}</span>
        </div>
        <div class="domatsuri-table-wrapper">
          <table class="domatsuri-table">
            <thead>
              <tr>
                <th style="width:70px;">時刻</th>
                <th style="width:80px; text-align:center;">区分</th>
                <th>内容・会場</th>
                <th>移動・詳細備考</th>
                <th style="width:85px; text-align:center;">問合番号</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  // 持ち物チェックリストの初期化・ローカルストレージ連携
  const checklistItems = [
    { id: 'pouch', label: 'B6透明 / 半透明ポーチ（マチ無し）' },
    { id: 'name_tag', label: 'ポーチ外側のチーム名「ダンスチーム凛」・氏名表記' },
    { id: 'wallet', label: 'お財布・現金' },
    { id: 'ticket', label: 'ドニチカ切符（土日620円） / 交通系ICカード' },
    { id: 'phone', label: '携帯電話（スマートフォ全充電）' },
    { id: 'meds', label: '常備薬・メイク直し用品・保険証（写）' }
  ];

  const savedState = JSON.parse(localStorage.getItem('rin_domatsuri_checklist') || '{}');

  checklistContainer.innerHTML = `
    <div class="card" style="border-color: var(--gold-primary);">
      <h3 style="font-family: var(--font-family-mincho); font-size: 1.15rem; font-weight: 700; color: var(--gold-light); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
        <span>🎒</span> 演舞時ポーチ規定 ＆ 持参品チェックリスト
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        演舞エリアへ持ち込める荷物は<strong>「透明または半透明のB6ポーチ（マチ無し）」</strong>限定です。持参するものをタップして準備状況をチェックできます。
      </p>
      <div id="checklist-items-wrapper">
        ${checklistItems.map(item => {
          const isChecked = !!savedState[item.id];
          return `
            <label class="domatsuri-checklist-item ${isChecked ? 'checked' : ''}" data-id="${item.id}">
              <input type="checkbox" ${isChecked ? 'checked' : ''}>
              <span>${escapeHtml(item.label)}</span>
            </label>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('.domatsuri-checklist-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const checkbox = el.querySelector('input[type="checkbox"]');
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      const id = el.getAttribute('data-id');
      if (checkbox.checked) {
        el.classList.add('checked');
        savedState[id] = true;
      } else {
        el.classList.remove('checked');
        delete savedState[id];
      }
      localStorage.setItem('rin_domatsuri_checklist', JSON.stringify(savedState));
    });
  });
}
