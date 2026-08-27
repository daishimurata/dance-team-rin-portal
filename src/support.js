// どまつりダンスチーム凛サポートスタッフ・補助凛 シフト管理JS

const membersList = [
  'みやっち', 'まり', 'みどり', 'けえ', 'ようへい', 'えみ',
  'さき', 'えり', 'いつよ', 'みつみ', 'かおり', 'ゆみ',
  'もりた', 'あや子', 'たかし', 'まこと'
];

const scheduleData = {
  day1: {
    title: '1日目：8月28日（金）前夜祭・キャンパスバトル',
    dateStr: '8月28日（金）',
    venues: ['前夜祭', 'キャンパスバトル'],
    shifts: {
      'みやっち': ['×', '〇'],
      'まり': ['×', '×'],
      'みどり': ['〇', '△'],
      'けえ': ['×', '〇'],
      'ようへい': ['×', '〇'],
      'えみ': ['×', '〇'],
      'さき': ['×', '〇'],
      'えり': ['×', '〇'],
      'いつよ': ['〇', '△'],
      'みつみ': ['〇', '△'],
      'かおり': ['〇', '△'],
      'ゆみ': ['〇', '△'],
      'もりた': ['×', '×'],
      'あや子': ['〇', '〇'],
      'たかし': ['×', '×'],
      'まこと': ['×', '×']
    }
  },
  day2: {
    title: '2日目：8月29日（土）本祭1日目（6会場）',
    dateStr: '8月29日（土）',
    venues: ['名古屋城', 'テレビ塔', '大須', 'JRタワーズ', 'テレビ塔', 'ファイナルシード'],
    shifts: {
      'みやっち': ['△', '〇', '△', '△', '〇', '×'],
      'まり':     ['△', '〇', '△', '△', '〇', '△'],
      'みどり':   ['△', '〇', '△', '△', '〇', '△'],
      'けえ':     ['〇', '×', '〇', '〇', '×', '×'],
      'ようへい': ['〇', '×', '〇', '〇', '×', '×'],
      'えみ':     ['△', '〇', '×', '△', '〇', '×'],
      'さき':     ['〇', '×', '〇', '〇', '×', '×'],
      'えり':     ['〇', '×', '〇', '〇', '×', '×'],
      'いつよ':   ['△', '〇', '△', '△', '〇', '△'],
      'みつみ':   ['△', '〇', '△', '△', '〇', '△'],
      'かおり':   ['△', '△', '〇', '△', '△', '〇'],
      'ゆみ':     ['△', '△', '〇', '△', '△', '〇'],
      'もりた':   ['△', '×', '△', '△', '×', '〇'],
      'あや子':   ['△', '△', '△', '〇', '△', '〇'],
      'たかし':   ['〇', '△', '△', '〇', '△', '〇'],
      'まこと':   ['〇', '△', '△', '〇', '△', '〇']
    }
  },
  day3: {
    title: '3日目：8月30日（日）本祭2日目（4会場）',
    dateStr: '8月30日（日）',
    venues: ['オアシス', 'メイン', 'どうとく', 'テレビ塔'],
    shifts: {
      'みやっち': ['〇', '〇', '〇', '〇'],
      'まり':     ['〇', '〇', '〇', '〇'],
      'みどり':   ['〇', '〇', '〇', '〇'],
      'けえ':     ['×', '×', '×', '×'],
      'ようへい': ['×', '×', '×', '×'],
      'えみ':     ['〇', '〇', '〇', '〇'],
      'さき':     ['×', '×', '×', '×'],
      'えり':     ['×', '×', '×', '×'],
      'いつよ':   ['〇', '〇', '〇', '〇'],
      'みつみ':   ['×', '〇', '〇', '〇'],
      'かおり':   ['×', '〇', '〇', '〇'],
      'ゆみ':     ['〇', '〇', '〇', '〇'],
      'もりた':   ['〇', '〇', '×', '×'],
      'あや子':   ['〇', '〇', '〇', '〇'],
      'たかし':   ['〇', '〇', '〇', '〇'],
      'まこと':   ['〇', '〇', '〇', '〇']
    }
  }
};

let currentTab = 'day1';
let displayMode = 'by_venue'; // デフォルト「会場別カード表示」
let searchQuery = '';
let roleFilter = 'all';

function renderMarkBadge(mark) {
  if (mark === '〇') {
    return `<span class="badge-status badge-ok" style="background:#dcfce7; color:#166534; font-weight:900; font-size:1rem; padding:4px 10px; border-radius:50px; border:1px solid #86efac; display:inline-block; min-width:32px; text-align:center;">〇</span>`;
  } else if (mark === '△') {
    return `<span class="badge-status badge-tri" style="background:#fef9c3; color:#854d0e; font-weight:900; font-size:0.95rem; padding:4px 10px; border-radius:50px; border:1px solid #fef08a; display:inline-block; min-width:32px; text-align:center;">△</span>`;
  } else {
    return `<span class="badge-status badge-ng" style="background:#f1f5f9; color:#94a3b8; font-weight:700; font-size:0.88rem; padding:4px 10px; border-radius:50px; border:1px solid #cbd5e1; display:inline-block; min-width:32px; text-align:center;">×</span>`;
  }
}

function filterMembers(members) {
  return members.filter(name => {
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (roleFilter === 'support_only') {
      const hasCircle = ['day1', 'day2', 'day3'].some(d => 
        scheduleData[d].shifts[name] && scheduleData[d].shifts[name].includes('〇')
      );
      if (!hasCircle) return false;
    } else if (roleFilter === 'aux_only') {
      const hasTriangle = ['day1', 'day2', 'day3'].some(d => 
        scheduleData[d].shifts[name] && scheduleData[d].shifts[name].includes('△')
      );
      if (!hasTriangle) return false;
    }
    return true;
  });
}

function computeVenueTotals(dayKey, filteredMembers) {
  const day = scheduleData[dayKey];
  const totals = day.venues.map((_, colIdx) => ({ circle: 0, triangle: 0, cross: 0 }));
  
  filteredMembers.forEach(name => {
    const row = day.shifts[name] || [];
    row.forEach((mark, colIdx) => {
      if (colIdx < totals.length) {
        if (mark === '〇') totals[colIdx].circle++;
        else if (mark === '△') totals[colIdx].triangle++;
        else totals[colIdx].cross++;
      }
    });
  });

  return totals;
}

// ==========================================
// 1. 会場別カード表示 (By Venue Layout) - 見やすさ最優先
// ==========================================
function renderByVenueDayContent(dayKey) {
  const day = scheduleData[dayKey];
  const filtered = filterMembers(membersList);

  return `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; background: #ffffff; padding: 16px 20px; border-radius: 8px; border-left: 5px solid var(--domatsuri-gold); box-shadow: var(--shadow-soft);">
        <h2 style="font-family: var(--font-family-mincho); font-size: 1.2rem; font-weight: 700; color: var(--domatsuri-navy); margin: 0;">
          📍 ${day.title}
        </h2>
        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
          全${day.venues.length}会場 ｜ 対象スタッフ: ${filtered.length}名
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px;">
        ${day.venues.map((venueName, vIdx) => {
          const mainSupporters = filtered.filter(name => day.shifts[name] && day.shifts[name][vIdx] === '〇');
          const subSupporters = filtered.filter(name => day.shifts[name] && day.shifts[name][vIdx] === '△');

          return `
            <div class="card" style="padding: 18px; border-top: 4px solid var(--domatsuri-navy); box-shadow: var(--shadow-soft); background: #ffffff;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1.5px solid var(--border-color);">
                <div style="font-family: var(--font-family-mincho); font-size: 1.15rem; font-weight: 700; color: var(--domatsuri-navy); display: flex; align-items: center; gap: 8px;">
                  <span style="background: var(--domatsuri-navy); color: #ffffff; font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; font-family: 'Inter', sans-serif;">会場 ${vIdx + 1}</span>
                  ${venueName}
                </div>
                <span class="badge" style="background: #f1f5f9; color: #475569; font-weight: 700; font-size: 0.8rem;">
                  サポート計 ${mainSupporters.length + subSupporters.length}名
                </span>
              </div>

              <!-- 〇 メインサポート -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="font-weight: 700; font-size: 0.88rem; color: #166534; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: #166534; color: #ffffff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 900;">〇</span>
                    メインサポート（荷物預かり）
                  </span>
                  <span style="font-size: 0.82rem; font-weight: 800; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 12px;">${mainSupporters.length}名</span>
                </div>
                ${mainSupporters.length === 0 ? `
                  <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic;">担当者なし</div>
                ` : `
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${mainSupporters.map(name => `
                      <button onclick="openMemberModal('${name}')" style="background: #ffffff; color: #166534; border: 1px solid #86efac; border-radius: 6px; padding: 6px 12px; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: inherit;" title="タップして${name}さんの詳細シフトを表示">
                        <span>${name}</span>
                        <span style="font-size: 0.75rem; opacity: 0.7;">👤</span>
                      </button>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- △ サブサポート -->
              <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 12px;">
                <div style="font-weight: 700; font-size: 0.88rem; color: #854d0e; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: #854d0e; color: #ffffff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 900;">△</span>
                    サブサポート（お手伝い）
                  </span>
                  <span style="font-size: 0.82rem; font-weight: 800; background: #fef9c3; color: #a16207; padding: 2px 8px; border-radius: 12px;">${subSupporters.length}名</span>
                </div>
                ${subSupporters.length === 0 ? `
                  <div style="font-size: 0.82rem; color: #94a3b8; font-style: italic;">担当者なし</div>
                ` : `
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${subSupporters.map(name => `
                      <button onclick="openMemberModal('${name}')" style="background: #ffffff; color: #854d0e; border: 1px solid #fef08a; border-radius: 6px; padding: 6px 12px; font-weight: 700; font-size: 0.88rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-family: inherit;" title="タップして${name}さんの詳細シフトを表示">
                        <span>${name}</span>
                        <span style="font-size: 0.75rem; opacity: 0.7;">👤</span>
                      </button>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderByVenueAllDaysContent() {
  return `
    <div>
      ${renderByVenueDayContent('day1')}
      ${renderByVenueDayContent('day2')}
      ${renderByVenueDayContent('day3')}
    </div>
  `;
}

// ==========================================
// 2. 全体表マトリクス表示 (Matrix Table Layout)
// ==========================================
function renderDayTableContent(dayKey) {
  const day = scheduleData[dayKey];
  const filtered = filterMembers(membersList);
  const totals = computeVenueTotals(dayKey, filtered);

  let html = `
    <div class="card" style="margin-bottom: 24px; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid var(--domatsuri-gold); padding-bottom: 12px;">
        <h2 style="font-family: var(--font-family-mincho); font-size: 1.25rem; font-weight: 700; color: var(--domatsuri-navy); margin: 0;">
          ${day.title}
        </h2>
        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
          対象人数: ${filtered.length}名
        </span>
      </div>

      <div class="domatsuri-table-wrapper" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="domatsuri-table" style="width: 100%; border-collapse: collapse; min-width: 600px;">
          <thead>
            <tr style="background: var(--domatsuri-navy); color: #ffffff;">
              <th style="padding: 12px; font-weight: 700; min-width: 110px; text-align: left; position: sticky; left: 0; background: var(--domatsuri-navy); z-index: 2; border-right: 2px solid rgba(255,255,255,0.1);">スタッフ名</th>
              ${day.venues.map((v, i) => `
                <th style="padding: 12px; font-weight: 700; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                  ${v}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="${day.venues.length + 1}" style="text-align: center; padding: 24px; color: #94a3b8;">該当するスタッフが見つかりませんでした。</td></tr>
            ` : filtered.map(name => {
              const rowShifts = day.shifts[name] || day.venues.map(() => '×');
              return `
                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 10px 12px; font-weight: 700; color: var(--domatsuri-navy); position: sticky; left: 0; background: #ffffff; z-index: 1; border-right: 2px solid var(--border-color); cursor: pointer;" onclick="openMemberModal('${name}')" title="タップして個人の3日間シフトを表示">
                    <span style="color: #0284c7; text-decoration: underline; text-underline-offset: 3px;">${name}</span>
                    <span style="font-size: 0.7rem; color: #94a3b8; margin-left: 4px;">👤</span>
                  </td>
                  ${rowShifts.map(mark => `
                    <td style="padding: 10px 12px; text-align: center; border-right: 1px solid #f1f5f9;">
                      ${renderMarkBadge(mark)}
                    </td>
                  `).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot style="background: #f8fafc; border-top: 2px solid var(--domatsuri-navy);">
            <tr>
              <td style="padding: 12px; font-weight: 800; color: var(--domatsuri-navy); position: sticky; left: 0; background: #f8fafc; z-index: 1; border-right: 2px solid var(--border-color);">
                集計 (〇メイン)
              </td>
              ${totals.map(t => `
                <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #166534; font-size: 0.95rem;">
                  〇 = ${t.circle}名
                </td>
              `).join('')}
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: 800; color: var(--domatsuri-navy); position: sticky; left: 0; background: #f8fafc; z-index: 1; border-right: 2px solid var(--border-color);">
                集計 (△サブ)
              </td>
              ${totals.map(t => `
                <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #854d0e; font-size: 0.95rem;">
                  △ = ${t.triangle}名
                </td>
              `).join('')}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
  return html;
}

function renderAllDaysTableContent() {
  const filtered = filterMembers(membersList);
  
  return `
    <div class="card" style="padding: 20px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; border-bottom: 2px solid var(--domatsuri-gold); padding-bottom: 12px;">
        <h2 style="font-family: var(--font-family-mincho); font-size: 1.25rem; font-weight: 700; color: var(--domatsuri-navy); margin: 0;">
          全3日間 補助凛シフト総覧マトリクス
        </h2>
        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
          表示人数: ${filtered.length}名
        </span>
      </div>

      <div class="domatsuri-table-wrapper" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="domatsuri-table" style="width: 100%; border-collapse: collapse; min-width: 980px;">
          <thead>
            <tr style="background: var(--domatsuri-navy); color: #ffffff;">
              <th rowspan="2" style="padding: 10px; font-weight: 700; min-width: 110px; text-align: left; position: sticky; left: 0; background: var(--domatsuri-navy); z-index: 2; border-right: 2px solid rgba(255,255,255,0.2);">氏名</th>
              <th colspan="2" style="padding: 8px; font-weight: 700; text-align: center; background: #1e3a8a; border-right: 1px solid rgba(255,255,255,0.2);">8/28（金）</th>
              <th colspan="6" style="padding: 8px; font-weight: 700; text-align: center; background: #065f46; border-right: 1px solid rgba(255,255,255,0.2);">8/29（土）</th>
              <th colspan="4" style="padding: 8px; font-weight: 700; text-align: center; background: #991b1b;">8/30（日）</th>
            </tr>
            <tr style="background: #1e293b; color: #f8fafc; font-size: 0.8rem;">
              <!-- 8/28 -->
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">前夜祭</th>
              <th style="padding: 6px 8px; border-right: 2px solid var(--domatsuri-gold);">キャンパス</th>
              <!-- 8/29 -->
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">名古屋城</th>
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">テレビ塔1</th>
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">大須</th>
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">JRタワーズ</th>
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">テレビ塔2</th>
              <th style="padding: 6px 8px; border-right: 2px solid var(--domatsuri-gold);">Fシード</th>
              <!-- 8/30 -->
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">オアシス</th>
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">メイン</th>
              <th style="padding: 6px 8px; border-right: 1px solid #475569;">どうとく</th>
              <th style="padding: 6px 8px;">テレビ塔</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(name => {
              const d1 = scheduleData.day1.shifts[name] || ['×', '×'];
              const d2 = scheduleData.day2.shifts[name] || ['×', '×', '×', '×', '×', '×'];
              const d3 = scheduleData.day3.shifts[name] || ['×', '×', '×', '×'];
              return `
                <tr style="border-bottom: 1px solid var(--border-color);" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 8px 12px; font-weight: 700; color: var(--domatsuri-navy); position: sticky; left: 0; background: #ffffff; z-index: 1; border-right: 2px solid var(--border-color); cursor: pointer;" onclick="openMemberModal('${name}')">
                    <span style="color: #0284c7; text-decoration: underline; text-underline-offset: 3px;">${name}</span>
                  </td>
                  <!-- Day 1 -->
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d1[0])}</td>
                  <td style="padding: 6px; text-align: center; border-right: 2px solid var(--domatsuri-gold);">${renderMarkBadge(d1[1])}</td>
                  <!-- Day 2 -->
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d2[0])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d2[1])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d2[2])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d2[3])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d2[4])}</td>
                  <td style="padding: 6px; text-align: center; border-right: 2px solid var(--domatsuri-gold);">${renderMarkBadge(d2[5])}</td>
                  <!-- Day 3 -->
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d3[0])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d3[1])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d3[2])}</td>
                  <td style="padding: 6px; text-align: center;">${renderMarkBadge(d3[3])}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function updateView() {
  const container = document.getElementById('support-tab-content');
  if (!container) return;

  if (displayMode === 'by_venue') {
    if (currentTab === 'all') {
      container.innerHTML = renderByVenueAllDaysContent();
    } else {
      container.innerHTML = renderByVenueDayContent(currentTab);
    }
  } else {
    if (currentTab === 'all') {
      container.innerHTML = renderAllDaysTableContent();
    } else {
      container.innerHTML = renderDayTableContent(currentTab);
    }
  }

  // タブボタンのアクティブ表示切替
  ['day1', 'day2', 'day3', 'all'].forEach(tab => {
    const btn = document.getElementById(`tab-btn-${tab}`);
    if (btn) {
      if (tab === currentTab) {
        btn.classList.add(tab === 'all' ? 'active-day1' : `active-${tab}`);
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(-2px)';
      } else {
        btn.className = 'domatsuri-tab-btn';
        btn.style.opacity = '0.85';
        btn.style.transform = 'none';
      }
    }
  });
}

// 個人シフトモーダル表示
window.openMemberModal = function(name) {
  const modal = document.getElementById('member-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  const d1 = scheduleData.day1;
  const d2 = scheduleData.day2;
  const d3 = scheduleData.day3;

  const s1 = d1.shifts[name] || ['×', '×'];
  const s2 = d2.shifts[name] || ['×', '×', '×', '×', '×', '×'];
  const s3 = d3.shifts[name] || ['×', '×', '×', '×'];

  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; border-bottom: 2px solid var(--domatsuri-gold); padding-bottom: 12px;">
      <div class="brand-icon" style="width: 40px; height: 40px; font-size: 1.1rem;">凛</div>
      <div>
        <div style="font-size: 1.25rem; font-weight: 700; color: var(--domatsuri-navy);">${name} さんのシフト詳細</div>
        <div style="font-size: 0.8rem; color: #64748b;">どまつり2026 サポートスタッフ・補助凛全日程</div>
      </div>
    </div>

    <!-- 1日目 -->
    <div style="margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #0284c7;">
      <div style="font-weight: 700; font-size: 0.9rem; color: #0369a1; margin-bottom: 8px;">8月28日（金）前夜祭</div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        ${d1.venues.map((v, i) => `
          <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.82rem; color: #475569;">${v}:</span>
            ${renderMarkBadge(s1[i])}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2日目 -->
    <div style="margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #059669;">
      <div style="font-weight: 700; font-size: 0.9rem; color: #047857; margin-bottom: 8px;">8月29日（土）本祭1日目</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
        ${d2.venues.map((v, i) => `
          <div style="background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: #475569;">${v}</span>
            ${renderMarkBadge(s2[i])}
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 3日目 -->
    <div style="margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626;">
      <div style="font-weight: 700; font-size: 0.9rem; color: #b91c1c; margin-bottom: 8px;">8月30日（日）本祭2日目</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
        ${d3.venues.map((v, i) => `
          <div style="background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: #475569;">${v}</span>
            ${renderMarkBadge(s3[i])}
          </div>
        `).join('')}
      </div>
    </div>

    <div style="text-align: right; margin-top: 16px;">
      <button onclick="closeMemberModal()" class="btn btn-secondary" style="padding: 6px 16px; font-size: 0.85rem;">閉じる</button>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeMemberModal = function() {
  const modal = document.getElementById('member-modal');
  if (modal) modal.style.display = 'none';
};

window.switchSupportTab = function(tab) {
  currentTab = tab;
  updateView();
};

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('member-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      updateView();
    });
  }

  const roleSelect = document.getElementById('role-filter');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      roleFilter = e.target.value;
      updateView();
    });
  }

  const displayModeSelect = document.getElementById('display-mode');
  if (displayModeSelect) {
    displayModeSelect.addEventListener('change', (e) => {
      displayMode = e.target.value;
      updateView();
    });
  }

  updateView();
});
