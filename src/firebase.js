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

// ----------------------------------------------------
// 1. お知らせ (Announcements) API
// ----------------------------------------------------
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
  return [...local, ...defaultList];
}

export async function createAnnouncement(category, title, content, importance) {
  const dateStr = new Date().toLocaleString('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  const newObj = { category, title, content, importance, date: dateStr };

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

// ----------------------------------------------------
// 2. 会場案内 (Venues) API
// ----------------------------------------------------
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

// ----------------------------------------------------
// 3. フォーム定義 ＆ Google Forms 互換拡張 API
// ----------------------------------------------------
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
      title: '8月24日(日) 全体練習 出欠確認',
      description: '8/24(日) 13:00〜17:00 市民体育館での全体練習の参加可否をご回答ください。',
      deadline: '2026-08-22 23:59',
      status: 'open',
      fields: [
        { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', helpText: '本名またはチーム内ニックネームを入力してください', required: true },
        { id: 'attendance', label: '出欠区分', type: 'radio', options: ['参加', '遅刻参加', '早退', '欠席'], required: true },
        { id: 'car', label: '移動手段・配車可能か（複数選択可）', type: 'checkbox', options: ['徒歩・電車', '車（同乗可能）', '送迎希望'], required: false },
        { id: 'time', label: '遅刻・早退の予定時間（該当者のみ）', type: 'text', required: false },
        { id: 'comment', label: '連絡事項・連絡メモ', type: 'textarea', required: false }
      ]
    },
    {
      id: 'f2',
      title: '秋公演 衣装サイズ＆備品申請フォーム',
      description: '秋公演用衣装の制作に伴うサイズ申請およびアンケートです。',
      deadline: '2026-08-25 23:59',
      status: 'open',
      fields: [
        { id: 'name', label: 'お名前', type: 'text', required: true },
        { id: 'height', label: '身長 (cm)', type: 'number', helpText: '衣装丈の参考にします', required: true },
        { id: 'size', label: '普段のTシャツサイズ', type: 'select', options: ['S', 'M', 'L', 'XL'], required: true },
        { id: 'prop_needed', label: '追加道具の希望（複数選択可）', type: 'checkbox', options: ['鳴子1セット', '扇子1本', '演舞用ハチマキ'], required: false },
        { id: 'satisfaction', label: '新衣装デザインの満足度', type: 'scale', min: 1, max: 5, minLabel: '不満', maxLabel: '非常に満足', required: true },
        { id: 'note', label: '補足事項・連絡欄', type: 'textarea', required: false }
      ]
    }
  ];
  return [...local, ...defaultForms];
}

// フォームの新規発行 (管理者用)
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

// フォーム受付ステータス（受付中/受付停止）の変更 (管理者用)
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

// ----------------------------------------------------
// 4. 回答データの保存 ＆ 集計 API
// ----------------------------------------------------
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

// ----------------------------------------------------
// 5. メンバー掲示板 (Board) API
// ----------------------------------------------------
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
      console.warn('Firestore fetch error, reading local board:', err);
    }
  }

  const localPosts = JSON.parse(localStorage.getItem('rin_board_posts') || '[]');
  const defaultPosts = [
    { id: 'b1', date: '2026-08-18 12:30', author: 'あやか', message: '皆様、秋公演に向けて練習頑張りましょう！道案内ページの市民体育館の場所が分かりやすくて助かりました✨' },
    { id: 'b2', date: '2026-08-17 20:15', author: 'たくみ', message: '8/24の練習、少し遅刻参加になりますがよろしくお願いします！' }
  ];

  return [...localPosts, ...defaultPosts];
}

export async function saveBoardPost(author, message) {
  if (isFirebaseAvailable && db) {
    try {
      await addDoc(collection(db, 'board_posts'), {
        author,
        message,
        createdAt: serverTimestamp()
      });
      return { success: true, message: '掲示板に投稿しました！' };
    } catch (err) {
      console.warn('Firestore write error, local board fallback:', err);
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
