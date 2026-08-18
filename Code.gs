/**
 * ダンスチーム「凛」サポート ポータル Web App
 * バックエンド処理 (Google Apps Script)
 */

// Web App エントリポイント
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('ダンスチーム「凛」メンバーポータル')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// HTMLテンプレートに別ファイルをインクルードする補助関数
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * データベース（スプレッドシート）初期化 / 取得 helper
 */
function getDbSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  
  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (err) {
      console.warn('既存のスプレッドシートが開けなかったため新規作成します:', err);
    }
  }
  
  // なければアクティブまたは新規スプレッドシートを作成
  const ss = SpreadsheetApp.create('【ダンスチーム凛】ポータル管理データベース');
  ssId = ss.getId();
  props.setProperty('SPREADSHEET_ID', ssId);
  
  // 初期シート構築
  setupDatabaseSheets(ss);
  return ss;
}

/**
 * 初期シート構造のセットアップ
 */
function setupDatabaseSheets(ss) {
  // 1. お知らせシート
  let sheetAnnounce = ss.getSheetByName('お知らせ') || ss.insertSheet('お知らせ');
  if (sheetAnnounce.getLastRow() === 0) {
    sheetAnnounce.appendRow(['ID', '日時', 'カテゴリ', 'タイトル', '本文', '重要度']);
    sheetAnnounce.appendRow(['1', '2026-08-18 10:00', '重要', '秋公演に向けた練習スケジュールの変更について', '皆様お疲れ様です！秋公演に向けた今後の練習日・会場が一部変更となりましたので、お知らせタブおよび道案内タブよりご確認ください。', 'high']);
    sheetAnnounce.appendRow(['2', '2026-08-15 15:30', '衣装・備品', '新衣装のサイズ申請フォーム回答のお願い', '新衣装の採寸・サイズ申請フォームを設置しました。フォームタブより8月25日(火)までに回答をお願いします！', 'medium']);
    sheetAnnounce.appendRow(['3', '2026-08-10 18:00', 'イベント', '夏祭りイベント出演のお礼と写真共有', '先日の夏祭りステージお疲れ様でした！たくさんの応援ありがとうございました。写真は写真アルバムリンクからご覧いただけます。', 'normal']);
  }

  // 2. 道案内・会場シート
  let sheetVenues = ss.getSheetByName('会場案内') || ss.insertSheet('会場案内');
  if (sheetVenues.getLastRow() === 0) {
    sheetVenues.appendRow(['ID', '会場名', '最寄り駅・アクセス', '住所', 'GoogleMap_URL', '道案内ポイント', '注意事項']);
    sheetVenues.appendRow([
      'v1',
      '市民体育館 アリーナ（メイン練習場）',
      '〇〇駅 南口 徒歩8分',
      '東京都〇〇区中央1-2-3',
      'https://maps.google.com/?q=市民体育館',
      '1. 南口改札を出て右折し、商店街を直進します。\n2. 2つ目の信号（ファミリーマート）を左折。\n3. 100mほど進んだ右側の大きな建物です。',
      '室内履き（シューズ）必携。入館時にチーム名「凛」でお入りください。'
    ]);
    sheetVenues.appendRow([
      'v2',
      '〇〇コミュニティセンター 多目的ホール',
      '〇〇駅 北口 徒歩5分',
      '東京都〇〇区北町4-5-6',
      'https://maps.google.com/?q=コミュニティセンター',
      '1. 北口を出てバスロータリー前を通過。\n2. 郵便局の角を右に曲がり、すぐ左手です。',
      '鏡付きスタジオ。音が響きやすいため、近隣配慮をお願いします。'
    ]);
  }

  // 3. フォーム設問＆回答シート
  let sheetForms = ss.getSheetByName('フォーム定義') || ss.insertSheet('フォーム定義');
  if (sheetForms.getLastRow() === 0) {
    sheetForms.appendRow(['FormID', 'タイトル', '説明', '締切', 'ステータス', '項目設定JSON']);
    sheetForms.appendRow([
      'f1',
      '8月24日(日) 全体練習 出欠確認',
      '8/24(日) 13:00〜17:00 市民体育館での全体練習の参加可否をご回答ください。',
      '2026-08-22 23:59',
      'open',
      JSON.stringify([
        { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', required: true },
        { id: 'attendance', label: '出欠区分', type: 'radio', options: ['参加', '遅刻参加', '早退', '欠席'], required: true },
        { id: 'time', label: '遅刻・早退の予定時間（該当者のみ）', type: 'text', required: false },
        { id: 'comment', label: '連絡事項・連絡メモ', type: 'textarea', required: false }
      ])
    ]);
    sheetForms.appendRow([
      'f2',
      '秋公演 衣装サイズ＆備品申請フォーム',
      '秋公演用衣装の制作に伴うサイズ申請です。',
      '2026-08-25 23:59',
      'open',
      JSON.stringify([
        { id: 'name', label: 'お名前', type: 'text', required: true },
        { id: 'height', label: '身長 (cm)', type: 'number', required: true },
        { id: 'size', label: '普段のTシャツサイズ', type: 'select', options: ['S', 'M', 'L', 'XL'], required: true },
        { id: 'prop_needed', label: '追加道具（鳴子・扇子など）の追加購入希望', type: 'radio', options: ['不要', '鳴子1セット希望', '扇子1本希望', '両方希望'], required: true },
        { id: 'note', label: '補足事項', type: 'textarea', required: false }
      ])
    ]);
  }

  let sheetResponses = ss.getSheetByName('フォーム回答') || ss.insertSheet('フォーム回答');
  if (sheetResponses.getLastRow() === 0) {
    sheetResponses.appendRow(['Timestamp', 'FormID', 'FormTitle', 'RespondentName', 'ResponsesJSON']);
  }

  // 4. メンバー掲示板シート
  let sheetBoard = ss.getSheetByName('メンバー掲示板') || ss.insertSheet('メンバー掲示板');
  if (sheetBoard.getLastRow() === 0) {
    sheetBoard.appendRow(['ID', '日時', '投稿者', 'メッセージ', 'いいね数']);
    sheetBoard.appendRow(['b1', '2026-08-18 12:30', 'あやか', '皆様、秋公演に向けて練習頑張りましょう！道案内ページの市民体育館の場所が分かりやすくて助かりました✨', '3']);
    sheetBoard.appendRow(['b2', '2026-08-17 20:15', 'たくみ', '8/24の練習、少し遅刻参加になりますがよろしくお願いします！', '1']);
  }

  // 不要なデフォルトシート削除
  const defaultSheet = ss.getSheetByName('シート1');
  if (defaultSheet) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
}

// ----------------------------------------------------
// API関数群 (フロントエンドからの呼び出し用)
// ----------------------------------------------------

/**
 * 運営からのお知らせ一覧取得
 */
function getAnnouncements() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('お知らせ');
    if (!sheet) return [];
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    
    const headers = values[0];
    const result = [];
    
    for (let i = values.length - 1; i >= 1; i--) { // 新しい順
      const row = values[i];
      if (!row[0]) continue;
      result.push({
        id: String(row[0]),
        date: formatDate(row[1]),
        category: String(row[2] || 'お知らせ'),
        title: String(row[3] || ''),
        content: String(row[4] || ''),
        importance: String(row[5] || 'normal')
      });
    }
    return result;
  } catch (err) {
    console.error('getAnnouncements error:', err);
    return getFallbackAnnouncements();
  }
}

/**
 * 会場案内・アクセス情報一覧取得
 */
function getVenues() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('会場案内');
    if (!sheet) return getFallbackVenues();
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return getFallbackVenues();
    
    const result = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[0]) continue;
      result.push({
        id: String(row[0]),
        name: String(row[1] || ''),
        access: String(row[2] || ''),
        address: String(row[3] || ''),
        mapUrl: String(row[4] || ''),
        directions: String(row[5] || ''),
        notice: String(row[6] || '')
      });
    }
    return result;
  } catch (err) {
    console.error('getVenues error:', err);
    return getFallbackVenues();
  }
}

/**
 * 利用可能なフォーム一覧の取得
 */
function getForms() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('フォーム定義');
    if (!sheet) return getFallbackForms();
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return getFallbackForms();
    
    const result = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[0]) continue;
      let fields = [];
      try {
        fields = JSON.parse(row[5]);
      } catch (e) {
        fields = [];
      }
      result.push({
        id: String(row[0]),
        title: String(row[1] || ''),
        description: String(row[2] || ''),
        deadline: String(row[3] || ''),
        status: String(row[4] || 'open'),
        fields: fields
      });
    }
    return result;
  } catch (err) {
    console.error('getForms error:', err);
    return getFallbackForms();
  }
}

/**
 * フォーム回答の送信・記録
 */
function submitFormResponse(formId, formTitle, respondentName, answersJson) {
  try {
    const ss = getDbSpreadsheet();
    let sheet = ss.getSheetByName('フォーム回答');
    if (!sheet) {
      sheet = ss.insertSheet('フォーム回答');
      sheet.appendRow(['Timestamp', 'FormID', 'FormTitle', 'RespondentName', 'ResponsesJSON']);
    }
    
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([nowStr, formId, formTitle, respondentName, JSON.stringify(answersJson)]);
    
    return { success: true, message: 'ご回答ありがとうございました！送信が完了しました。' };
  } catch (err) {
    console.error('submitFormResponse error:', err);
    return { success: false, message: '送信に失敗しました: ' + err.toString() };
  }
}

/**
 * メンバー掲示板の投稿一覧取得
 */
function getBoardPosts() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('メンバー掲示板');
    if (!sheet) return getFallbackBoardPosts();
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return getFallbackBoardPosts();
    
    const result = [];
    for (let i = values.length - 1; i >= 1; i--) { // 新しい順
      const row = values[i];
      if (!row[0]) continue;
      result.push({
        id: String(row[0]),
        date: formatDate(row[1]),
        author: String(row[2] || '匿名メンバー'),
        message: String(row[3] || ''),
        likes: Number(row[4] || 0)
      });
    }
    return result;
  } catch (err) {
    console.error('getBoardPosts error:', err);
    return getFallbackBoardPosts();
  }
}

/**
 * メンバー掲示板への新規投稿
 */
function addBoardPost(author, message) {
  try {
    if (!author || !message) {
      return { success: false, message: 'お名前とメッセージを入力してください。' };
    }
    
    const ss = getDbSpreadsheet();
    let sheet = ss.getSheetByName('メンバー掲示板');
    if (!sheet) {
      sheet = ss.insertSheet('メンバー掲示板');
      sheet.appendRow(['ID', '日時', '投稿者', 'メッセージ', 'いいね数']);
    }
    
    const newId = 'b_' + new Date().getTime();
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
    sheet.appendRow([newId, nowStr, author, message, 0]);
    
    return { success: true, message: '掲示板に投稿しました！' };
  } catch (err) {
    console.error('addBoardPost error:', err);
    return { success: false, message: '投稿に失敗しました: ' + err.toString() };
  }
}

// ----------------------------------------------------
// 補助関数・フォールバックデータ
// ----------------------------------------------------

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  }
  return String(val);
}

function getFallbackAnnouncements() {
  return [
    {
      id: '1',
      date: '2026-08-18 10:00',
      category: '重要',
      title: '秋公演に向けた練習スケジュールの変更について',
      content: '皆様お疲れ様です！秋公演に向けた今後の練習日・会場が一部変更となりましたので、お知らせタブおよび道案内タブよりご確認ください。',
      importance: 'high'
    },
    {
      id: '2',
      date: '2026-08-15 15:30',
      category: '衣装・備品',
      title: '新衣装のサイズ申請フォーム回答のお願い',
      content: '新衣装の採寸・サイズ申請フォームを設置しました。フォームタブより8月25日(火)までに回答をお願いします！',
      importance: 'medium'
    }
  ];
}

function getFallbackVenues() {
  return [
    {
      id: 'v1',
      name: '市民体育館 アリーナ（メイン練習場）',
      access: '〇〇駅 南口 徒歩8分',
      address: '東京都〇〇区中央1-2-3',
      mapUrl: 'https://maps.google.com/?q=市民体育館',
      directions: '1. 南口改札を出て右折し、商店街を直進します。\n2. 2つ目の信号（ファミリーマート）を左折。\n3. 100mほど進んだ右側の大きな建物です。',
      notice: '室内履き（シューズ）必携。入館時にチーム名「凛」でお入りください。'
    },
    {
      id: 'v2',
      name: '〇〇コミュニティセンター 多目的ホール',
      access: '〇〇駅 北口 徒歩5分',
      address: '東京都〇〇区北町4-5-6',
      mapUrl: 'https://maps.google.com/?q=コミュニティセンター',
      directions: '1. 北口を出てバスロータリー前を通過。\n2. 郵便局の角を右に曲がり、すぐ左手です。',
      notice: '鏡付きスタジオ。音が響きやすいため、近隣配慮をお願いします。'
    }
  ];
}

function getFallbackForms() {
  return [
    {
      id: 'f1',
      title: '8月24日(日) 全体練習 出欠確認',
      description: '8/24(日) 13:00〜17:00 市民体育館での全体練習の参加可否をご回答ください。',
      deadline: '2026-08-22 23:59',
      status: 'open',
      fields: [
        { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', required: true },
        { id: 'attendance', label: '出欠区分', type: 'radio', options: ['参加', '遅刻参加', '早退', '欠席'], required: true },
        { id: 'time', label: '遅刻・早退の予定時間（該当者のみ）', type: 'text', required: false },
        { id: 'comment', label: '連絡事項・連絡メモ', type: 'textarea', required: false }
      ]
    }
  ];
}

function getFallbackBoardPosts() {
  return [
    {
      id: 'b1',
      date: '2026-08-18 12:30',
      author: 'あやか',
      message: '皆様、秋公演に向けて練習頑張りましょう！道案内ページの市民体育館の場所が分かりやすくて助かりました✨',
      likes: 3
    }
  ];
}
