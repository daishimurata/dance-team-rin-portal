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
          <span class="announce-date" style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(item.date)}</span>
        </div>
        <h3 class="announce-title">${escapeHtml(item.title)}</h3>
        <div class="announce-body" style="margin-bottom:12px;">${escapeHtml(item.content)}</div>

        ${item.linkUrl ? `
          <a href="${escapeHtml(item.linkUrl)}" class="btn btn-gold" style="margin-top:10px; font-size:0.9rem;">
            ${escapeHtml(item.linkText || '🔗 関連ページを開く')}
          </a>
        ` : ''}
      </article>
    `;
  }).join('');
}

// 2. にっぽんど真ん中祭り 全演舞タイムスケジュールテーブルの完全描画
async function loadVenuesData() {
  const container = document.getElementById('venues-list');
  if (!container) return;

  const venues = await fetchVenues();
  if (!venues || venues.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; color: var(--text-muted);">演舞スケジュールデータはありません。</div>';
    return;
  }

  // 1日目・2日目の全タイムスケジュールデータ定義 (コミット83b0d569より復元)
  const domatsuriDays = [
    {
      dayTitle: '1日目：2026年8月29日(土) 【審査演舞 ＆ メインステージ】',
      assembly: '09:40 集合 (久屋大通公園 凛楽屋テント前)',
      items: [
        { time: '10:00', type: '集合', name: '矢場町駅 6番出口改札前集合 ＆ 楽屋へ移動', detail: '衣装着用・着替えテント利用可', code: '-' },
        { time: '10:45', type: '審査演舞', isShinsa: true, name: '[1] 久屋大通公園メインステージ', detail: '🔥 ファイナルシード審査演舞！（最重要演舞）', code: '2201' },
        { time: '11:20', type: '電車', name: '矢場町駅 → 名古屋駅', detail: '地下鉄名城線・東山線 (矢場町11:20→栄11:22発→11:27名古屋着［210円］)', code: '-' },
        { time: '12:12', type: '演舞', name: '[2] JR名古屋駅太閤通口会場', detail: '駅前広場特設ステージ演舞', code: '2601' },
        { time: '13:00', type: '電車', name: '名古屋駅 → 伏見駅 → 鶴舞駅', detail: '地下鉄東山線・鶴舞線 (名古屋13:00→伏見13:03発→13:09鶴舞着［240円］)', code: '-' },
        { time: '14:05', type: '演舞', name: '[3] 鶴舞公園会場', detail: '鶴舞公園 奏楽堂前ステージ演舞', code: '2701' },
        { time: '15:30', type: '演舞', name: '[4] テレビ塔パレード会場', detail: '久屋大通公園テレビ塔前パレード演舞', code: '2251' },
        { time: '17:00', type: '総踊り', name: '全チーム合同総踊り ＆ 1日目終了', detail: '集合写真撮影・1日目解散', code: '-' }
      ]
    },
    {
      dayTitle: '2日目：2026年8月30日(日) 【パレード演舞 ＆ どえりゃ〜どうとく演舞】',
      assembly: '08:45 集合 (矢場町駅 6番出口前)',
      items: [
        { time: '08:45', type: '集合', name: '矢場町駅 6番出口改札前集合 ＆ ウォームアップ', detail: '2日目スタート・隊列声出し確認', code: '-' },
        { time: '09:30', type: '演舞', name: '[1] 久屋大通公園メインステージ', detail: '2日目オープニング演舞', code: '2202' },
        { time: '10:45', type: '電車', name: '矢場町駅 → 上前津駅', detail: '地下鉄名城線 (矢場町10:45→上前津10:47着［210円］)', code: '-' },
        { time: '11:30', type: '演舞', name: '[8] 大須観音パレード会場', detail: '大須商店街パレード流し演舞', code: '2501' },
        { time: '13:33', type: '電車', name: '栄駅 → 金山駅 → 道徳駅', detail: '地下鉄名城線＋名鉄常滑線 (栄13:33→金山13:47発→13:53道徳着［地下鉄210円+名鉄190円］)', code: '-' },
        { time: '14:48', type: '演舞', name: '[11] どえりゃ〜どうとくパレード会場', detail: '道徳商店街パレード演舞（道徳駅から徒歩4分）', code: '2652' },
        { time: '15:15', type: '電車', name: '道徳駅 → 金山駅 → 栄駅', detail: '名鉄常滑線＋地下鉄名城線 (道徳15:15発→金山15:28発→15:36栄着［名鉄190円+地下鉄210円］)', code: '-' },
        { time: '16:54', type: '演舞', isShinsa: true, name: '[4] テレビ塔パレード会場', detail: '🔥 どまつり最終ラスト演舞ステージ！', code: '2252' }
      ]
    }
  ];

  const scheduleTablesHtml = domatsuriDays.map(day => {
    const rowsHtml = day.items.map(item => {
      let badgeClass = 'badge-normal';
      if (item.type === '審査演舞') badgeClass = 'badge-high';
      else if (item.type === '集合') badgeClass = 'badge-medium';
      else if (item.type === '電車') badgeClass = 'badge-normal';
      else if (item.type === '演舞') badgeClass = 'badge-high';

      return `
        <tr class="${item.isShinsa ? 'shinsa-row' : ''}" style="${item.isShinsa ? 'background:#fefce8;' : ''}">
          <td style="font-weight:700; white-space:nowrap;">${escapeHtml(item.time)}</td>
          <td style="text-align:center;"><span class="badge ${badgeClass}">${escapeHtml(item.type)}</span></td>
          <td style="font-weight:700;">${escapeHtml(item.name)}</td>
          <td style="font-size:0.84rem; color:var(--text-muted);">${escapeHtml(item.detail)}</td>
          <td style="font-family:monospace; font-weight:700; text-align:center;">${escapeHtml(item.code)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card" style="margin-bottom:20px; padding:0; overflow:hidden; border:1px solid #cbd5e1;">
        <div style="background:#f8fafc; padding:14px 18px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="font-family:var(--font-family-mincho); font-size:1.05rem; font-weight:700; color:var(--text-main);">
            <span>📅</span> ${escapeHtml(day.dayTitle)}
          </div>
          <span class="badge badge-medium">${escapeHtml(day.assembly)}</span>
        </div>
        <div class="table-responsive" style="margin:0;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:70px;">時刻</th>
                <th style="width:80px; text-align:center;">区分</th>
                <th>内容・演舞会場</th>
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

  container.innerHTML = `
    <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main);">🎪 にっぽんど真ん中祭り タイムスケジュール</h3>
        <p style="font-size:0.85rem; color:var(--text-muted);">全演舞ステージ・全移動路線・問合番号の一覧です。</p>
      </div>
      <a href="/schedule.html" class="btn btn-gold" style="width:auto; padding:8px 16px; font-size:0.88rem;">
        📄 タイムスケジュール専用Webページを開く
      </a>
    </div>

    ${scheduleTablesHtml}

    <div class="card" style="border-color: var(--gold-primary); background: #ffffff;">
      <h3 style="font-family: var(--font-family-mincho); font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
        🎒 演舞エリア持ち込みポーチ規定 ＆ 持参品規定
      </h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">
        どまつり演舞エリアへ持ち込める荷物は<strong>「透明または半透明のB6ポーチ（マチ無し）」</strong>限定です。
      </p>
      <div style="font-size:0.88rem; line-height:1.7; color:var(--text-main);">
        ・B6透明 / 半透明ポーチ（マチ無し）<br>
        ・ポーチ外側のチーム名「ダンスチーム凛」・氏名表記<br>
        ・お財布・現金 ｜ ドニチカ切符（土日620円）/ 交通系IC<br>
        ・スマートフォン（全充電） ｜ 常備薬・保険証（写し）
      </div>
    </div>
  `;
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
        <h3 class="announce-title">${escapeHtml(f.title)}</h3>
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
    const reqMark = field.required ? '<span class="required" style="color:#dc2626;">*</span>' : '';
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
            <span style="font-size:0.85rem; font-weight:700;">${i}</span>
          </label>
        `;
      }
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.label)}${reqMark}</label>
          ${helpHtml}
          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px 16px; border-radius:var(--radius-sm); border:1px solid #cbd5e1; margin-top:6px;">
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
        <div style="font-size:48px; margin-bottom:12px;">✨</div>
        <h3 style="font-family: var(--font-family-mincho); font-size:1.35rem; font-weight:700; color:var(--text-main); margin-bottom:8px;">ご回答ありがとうございました！</h3>
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
    <div style="background:#ffffff; border:1px solid #cbd5e1; padding:10px; border-radius:6px; margin-top:8px; font-size:0.85rem; border-left:4px solid var(--gold-primary);">
      <div style="font-weight:700; color:var(--text-main);">${escapeHtml(r.formTitle)}</div>
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
