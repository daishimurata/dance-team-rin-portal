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
  const targetDate = new Date('2026-09-05T08:30:00+09:00').getTime();

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
        { time: '15:00', type: '集合', name: '白川公園 集合', detail: '点呼・ブリーフィング・ストレッチ ｜ 15:15 隊列練習 ｜ 16:15 給水・トイレ休憩 ｜ 16:30 出発 ｜ 16:45 南噴水広場到着 ｜ 17:15 集合、点呼 ｜ 17:20 久屋大通公園会場メインステージに移動(受付 17:30)', mapQuery: '白川公園' },
        { time: '17:50', type: '演舞', name: '[1] 久屋大通公園会場 メインステージ', detail: '18:10 演舞後、愛の広場に移動、休憩 ｜ 18:35 愛の広場集合、ぐるめぱーく会場に移動(受付 18:44)', mapQuery: '久屋大通公園メインステージ', spaceId: 1, dateNo: 2 },
        { time: '18:59', type: '演舞', isShinsa: true, name: '[3] ぐるめぱーく会場（キャンパスバトル）', detail: 'ステージ演舞(観客の拍手の大きさでNO.1が決まります） ｜ 19:15 演舞後、愛の広場に移動', mapQuery: '久屋大通公園ぐるめぱーく', spaceId: 3, dateNo: 2 },
        { time: '21:00', type: '解散', name: 'キャンパスバトル終了後 解散予定', detail: '（演舞後解散になる可能性もあり） 1日目終了' }
      ]
    },
    {
      dayTitle: '2日目：8月29日（土）本祭 1日目',
      assembly: '集合 08:00 @ 白川公園',
      items: [
        { time: '08:00', type: '集合', name: '白川公園 集合', detail: '点呼・ブリーフィング・ストレッチ ｜ 8:15 隊列練習 ｜ 8:45 給水・トイレ休憩・メイク確認 ｜ 9:15 点呼・白川公園出発 ｜ 9:30 地下鉄矢場町駅到着', mapQuery: '白川公園+名古屋' },
        { time: '09:48', type: '電車', name: '矢場町駅 → 名古屋城駅', detail: '【地下鉄名城線 右回り】矢場町09:48発→09:55名古屋城着（210円）/ 7番出口徒歩10分 ｜ 10:05 名古屋城会場到着(点呼後自由行動) ｜ 10:25 集合(点呼後、受付10:27)' },
        { time: '10:42', type: '演舞', name: '[9] 名古屋城会場', detail: '名古屋城特設ステージ演舞 ｜ 10:50 演舞後会場出発', mapQuery: '名古屋城', spaceId: 9, dateNo: 3 },
        { time: '11:08', type: '電車', name: '名古屋城駅 → 久屋大通駅', detail: '【地下鉄名城線 左回り】11:08発 → 11:11久屋大通駅着（運賃210円）徒歩3分 ｜ 11:15 テレビ塔パレード会場着、トイレ休憩 ｜ 11:25 集合(受付 11:27)' },
        { time: '11:42', type: '演舞', name: '[4] テレビ塔パレード会場', detail: 'パレード演舞 ｜ 11:55 演舞後、栄駅に移動', mapQuery: '中部電力MIRAI+TOWER', spaceId: 4, dateNo: 3 },
        { time: '12:04', type: '電車', name: '栄駅 → 大須観音駅', detail: '【地下鉄東山線＋鶴舞線（伏見乗換）】栄12:04発 → 12:12大須観音駅着（運賃210円）2番出口より徒歩3分 ｜ 12:15 大須観音会場到着、トイレ休憩 ｜ 12:25 集合(受付 12:27)' },
        { time: '12:42', type: '演舞', name: '[10] 大須観音会場', detail: '大須観音境内ステージ演舞 ｜ 12:50 演舞終了後、自由行動（昼食休憩） ｜ 13:30 集合、点呼 ｜ 13:45 大須観音駅に移動', mapQuery: '大須観音', spaceId: 10, dateNo: 3 },
        { time: '13:48', type: '電車', name: '大須観音駅 → 名古屋駅', detail: '【地下鉄鶴舞線＋東山線（伏見乗換）】13:48発 → 13:59名古屋駅着（運賃210円）/ 徒歩5分 ｜ 13:55 名古屋駅前JRタワーズガーデン会場到着、トイレ休憩 ｜ 14:20 集合(受付 14:27)' },
        { time: '14:42', type: '演舞', name: '[8] 名古屋駅前JRタワーズガーデン会場', detail: 'ステージ演舞 ｜ 14:50 演舞終了後、休憩 ｜ 15:10 集合、点呼後、地下鉄へ移動', mapQuery: 'JRタワーズガーデン', spaceId: 8, dateNo: 3 },
        { time: '15:25', type: '電車', name: '名古屋駅 → 栄駅', detail: '【地下鉄東山線】15:25発 → 15:30栄駅着（運賃210円） ｜ 審査演舞前 準備・集中時間（場所：愛の広場またはテレビ塔裏広場） ｜ 16:15 テレビ塔パレード会場へ移動(受付 16:27)' },
        { time: '16:42', type: '審査演舞', isShinsa: true, name: '[4] テレビ塔パレード会場', detail: 'パレード1次審査演舞！ ｜ 16:55 演舞後、愛の広場に移動、ミーティング後解散、自由行動 ｜ 18:50 南噴水広場集合、点呼 ｜ 19:00 久屋大通公園メインステージに移動(受付 19:20)', mapQuery: '中部電力MIRAI+TOWER', spaceId: 4, dateNo: 3 },
        { time: '19:30', type: '審査演舞', isShinsa: true, name: '[1] 久屋大通公園会場 メインステージ', detail: 'ファイナルシード決定戦！ ｜ 19:45 演舞後、南噴水広場へ移動 ｜ 連絡事項、解散。2日目終了', mapQuery: '久屋大通公園メインステージ', spaceId: 1, dateNo: 3 }
      ]
    },
    {
      dayTitle: '3日目：8月30日（日）本祭 2日目',
      assembly: '集合 09:30 @ オアシス21',
      items: [
        { time: '09:30', type: '集合', name: 'オアシス21 集合', detail: '点呼・ブリーフィング・ストレッチ・メイク確認 ｜ 10:35 オアシス21会場へ移動(受付 10:39)', mapQuery: 'オアシス21' },
        { time: '10:54', type: '演舞', name: '[6] オアシス21会場', detail: 'ステージ演舞 ｜ 11:10 演舞後、＠NAGOYAモニュメントへ移動、記念撮影 ｜ 11:30 解散、自由行動、各自で移動 ｜ 12:10 南噴水広場集合、点呼 ｜ 12:20 久屋大通公園会場メインステージへ移動（受付 12:30、レギュレーションチェック）', mapQuery: 'オアシス21', spaceId: 6, dateNo: 4 },
        { time: '12:50', type: '演舞', name: '[1] 久屋大通公園会場 メインステージ', detail: 'ステージ演舞 ｜ 13:05 演舞後、南噴水広場に移動、おそらく記念撮影あり ｜ 13:10 愛の広場集合、点呼 ｜ 13:20 矢場町駅に移動', mapQuery: '久屋大通公園メインステージ', spaceId: 1, dateNo: 4 },
        { time: '13:33', type: '電車', name: '矢場町駅 → 金山駅 → 道徳駅', detail: '【地下鉄名城線＋名鉄常滑線（金山乗換）】矢場町13:33発 → 金山13:47発(名鉄) → 13:53道徳駅着（地下鉄210円＋名鉄190円）/ 徒歩4分 ｜ 14:00 どえりゃ～どうとくパレード会場着、休憩 ｜ 14:20 集合(受付 14:33)' },
        { time: '14:48', type: '演舞', name: '[11] どえりゃ〜どうとくパレード会場', detail: 'パレード2回演舞 ｜ 15:15 演舞後、道徳駅に移動', mapQuery: '道徳商店街', spaceId: 11, dateNo: 4 },
        { time: '15:30', type: '電車', name: '道徳駅 → 金山駅 → 栄駅', detail: '【名鉄常滑線＋地下鉄名城線（金山乗換）】道徳15:30発(名鉄) → 金山15:43発(地下鉄) → 15:55栄駅着（名鉄190円＋地下鉄210円）/ 徒歩4分 ｜ 16:00 テレビ塔裏の広場に到着、休憩 ｜ 16:20 集合、点呼 ｜ 16:30 テレビ塔パレード会場へ移動(受付 16:39)' },
        { time: '16:54', type: '演舞', isShinsa: true, name: '[4] テレビ塔パレード会場', detail: 'パレード演舞 ｜ 17:15 演舞後、愛の広場に移動、連絡事項後解散。セミファイナルコンテスト、ファイナルコンテストに進出の場合は、日曜日の15：00以降の演舞スケジュールが変更になる可能性があります。', mapQuery: '中部電力MIRAI+TOWER', spaceId: 4, dateNo: 4 }
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
    '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">' +
    '<span class="badge" style="background:#64748b; color:#ffffff; font-weight:700;">過去のイベント / アーカイブ</span>' +
    '</div>' +
    '<h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main);">にっぽんど真ん中祭り2026（過去のイベントアーカイブ）</h3>' +
    '<p style="font-size:0.85rem; color:var(--text-muted);">どまつり公式に基づくダンスチーム凛（チームNo. 1131）の全3日間演舞スケジュール＆サポートスタッフシフト表記録です。</p>' +
    '</div>' +
    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
    '<a href="/domatsuri.html" class="btn btn-gold" style="width:auto; padding:8px 14px; font-size:0.85rem;">' +
    'どまつりポータル (演舞 ＆ サポート) ↗' +
    '</a>' +
    '<a href="/support.html" class="btn btn-gold" style="width:auto; padding:8px 14px; font-size:0.85rem; background:#d97706; border-color:#b45309;">' +
    'サポートスタッフシフト ↗' +
    '</a>' +
    '<a href="/schedule.html" class="btn btn-secondary" style="width:auto; padding:8px 14px; font-size:0.85rem;">' +
    '演舞スケジュール ↗' +
    '</a>' +
    '<a href="https://www.domatsuri.com/team/detail/1131" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="width:auto; padding:8px 14px; font-size:0.85rem;">' +
    'どまつり公式 凛 ↗' +
    '</a>' +
    '</div>' +
    '</div>' +
    scheduleTablesHtml +
    '<div class="card" style="border-color: var(--gold-primary); background: #ffffff;">' +
    '<h3 style="font-family: var(--font-family-mincho); font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">' +
    '🎒 当日の荷物＆チェックリスト' +
    '</h3>' +
    '<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">' +
    '当日の荷物は<strong>「透明または半透明のB6ポーチ（マチ無し）」に入る物とチーム指定の水筒のみ</strong>でお願いします。' +
    '</p>' +
    '<p style="font-size: 0.82rem; color: #e11d48; font-weight: 700; margin-bottom: 12px;">' +
    '※ ポーチ外側に必ず「ダンスチーム凛」と「自分の名前または隊列表で使用するニックネーム」を明記してください。' +
    '</p>' +
    '<div style="font-size:0.88rem; line-height:1.7; color:var(--text-main);">' +
    '・B6透明/半透明ポーチ（マチ無）<br>' +
    '・お財布・現金<br>' +
    '・ドニチエコ切符 / ICカード<br>' +
    '・携帯電話(必要な人)<br>' +
    '・常備薬・メイク直し・健康保険証の写し<br>' +
    '・ポーチに入るサイズのタオル<br>' +
    '・チーム指定水筒<br>' +
    '・衣装<br>' +
    '・手甲脚絆<br>' +
    '・足袋<br>' +
    '・鳴子<br>' +
    '・ファンベール' +
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
