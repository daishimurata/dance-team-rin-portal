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
  setupDrawerMenu();
  loadAnnouncementsData();
  loadVenuesData();
  loadFormsData();
  initMainCountdown();
  setupChecklist();

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
  const targetDate = new Date('2026-08-28T17:50:00+09:00').getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    const daysEl = document.getElementById('main-cd-days');
    const hoursEl = document.getElementById('main-cd-hours');
    const minsEl = document.getElementById('main-cd-mins');
    const secsEl = document.getElementById('main-cd-secs');

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

  update();
  setInterval(update, 1000);
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

  const domatsuriSchedule = [
    {
      dayTitle: '1日目：8月28日（金）前夜祭',
      assembly: '集合 15:00 @ 白川公園',
      items: [
        { time: '15:00', type: '集合', name: '白川公園 集合', detail: '点呼・隊列確認・ウォームアップ・楽屋準備（16:30 白川公園出発）', mapQuery: '白川公園+名古屋' },
        { time: '17:50 頃', type: '演舞', name: '[1] 久屋大通公園会場 メインステージ', detail: '前夜祭メインステージ演舞 『炎 (HOMURA)』', mapQuery: '久屋大通公園メインステージ', spaceId: 1, dateNo: 2 },
        { time: '18:59 頃', type: '演舞', name: '[3] ぐるめぱーく会場', detail: '【徒歩移動】久屋メインから公園内を南へ徒歩約3分（移動バッファ約60分・余裕あり） 『炎 (HOMURA)』', mapQuery: '久屋大通公園ぐるめぱーく', spaceId: 3, dateNo: 2 },
        { time: '20:30', type: '総踊り', name: '前夜祭総踊り ＆ 解散', detail: '1日目演舞終了・解散' }
      ]
    },
    {
      dayTitle: '2日目：8月29日（土）本祭 1日目',
      assembly: '集合 08:00 @ 白川公園',
      items: [
        { time: '08:00', type: '集合', name: '白川公園 集合', detail: '朝の点呼・隊列確認・ウォームアップ', mapQuery: '白川公園+名古屋' },
        { time: '09:48', type: '電車', name: '矢場町駅 → 名古屋城駅', detail: '【地下鉄名城線 右回り】矢場町09:48発→09:55名古屋城着（210円）/ 7番出口徒歩10分 → 10:05会場着（余裕37分）' },
        { time: '10:42 頃', type: '演舞', name: '[9] 名古屋城会場', detail: '名古屋城特設ステージ演舞 『炎 (HOMURA)』', mapQuery: '名古屋城', spaceId: 9, dateNo: 3 },
        { time: '11:00', type: '電車', name: '名古屋城駅 → 久屋大通駅', detail: '【地下鉄名城線 左回り】11:00発→11:03久屋大通着（210円）/ 徒歩3分 → 11:10テレビ塔着（余裕32分）' },
        { time: '11:42 頃', type: '演舞', name: '[4] テレビ塔パレード会場', detail: 'パレード通常演舞 『炎 (HOMURA)』', mapQuery: '中部電力MIRAI+TOWER', spaceId: 4, dateNo: 3 },
        { time: '12:04', type: '電車', name: '栄駅 → 上前津駅', detail: '【地下鉄名城線 左回り】栄12:04発→12:08上前津着（210円）/ 8番出口徒歩8分 → 12:16大須着（余裕26分）' },
        { time: '12:42 頃', type: '演舞', name: '[10] 大須観音会場', detail: '大須観音境内ステージ演舞 『炎 (HOMURA)』', mapQuery: '大須観音', spaceId: 10, dateNo: 3 },
        { time: '13:07', type: '電車', name: '大須観音駅 → 名古屋駅', detail: '【鶴舞線＋東山線（伏見乗換）】13:07発→13:15名古屋着（210円）/ 徒歩5分 → 13:25名駅着（昼食・着替え・余裕77分）' },
        { time: '14:42 頃', type: '演舞', name: '[8] 名古屋駅前JRタワーズガーデン会場', detail: '名駅タワー前ガーデンステージ演舞 『炎 (HOMURA)』', mapQuery: 'JRタワーズガーデン', spaceId: 8, dateNo: 3 },
        { time: '15:25', type: '電車', name: '名古屋駅 → 栄駅', detail: '【地下鉄東山線】15:25発→15:30栄着（210円）/ 徒歩4分 → 15:40テレビ塔着（勝負演舞前集中・余裕62分）' },
        { time: '16:42 頃', type: '総合審査演舞', isShinsa: true, name: '[4] テレビ塔パレード会場', detail: '初審査演舞！勝負演舞 『炎 (HOMURA)』', mapQuery: '中部電力MIRAI+TOWER', spaceId: 4, dateNo: 3 },
        { time: '19:30 頃', type: '演舞', name: '[1] 久屋大通公園会場 メインステージ', detail: '【徒歩移動】テレビ塔から徒歩5分（夕食・最終待機バッファ約2.5時間・余裕あり） 『炎 (HOMURA)』', mapQuery: '久屋大通公園メインステージ', spaceId: 1, dateNo: 3 }
      ]
    },
    {
      dayTitle: '3日目：8月30日（日）本祭 2日目',
      assembly: '集合 09:30 @ オアシス21',
      items: [
        { time: '09:30', type: '集合', name: 'オアシス21 集合', detail: '点呼・最終確認・演舞準備', mapQuery: 'オアシス21' },
        { time: '10:54 頃', type: '演舞', name: '[6] オアシス21会場', detail: '銀河の広場ステージ演舞 『炎 (HOMURA)』', mapQuery: 'オアシス21', spaceId: 6, dateNo: 4 },
        { time: '12:50 頃', type: '演舞', name: '[1] 久屋大通公園会場 メインステージ', detail: '【徒歩移動】オアシス21より徒歩4分（昼食・ウォームアップバッファ約105分・超安全） 『炎 (HOMURA)』', mapQuery: '久屋大通公園メインステージ', spaceId: 1, dateNo: 4 },
        { time: '13:33', type: '電車', name: '栄駅 → 金山駅 → 道徳駅', detail: '【地下鉄名城線＋名鉄常滑線（金山乗換）】栄13:33発→金山13:47発(名鉄普通)→13:53道徳着［地下鉄210円+名鉄190円］/ 徒歩4分 → 13:58道徳着（余裕50分）' },
        { time: '14:48 頃', type: '演舞', name: '[11] どえりゃ〜どうとくパレード会場', detail: '道徳商店街パレード演舞 『炎 (HOMURA)』', mapQuery: '道徳商店街', spaceId: 11, dateNo: 4 },
        { time: '15:15', type: '電車', name: '道徳駅 → 金山駅 → 栄駅', detail: '【名鉄常滑線＋地下鉄名城線（金山乗換）】道徳15:15発(名鉄)→金山15:28発(地下鉄)→15:36栄着［名鉄190円+地下鉄210円］/ 徒歩4分 → 15:40テレビ塔着（最終演舞前余裕74分）' },
        { time: '16:54 頃', type: '演舞', isShinsa: true, name: '[4] テレビ塔パレード会場', detail: '最終演舞ラストステージ！『炎 (HOMURA)』', mapQuery: '中部電力MIRAI+TOWER', spaceId: 4, dateNo: 4 }
      ]
    }
  ];

  const scheduleTablesHtml = domatsuriSchedule.map(day => {
    const rowsHtml = day.items.map(item => {
      let badgeClass = 'badge-normal';
      if (item.type === '総合審査演舞') badgeClass = 'badge-high';
      else if (item.type === '集合') badgeClass = 'badge-medium';
      else if (item.type === '電車') badgeClass = 'badge-normal';
      else if (item.type === '演舞') badgeClass = 'badge-high';

      let actionBtns = '-';
      if (item.mapQuery) {
        const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(item.mapQuery);
        let schedUrl = '';
        if (item.spaceId && item.dateNo) {
          schedUrl = 'https://www.domatsuri.com/schedule/index?date_no=' + item.dateNo + '&space_id=' + item.spaceId;
        }
        actionBtns = (
          '<div style="display:flex; justify-content:center; gap:4px;">' +
            '<a href="' + mapUrl + '" target="_blank" class="map-btn">MAP</a>' +
            (schedUrl ? '<a href="' + schedUrl + '" target="_blank" class="sched-btn">当日会場スケジュール</a>' : '') +
          '</div>'
        );
      }

      return (
        '<tr class="' + (item.isShinsa ? 'shinsa-row' : '') + '" style="' + (item.isShinsa ? 'background:#fefce8;' : '') + '">' +
          '<td style="font-weight:700; white-space:nowrap;">' + escapeHtml(item.time) + '</td>' +
          '<td style="text-align:center;"><span class="badge ' + badgeClass + '">' + escapeHtml(item.type) + '</span></td>' +
          '<td style="font-weight:700;">' + escapeHtml(item.name) + '</td>' +
          '<td style="font-size:0.84rem; color:var(--text-muted);">' + escapeHtml(item.detail) + '</td>' +
          '<td style="text-align:center;">' + actionBtns + '</td>' +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="card" style="margin-bottom:20px; padding:0; overflow:hidden; border:1px solid #cbd5e1;">' +
        '<div style="background:#f8fafc; padding:14px 18px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
          '<div style="font-family:var(--font-family-mincho); font-size:1.05rem; font-weight:700; color:var(--text-main);">' +
            escapeHtml(day.dayTitle) +
          '</div>' +
          '<span class="badge badge-medium">' + escapeHtml(day.assembly) + '</span>' +
        '</div>' +
        '<div class="table-responsive" style="margin:0;">' +
          '<table class="data-table">' +
            '<thead>' +
              '<tr>' +
                '<th style="width:90px;">演舞開始時間</th>' +
                '<th style="width:85px; text-align:center;">区分</th>' +
                '<th>演舞会場・内容</th>' +
                '<th>移動・詳細備考</th>' +
                '<th style="width:140px; text-align:center;">MAP・当日案内</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              rowsHtml +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  container.innerHTML = (
    '<div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
      '<div>' +
        '<h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main);">にっぽんど真ん中祭り イベントタイムスケジュール ＆ 会場ナビ</h3>' +
        '<p style="font-size:0.85rem; color:var(--text-muted);">どまつり公式（domatsuri.com/team/detail/1131）に基づくダンスチーム凛（チームNo. 1131）の全3日間演舞スケジュールです。</p>' +
      '</div>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
        '<a href="https://www.domatsuri.com/team/detail/1131" target="_blank" rel="noopener noreferrer" class="btn btn-gold" style="width:auto; padding:8px 14px; font-size:0.85rem;">' +
          'どまつり公式 凛ページ ↗' +
        '</a>' +
        '<a href="https://www.youtube.com/user/DOMATSURIofficial" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="width:auto; padding:8px 14px; font-size:0.85rem; background:#fef2f2; color:#dc2626; border-color:#fca5a5;">' +
          'どまつり公式YouTube ↗' +
        '</a>' +
        '<a href="/schedule.html" class="btn btn-gold" style="width:auto; padding:8px 14px; font-size:0.85rem;">' +
          '専用スケジュール ↗' +
        '</a>' +
      '</div>' +
    '</div>' +
    scheduleTablesHtml +
    '<div class="card" style="border-color: var(--gold-primary); background: #ffffff;">' +
      '<h3 style="font-family: var(--font-family-mincho); font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">' +
        '🎒 当日の荷物規定 ＆ 持参品規定' +
      '</h3>' +
      '<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">' +
        '当日の荷物は<strong>「透明または半透明のB6ポーチ（マチ無し）」に入る物とチーム指定の水筒のみ</strong>でお願いします。' +
      '</p>' +
      '<p style="font-size: 0.82rem; color: #e11d48; font-weight: 700; margin-bottom: 12px;">' +
        '※ ポーチ外側に必ず「ダンスチーム凛」と「自分の名前または隊列表で使用するニックネーム」を明記してください。' +
      '</p>' +
      '<div style="font-size:0.88rem; line-height:1.7; color:var(--text-main);">' +
        '・B6透明/半透明ポーチ（マチ無）<br>' +
        '・チーム名・氏名の明記<br>' +
        '・お財布・現金<br>' +
        '・ドニチエコ切符 / ICカード<br>' +
        '・携帯電話<br>' +
        '・常備薬・メイク直し・健康保険証の写し<br>' +
        '・ポーチに入るサイズのタオル' +
      '</div>' +
    '</div>'
  );
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
