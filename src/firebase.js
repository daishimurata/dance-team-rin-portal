import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

// Firebase設定（環境変数またはデフォルト設定）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForDanceTeamRin12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dance-team-rin.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dance-team-rin",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dance-team-rin.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

let db = null;
let isFirebaseAvailable = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirebaseAvailable = true;
} catch (e) {
  console.warn('Firebase connection warning (offline / fallback mode):', e);
}

// 1. お知らせ一覧の取得
export async function fetchAnnouncements() {
  if (isFirebaseAvailable && db) {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Firestore fetch error, using fallback announcements:', err);
    }
  }

  // フォールバックデータ
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
    },
    {
      id: '3',
      date: '2026-08-10 18:00',
      category: 'イベント',
      title: '夏祭りステージ写真共有',
      content: '夏祭りお疲れ様でした！練習風景・本番写真は公式ギャラリーよりご確認いただけます。',
      importance: 'normal'
    }
  ];
}

// 2. 会場案内の取得
export async function fetchVenues() {
  if (isFirebaseAvailable && db) {
    try {
      const snapshot = await getDocs(collection(db, 'venues'));
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Firestore fetch error, using fallback venues:', err);
    }
  }

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

// 3. フォーム一覧の取得
export async function fetchForms() {
  if (isFirebaseAvailable && db) {
    try {
      const snapshot = await getDocs(collection(db, 'forms'));
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Firestore fetch error, using fallback forms:', err);
    }
  }

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
    },
    {
      id: 'f2',
      title: '秋公演 衣装サイズ＆備品申請フォーム',
      description: '秋公演用衣装の制作に伴うサイズ申請です。',
      deadline: '2026-08-25 23:59',
      status: 'open',
      fields: [
        { id: 'name', label: 'お名前', type: 'text', required: true },
        { id: 'height', label: '身長 (cm)', type: 'number', required: true },
        { id: 'size', label: '普段のTシャツサイズ', type: 'select', options: ['S', 'M', 'L', 'XL'], required: true },
        { id: 'prop_needed', label: '追加道具（鳴子・扇子など）の追加購入希望', type: 'radio', options: ['不要', '鳴子1セット希望', '扇子1本希望', '両方希望'], required: true },
        { id: 'note', label: '補足事項', type: 'textarea', required: false }
      ]
    }
  ];
}

// 4. フォーム回答の保存 (Firestore)
export async function sendFormResponse(formId, formTitle, respondentName, answers) {
  if (isFirebaseAvailable && db) {
    try {
      await addDoc(collection(db, 'form_responses'), {
        formId,
        formTitle,
        respondentName,
        answers,
        createdAt: serverTimestamp()
      });
      return { success: true, message: 'Firebase (Firestore) にご回答を保存しました！' };
    } catch (err) {
      console.warn('Firestore write failed, saving locally:', err);
    }
  }

  // LocalStorage 保存フォールバック
  const existing = JSON.parse(localStorage.getItem('rin_form_responses') || '[]');
  existing.push({
    formId,
    formTitle,
    respondentName,
    answers,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('rin_form_responses', JSON.stringify(existing));
  return { success: true, message: 'ご回答を保存しました！（ローカル保存完了）' };
}

// 5. メンバー掲示板の投稿取得 (Firestore)
export async function fetchBoardPosts() {
  if (isFirebaseAvailable && db) {
    try {
      const q = query(collection(db, 'board_posts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            author: data.author || '匿名',
            message: data.message || '',
            date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString('ja-JP') : '直近'
          };
        });
      }
    } catch (err) {
      console.warn('Firestore fetch error, using local/fallback board:', err);
    }
  }

  const localPosts = JSON.parse(localStorage.getItem('rin_board_posts') || '[]');
  const defaultPosts = [
    { id: 'b1', date: '2026-08-18 12:30', author: 'あやか', message: '皆様、秋公演に向けて練習頑張りましょう！道案内ページの市民体育館の場所が分かりやすくて助かりました✨' },
    { id: 'b2', date: '2026-08-17 20:15', author: 'たくみ', message: '8/24の練習、少し遅刻参加になりますがよろしくお願いします！' }
  ];

  return [...localPosts, ...defaultPosts];
}

// 6. メンバー掲示板への新規投稿 (Firestore)
export async function saveBoardPost(author, message) {
  if (isFirebaseAvailable && db) {
    try {
      await addDoc(collection(db, 'board_posts'), {
        author,
        message,
        createdAt: serverTimestamp()
      });
      return { success: true, message: 'Firebase (Firestore) に投稿しました！' };
    } catch (err) {
      console.warn('Firestore write failed, saving to LocalStorage:', err);
    }
  }

  const localPosts = JSON.parse(localStorage.getItem('rin_board_posts') || '[]');
  const newPost = {
    id: 'local_' + Date.now(),
    author,
    message,
    date: new Date().toLocaleString('ja-JP')
  };
  localPosts.unshift(newPost);
  localStorage.setItem('rin_board_posts', JSON.stringify(localPosts));
  return { success: true, message: '掲示板に投稿しました！' };
}
