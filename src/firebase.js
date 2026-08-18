import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  query, 
  where,
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

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
  console.warn('Firebase connection warning (fallback mode):', e);
}

// 1. お知らせ
export async function fetchAnnouncements() {
  if (isFirebaseAvailable && db) {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Firestore fetch error, fallback announcements:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_announcements') || '[]');
  const defaultList = [
    {
      id: '1',
      date: '2026-08-18 10:00',
      category: '重要・どまつり演舞',
      title: 'にっぽんど真ん中祭り 演舞タイムスケジュール決定',
      content: '皆様お疲れ様です！「にっぽんど真ん中祭り（どまつり）」の本番演舞タイムスケジュールが決定いたしました。下記リンクより演舞タイムスケジュール専用Webページを開いて本番時間・集合場所をご確認ください。',
      importance: 'high',
      linkUrl: '/schedule.html',
      linkText: '🎪 にっぽんど真ん中祭り タイムスケジュール専用ページを開く'
    },
    {
      id: '2',
      date: '2026-08-15 15:30',
      category: '衣装・備品',
      title: 'どまつり演舞衣装・鳴子チェックのお願い',
      content: 'どまつり本番に向けて、新衣装および鳴子・演舞小道具の確認をお願いします。不備がある場合はフォームタブより申請をお願いします！',
      importance: 'medium'
    }
  ];
  return [...local, ...defaultList];
}

export async function createAnnouncement(category, title, content, importance, linkUrl = '', linkText = '') {
  const dateStr = new Date().toLocaleString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  const newObj = { category, title, content, importance, date: dateStr, linkUrl, linkText };

  if (isFirebaseAvailable && db) {
    try {
      await addDoc(collection(db, 'announcements'), {
        ...newObj,
        createdAt: serverTimestamp()
      });
      return { success: true, message: 'お知らせを公開しました！' };
    } catch (err) {
      console.warn('Firestore write error, local fallback:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_announcements') || '[]');
  local.unshift({ id: 'loc_' + Date.now(), ...newObj });
  localStorage.setItem('rin_announcements', JSON.stringify(local));
  return { success: true, message: 'お知らせを投稿しました（ローカル保存）' };
}

// 2. にっぽんど真ん中祭り（どまつり）演舞タイムスケジュール API
export async function fetchVenues() {
  if (isFirebaseAvailable && db) {
    try {
      const snapshot = await getDocs(collection(db, 'venues'));
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Firestore fetch error, fallback venues:', err);
    }
  }

  return [
    {
      id: 'v_domatsuri_main',
      type: 'festival',
      name: '🎪 にっぽんど真ん中祭り 久屋大通公園 メインステージ',
      eventDate: '2026年8月29日(土)・30日(日)',
      meetingTime: '11:30 集合 (久屋大通公園 チーム「凛」楽屋テント前)',
      costume: '正装衣装（赤×金ハンテン・白袴・鳴子必携）',
      access: '地下鉄名城線「矢場町駅」徒歩1分 / 「栄駅」徒歩3分',
      address: '愛知県名古屋市中区栄3-65 久屋大通公園会場',
      mapUrl: 'https://maps.google.com/?q=久屋大通公園',
      scheduleUrl: '/schedule.html',
      directions: '1. 矢場町駅 6番出口を出て久屋大通公園中央エリアへ。\n2. メインステージ裏手「チーム「凛」特設テント」へ集合。',
      notice: '本番30分前に袖集合。熱中症対策（水分・塩分タブレット）を徹底してください。',
      scheduleTimeline: [
        { time: '11:30', event: '楽屋テント集合・衣装＆メイク最終チェック' },
        { time: '12:15', event: '公式ウォーミングアップエリアへ移動' },
        { time: '13:00', event: '🔥 1st 演舞（久屋大通公園 メインステージ）' },
        { time: '14:30', event: 'パレード会場へ移動・移動車手配' },
        { time: '15:45', event: '🔥 2nd 演舞（大須観音 パレード会場）' },
        { time: '17:30', event: '🔥 3rd 演舞（栄交差点 特設ステージ演舞）' },
        { time: '19:00', event: '総踊り ＆ 全演舞終了・集合写真撮影' }
      ]
    }
  ];
}

// 3. フォーム定義
export async function fetchForms() {
  if (isFirebaseAvailable && db) {
    try {
      const snapshot = await getDocs(collection(db, 'forms'));
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Firestore fetch error, fallback forms:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_created_forms') || '[]');
  const defaultForms = [
    {
      id: 'f1',
      title: 'にっぽんど真ん中祭り（どまつり） 演舞参加可否回答フォーム',
      description: 'にっぽんど真ん中祭り（どまつり）本番演舞への参加可否をご回答ください。',
      deadline: '2026-08-25 23:59',
      status: 'open',
      fields: [
        { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', helpText: '本名またはチーム内ニックネームを入力してください', required: true },
        { id: 'attendance', label: 'どまつり演舞参加区分', type: 'radio', options: ['両日（8/29・30）参加可能', '8/29(土)のみ参加', '8/30(日)のみ参加', 'サポートスタッフ参加', '不参加'], required: true },
        { id: 'car', label: '移動・宿泊手配（複数選択可）', type: 'checkbox', options: ['チームバス利用', '現地集合（自家用車・電車）', 'チーム手配ホテル宿泊希望'], required: false },
        { id: 'comment', label: '連絡事項・備考メモ', type: 'textarea', required: false }
      ]
    }
  ];
  return [...local, ...defaultForms];
}

export async function createNewForm(title, description, deadline, fields) {
  const formId = 'f_' + Date.now();
  const formObj = {
    id: formId,
    title,
    description,
    deadline,
    status: 'open',
    fields,
    createdAt: new Date().toISOString()
  };

  if (isFirebaseAvailable && db) {
    try {
      await addDoc(collection(db, 'forms'), formObj);
      return { success: true, message: '新しいフォームを発行・公開しました！' };
    } catch (err) {
      console.warn('Firestore write error, local fallback:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_created_forms') || '[]');
  local.unshift(formObj);
  localStorage.setItem('rin_created_forms', JSON.stringify(local));
  return { success: true, message: '新しいフォームを発行しました！（ローカル保存完了）' };
}

export async function updateFormStatus(formId, newStatus) {
  if (isFirebaseAvailable && db) {
    try {
      const q = query(collection(db, 'forms'), where('id', '==', formId));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = doc(db, 'forms', snapshot.docs[0].id);
        await updateDoc(docRef, { status: newStatus });
        return { success: true, message: '受付ステータスを変更しました！' };
      }
    } catch (err) {
      console.warn('Firestore update error:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_created_forms') || '[]');
  const target = local.find(f => f.id === formId);
  if (target) {
    target.status = newStatus;
    localStorage.setItem('rin_created_forms', JSON.stringify(local));
  }
  return { success: true, message: '受付ステータスを変更しました（ローカル更新）' };
}

// 4. 回答送信 ＆ 集計
export async function sendFormResponse(formId, formTitle, respondentName, answers) {
  const payload = {
    formId,
    formTitle,
    respondentName,
    answers,
    timestamp: new Date().toLocaleString('ja-JP')
  };

  if (isFirebaseAvailable && db) {
    try {
      await addDoc(collection(db, 'form_responses'), {
        ...payload,
        createdAt: serverTimestamp()
      });
      return { success: true, message: 'ご回答ありがとうございます！送信が完了しました。' };
    } catch (err) {
      console.warn('Firestore write error, local fallback:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_form_responses') || '[]');
  local.push(payload);
  localStorage.setItem('rin_form_responses', JSON.stringify(local));
  return { success: true, message: 'ご回答ありがとうございます！送信が完了しました（ローカル保存）' };
}

export async function fetchMyFormResponses(respondentName) {
  if (!respondentName) return [];

  if (isFirebaseAvailable && db) {
    try {
      const q = query(
        collection(db, 'form_responses'), 
        where('respondentName', '==', respondentName)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data());
      }
    } catch (err) {
      console.warn('Firestore query error, filtering locally:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_form_responses') || '[]');
  return local.filter(r => r.respondentName === respondentName);
}

export async function fetchAllFormResponses(formId) {
  if (isFirebaseAvailable && db) {
    try {
      let q = collection(db, 'form_responses');
      if (formId) {
        q = query(collection(db, 'form_responses'), where('formId', '==', formId));
      }
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data());
      }
    } catch (err) {
      console.warn('Firestore fetch error, reading local responses:', err);
    }
  }

  const local = JSON.parse(localStorage.getItem('rin_form_responses') || '[]');
  if (formId) {
    return local.filter(r => r.formId === formId);
  }
  return local;
}

export async function fetchBoardPosts() { return []; }
export async function saveBoardPost() { return { success: true, message: 'OK' }; }
