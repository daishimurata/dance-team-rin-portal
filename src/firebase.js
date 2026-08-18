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
      category: '重要・演舞',
      title: '秋のよさこいお祭り演舞スケジュール決定について',
      content: '皆様お疲れ様です！9月のお祭り演舞スケジュールが決定いたしました。演舞会場タブより本番演舞時間・集合時間・会場アクセスをご確認ください。',
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

// 2. お祭り演舞会場 ＆ アクセス案内 API
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
      id: 'v_festival_1',
      type: 'festival',
      name: '🎪 〇〇秋よさこい祭り メイン演舞ステージ',
      eventDate: '2026年9月15日(月・祝)',
      performanceTime: '1st: 14:00〜 / 2nd: 16:30〜 (本演舞)',
      meetingTime: '12:30 集合 (楽屋テント前)',
      costume: '秋本番衣装（赤×黒ハンテン、鳴子必携）',
      access: '〇〇駅 東口 徒歩3分（駅前大通り特設会場）',
      address: '東京都〇〇区駅前大通り1-1',
      mapUrl: 'https://maps.google.com/?q=〇〇駅',
      directions: '1. 東口改札を出て正面の歩行者天国通りへ進みます。\n2. 大型モニター前がチーム「凛」集合テントです。',
      notice: '着替え用テントは12:00より利用可能。貴重品は個人管理でお願いします。'
    },
    {
      id: 'v_festival_2',
      type: 'festival',
      name: '🎪 市民夏祭り パレード演舞会場',
      eventDate: '2026年8月24日(日)',
      performanceTime: 'パレード流し演舞: 15:00〜16:00',
      meetingTime: '14:00 集合 (パレードスタート地点前)',
      costume: '夏Tシャツ＋帯（黒パンツ・スニーカー）',
      access: '〇〇中央駅 南口 徒歩5分',
      address: '東京都〇〇区南町2-3-4',
      mapUrl: 'https://maps.google.com/?q=〇〇中央駅',
      directions: '1. 南口バスロータリーを抜け、商店街を直進。\n2. 信号角のローソン前がスタート地点です。',
      notice: '水分補給（スポーツドリンク等）を必ずご持参ください。'
    },
    {
      id: 'v_practice_1',
      type: 'practice',
      name: '🏢 市民体育館 アリーナ（メイン練習場）',
      eventDate: '毎週土曜日 13:00〜17:00',
      performanceTime: '全体練習・フォーメーション確認',
      meetingTime: '12:45 集合',
      costume: '練習着・室内シューズ',
      access: '〇〇駅 南口 徒歩8分',
      address: '東京都〇〇区中央1-2-3',
      mapUrl: 'https://maps.google.com/?q=市民体育館',
      directions: '1. 南口改札を出て右折し、商店街を直進します。\n2. 2つ目の信号（ファミリーマート）を左折。\n3. 100mほど進んだ右側の大きな建物です。',
      notice: '室内履き必携。入館時は受付で「ダンスチーム凛」とお伝えください。'
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
      title: '9月15日(祝) 秋よさこい祭り 演舞参加可否フォーム',
      description: '9/15(祝) 〇〇秋よさこい祭りへの演舞参加可否を8/25までにご回答ください。',
      deadline: '2026-08-25 23:59',
      status: 'open',
      fields: [
        { id: 'name', label: 'お名前（ダンサー名/本名）', type: 'text', helpText: '本名またはチーム内ニックネームを入力してください', required: true },
        { id: 'attendance', label: '演舞参加区分', type: 'radio', options: ['全演舞参加可能', '1stのみ参加', '2ndのみ参加', 'サポートスタッフ参加', '不参加'], required: true },
        { id: 'car', label: '移動手段・配車（複数選択可）', type: 'checkbox', options: ['電車・徒歩', '自家用車（同乗OK）', '配車希望'], required: false },
        { id: 'comment', label: '連絡事項・備考メモ', type: 'textarea', required: false }
      ]
    },
    {
      id: 'f2',
      title: '秋演舞 新衣装サイズ＆道具申請フォーム',
      description: '秋演舞用衣装の制作に伴うサイズ申請およびアンケートです。',
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

export async function fetchBoardPosts() {
  return [];
}
export async function saveBoardPost() {
  return { success: true, message: 'OK' };
}
