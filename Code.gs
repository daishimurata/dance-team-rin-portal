/**
 * ダンスチーム「凛」サポート ポータル Web App
 * バックエンド処理 (Google Apps Script)
 */

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('ダンスチーム「凛」メンバーポータル')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

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
  
  const ss = SpreadsheetApp.create('【ダンスチーム凛】ポータル管理データベース');
  ssId = ss.getId();
  props.setProperty('SPREADSHEET_ID', ssId);
  setupDatabaseSheets(ss);
  return ss;
}

function setupDatabaseSheets(ss) {
  // 1. お知らせシート
  let sheetAnnounce = ss.getSheetByName('お知らせ') || ss.insertSheet('お知らせ');
  if (sheetAnnounce.getLastRow() === 0) {
    sheetAnnounce.appendRow(['ID', '日時', 'カテゴリ', 'タイトル', '本文', '重要度']);
    sheetAnnounce.appendRow(['1', '2026-08-18 10:00', '重要', '秋公演に向けた練習スケジュールの変更について', '皆様お疲れ様です！秋公演に向けた今後の練習日・会場が一部変更となりましたので、お知らせタブおよび道案内タブよりご確認ください。', 'high']);
    sheetAnnounce.appendRow(['2', '2026-08-15 15:30', '衣装・備品', '新衣装のサイズ申請フォーム回答のお願い', '新衣装の採寸・サイズ申請フォームを設置しました。フォームタブより8月25日(火)までに回答をお願いします！', 'medium']);
  }

  // 2. 会場案内シート
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
  }

  // 3. フォーム定義
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
        { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', helpText: '本名またはチーム内ニックネームを入力してください', required: true },
        { id: 'attendance', label: '出欠区分', type: 'radio', options: ['参加', '遅刻参加', '早退', '欠席'], required: true },
        { id: 'car', label: '移動手段・配車可能か（複数選択可）', type: 'checkbox', options: ['徒歩・電車', '車（同乗可能）', '送迎希望'], required: false },
        { id: 'time', label: '遅刻・早退の予定時間（該当者のみ）', type: 'text', required: false },
        { id: 'comment', label: '連絡事項・連絡メモ', type: 'textarea', required: false }
      ])
    ]);
  }

  let sheetResponses = ss.getSheetByName('フォーム回答') || ss.insertSheet('フォーム回答');
  if (sheetResponses.getLastRow() === 0) {
    sheetResponses.appendRow(['Timestamp', 'FormID', 'FormTitle', 'RespondentName', 'ResponsesJSON']);
  }

  let sheetBoard = ss.getSheetByName('メンバー掲示板') || ss.insertSheet('メンバー掲示板');
  if (sheetBoard.getLastRow() === 0) {
    sheetBoard.appendRow(['ID', '日時', '投稿者', 'メッセージ', 'いいね数']);
    sheetBoard.appendRow(['b1', '2026-08-18 12:30', 'あやか', '皆様、秋公演に向けて練習頑張りましょう！', '3']);
  }
}

// GAS API
function getAnnouncements() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('お知らせ');
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    const result = [];
    for (let i = values.length - 1; i >= 1; i--) {
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
    return [];
  }
}

function getVenues() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('会場案内');
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
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
    return [];
  }
}

function getForms() {
  try {
    const ss = getDbSpreadsheet();
    const sheet = ss.getSheetByName('フォーム定義');
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];
    const result = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[0]) continue;
      let fields = [];
      try { fields = JSON.parse(row[5]); } catch (e) { fields = []; }
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
    return [];
  }
}

function submitFormResponse(formId, formTitle, respondentName, answersJson) {
  try {
    const ss = getDbSpreadsheet();
    let sheet = ss.getSheetByName('フォーム回答') || ss.insertSheet('フォーム回答');
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([nowStr, formId, formTitle, respondentName, JSON.stringify(answersJson)]);
    return { success: true, message: 'ご回答ありがとうございました！送信が完了しました。' };
  } catch (err) {
    return { success: false, message: '送信エラー: ' + err.toString() };
  }
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  return String(val);
}
