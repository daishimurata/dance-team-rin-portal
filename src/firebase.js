import { initializeApp } from "firebase/app";
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
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDummyApiKeyForRinPortal2026",
  authDomain: "dance-team-rin.firebaseapp.com",
  projectId: "dance-team-rin",
  storageBucket: "dance-team-rin.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase Init fallback:", e);
}

// デフォルトのお知らせフォールバックデータ
const defaultAnnouncements = [
  {
    id: "ann_1",
    title: "🎪 にっぽんど真ん中祭り 全3日間タイムスケジュール公開中！",
    content: "8月28日(金)の前夜祭から、8月29日(土)本祭1日目、8月30日(日)本祭2日目までの全ステージ演舞時間・集合時間・電車移動ルート・問合番号をまとめた特設ページを開設いたしました。\nお知らせ下の『関連ページを開く』または右上メニューの『どまつり公式タイムスケジュール』よりご確認ください！",
    date: "2026-08-18",
    category: "重要なお知らせ",
    importance: "high",
    linkUrl: "/schedule.html",
    linkText: "📄 全3日間タイムスケジュールWebページを開く"
  },
  {
    id: "ann_2",
    title: "🎒 演舞エリア持ち込みポーチ規定について",
    content: "どまつり本番の演舞エリアへ持ち込める手荷物は『B6サイズ透明/半透明ポーチ（マチ無し）』限定となります。お財布・ドニチカ切符・スマホ・保険証等を必ず準備してください。",
    date: "2026-08-17",
    category: "ルール規定",
    importance: "medium",
    linkUrl: "/schedule.html",
    linkText: "🎒 持参品チェックリストを開く"
  }
];

// デフォルトのフォームデータ（ダミーなし・本番データ専用）
const defaultForms = [];

// 1. お知らせ一覧取得（1.8秒でフォールバック）
export async function fetchAnnouncements() {
  if (!db) return defaultAnnouncements;

  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) return defaultAnnouncements;
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("fetchAnnouncements fallback used:", e);
      return defaultAnnouncements;
    }
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(defaultAnnouncements), 1800));
  return Promise.race([fetchPromise, timeoutPromise]);
}

// 新規お知らせ作成
export async function createNewAnnouncement(data) {
  try {
    if (db) {
      await addDoc(collection(db, "announcements"), {
        ...data,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
    }
    return { success: true, message: "お知らせを作成しました" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
export const createAnnouncement = createNewAnnouncement;

// 2. 会場・スケジュールデータ取得
export async function fetchVenues() {
  return [];
}

// 3. フォーム一覧取得
export async function fetchForms() {
  if (!db) return defaultForms;

  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, "forms"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) return defaultForms;
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("fetchForms fallback used:", e);
      return defaultForms;
    }
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(defaultForms), 1800));
  return Promise.race([fetchPromise, timeoutPromise]);
}

// 新規フォーム作成
export async function createNewForm(data) {
  try {
    if (db) {
      await addDoc(collection(db, "forms"), {
        ...data,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
    }
    return { success: true, message: "フォームを作成しました" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// フォームステータス更新
export async function updateFormStatus(formId, status) {
  try {
    if (db) {
      const ref = doc(db, "forms", formId);
      await updateDoc(ref, { status });
    }
    return { success: true, message: "ステータスを更新しました" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// 4. フォーム回答送信
export async function sendFormResponse(formId, formTitle, respondentName, answers) {
  try {
    if (db) {
      await addDoc(collection(db, "form_responses"), {
        formId,
        formTitle,
        respondentName,
        answers,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
    }

    const localKey = "rin_my_responses";
    const history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history.unshift({
      formId,
      formTitle,
      respondentName,
      answers,
      timestamp: new Date().toLocaleString("ja-JP")
    });
    localStorage.setItem(localKey, JSON.stringify(history));

    return { success: true, message: "ご回答が正常に送信されました！" };
  } catch (e) {
    console.error("Form submit error:", e);
    return { success: false, message: "送信中にエラーが発生しました。" };
  }
}

// 5. 自分の過去回答検索
export async function fetchMyFormResponses(respondentName) {
  const localKey = "rin_my_responses";
  const history = JSON.parse(localStorage.getItem(localKey) || "[]");
  const filteredLocal = history.filter(r => r.respondentName.trim().toLowerCase() === respondentName.trim().toLowerCase());

  if (!db) return filteredLocal;

  try {
    const q = query(
      collection(db, "form_responses"), 
      where("respondentName", "==", respondentName.trim())
    );
    const snap = await getDocs(q);
    const dbResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return dbResults.length > 0 ? dbResults : filteredLocal;
  } catch (e) {
    console.warn("fetchMyFormResponses fallback used:", e);
    return filteredLocal;
  }
}

// 6. 全回答一覧取得（管理者用）
export async function fetchAllFormResponses(formId) {
  const localKey = "rin_my_responses";
  const history = JSON.parse(localStorage.getItem(localKey) || "[]");
  const filteredLocal = formId ? history.filter(r => r.formId === formId) : history;

  if (!db) return filteredLocal;

  try {
    let q = collection(db, "form_responses");
    if (formId) {
      q = query(q, where("formId", "==", formId));
    }
    const snap = await getDocs(q);
    const dbResults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return dbResults.length > 0 ? dbResults : filteredLocal;
  } catch (e) {
    return filteredLocal;
  }
}
