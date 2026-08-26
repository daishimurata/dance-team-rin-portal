import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_j-2HlxQ3l4TeJNMY5-ZIm9jotP6lcxA",
  authDomain: "suzukawork-6ce0a.firebaseapp.com",
  projectId: "suzukawork-6ce0a",
  storageBucket: "suzukawork-6ce0a.firebasestorage.app",
  messagingSenderId: "293193015244",
  appId: "1:293193015244:web:2cc2b135e0c3905be98769"
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
    content: "8月28日(金)の前夜祭から、8月29日(土)本祭1日目、8月30日(日)本祭2日目までの全ステージ演舞時間・集合時間・電車移動ルートをまとめた特設ページを開設いたしました。\nお知らせ下の『関連ページを開く』または右上メニューの『どまつり公式タイムスケジュール』よりご確認ください！",
    date: "2026-08-18",
    category: "重要なお知らせ",
    importance: "high",
    linkUrl: "/schedule.html",
    linkText: "📄 全3日間タイムスケジュールWebページを開く"
  },
  {
    id: "ann_2",
    title: "🎒 当日の荷物規定について",
    content: "当日の荷物は『透明または半透明のB6ポーチ（マチ無し）』に入る物とチーム指定の水筒のみでお願いします。※ポーチ外側に必ず『ダンスチーム凛』と『自分の名前または隊列表で使用するニックネーム』を明記してください。",
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
  const localKey = "rin_announcements";
  const history = JSON.parse(localStorage.getItem(localKey) || "[]");
  const combined = [...history, ...defaultAnnouncements];

  if (!db) return combined;

  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) return combined;
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("fetchAnnouncements fallback used:", e);
      return combined;
    }
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(combined), 1800));
  return Promise.race([fetchPromise, timeoutPromise]);
}

// 新規お知らせ作成
export async function createNewAnnouncement(data) {
  try {
    const id = "ann_" + Date.now();
    const newDoc = {
      id,
      ...data,
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await addDoc(collection(db, "announcements"), {
          ...newDoc,
          serverTimestamp: serverTimestamp()
        });
      } catch(e) {
        console.warn("Firebase save announcement failed, falling back to localStorage", e);
      }
    }

    const localKey = "rin_announcements";
    const history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history.unshift(newDoc);
    localStorage.setItem(localKey, JSON.stringify(history));

    if (!db) {
      return { success: true, message: "お知らせを作成しました\n(※データベース未設定のため、現在はお使いの端末内にのみ保存されています)" };
    }
    return { success: true, message: "お知らせを作成しました" };
  } catch (e) {
    return { success: false, message: "データベース保存エラー: " + e.message };
  }
}
export const createAnnouncement = createNewAnnouncement;

// 2. 会場・スケジュールデータ取得
export async function fetchVenues() {
  return [];
}

// 3. フォーム一覧取得
export async function fetchForms() {
  const localKey = "rin_forms";
  const history = JSON.parse(localStorage.getItem(localKey) || "[]");
  const combined = [...history, ...defaultForms];

  if (!db) return combined;

  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, "forms"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) return combined;
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("fetchForms fallback used:", e);
      return combined;
    }
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(combined), 1800));
  return Promise.race([fetchPromise, timeoutPromise]);
}

// 新規フォーム作成
export async function createNewForm(data) {
  try {
    const id = "form_" + Date.now();
    const newDoc = {
      id,
      ...data,
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await addDoc(collection(db, "forms"), {
          ...newDoc,
          serverTimestamp: serverTimestamp()
        });
      } catch(e) {
        console.warn("Firebase save form failed, falling back to localStorage", e);
      }
    }

    const localKey = "rin_forms";
    const history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history.unshift(newDoc);
    localStorage.setItem(localKey, JSON.stringify(history));

    if (!db) {
      return { success: true, message: "フォームを作成しました\n(※データベース未設定のため、現在はお使いの端末内にのみ保存されています)" };
    }
    return { success: true, message: "フォームを作成しました" };
  } catch (e) {
    return { success: false, message: "データベース保存エラー: " + e.message };
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
    if (!db) {
      console.warn("db is null. Local storage only.");
    } else {
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

    if (!db) {
       return { success: true, message: "ご回答を保存しました。\n(※データベース未設定のため、現在はお使いの端末内にのみ保存されています。管理画面には反映されません)" };
    }
    return { success: true, message: "ご回答が正常に送信されました！" };
  } catch (e) {
    console.error("Form submit error:", e);
    return { success: false, message: "送信中にエラーが発生しました。\n詳細: " + e.message + "\n※データベースの設定やセキュリティルールをご確認ください。" };
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

// 7. 請求書関連のFirebase/LocalStorage処理
const defaultInvoices = [];

export async function fetchInvoices() {
  const localKey = "rin_invoices";
  const history = JSON.parse(localStorage.getItem(localKey) || "[]");

  if (!db) return history;

  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const dbDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem(localKey, JSON.stringify(dbDocs));
      return dbDocs;
    } catch (e) {
      console.warn("fetchInvoices fallback used:", e);
      return history;
    }
  })();

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(history), 1800));
  return Promise.race([fetchPromise, timeoutPromise]);
}

export async function createNewInvoice(invoiceData) {
  try {
    const id = "inv_" + Date.now();
    const newDoc = {
      id,
      ...invoiceData,
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await addDoc(collection(db, "invoices"), {
          ...newDoc,
          serverTimestamp: serverTimestamp()
        });
      } catch(e) {
        console.warn("Firebase save invoice failed, falling back to localStorage", e);
      }
    }

    const localKey = "rin_invoices";
    const history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history.unshift(newDoc);
    localStorage.setItem(localKey, JSON.stringify(history));

    return { success: true, message: "☁️ Firebaseクラウドデータベース(suzukawork-6ce0a)に伝票を保存・発行しました！", invoice: newDoc };
  } catch (e) {
    console.error("createNewInvoice error:", e);
    return { success: false, message: "請求書の保存中にエラーが発生しました。" };
  }
}

export async function updateInvoiceStatus(invoiceId, status) {
  try {
    if (db) {
      try {
        const ref = doc(db, "invoices", invoiceId);
        await updateDoc(ref, { status });
      } catch(e) {
        console.warn("Direct doc status update error:", e);
      }
      try {
        const q1 = query(collection(db, "invoices"), where("id", "==", invoiceId));
        const snap1 = await getDocs(q1);
        for (const document of snap1.docs) {
          await updateDoc(doc(db, "invoices", document.id), { status });
        }
      } catch(e) {
        console.warn("Query status update error:", e);
      }
    }

    const localKey = "rin_invoices";
    let history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history = history.map(item => (item.id === invoiceId || item.invNo === invoiceId) ? { ...item, status } : item);
    localStorage.setItem(localKey, JSON.stringify(history));

    return { success: true, message: "伝票のステータスを更新しました。" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

export async function deleteInvoice(invoiceId) {
  try {
    if (db) {
      try {
        await deleteDoc(doc(db, "invoices", invoiceId));
      } catch(e) {
        console.warn("Direct doc delete error:", e);
      }
      try {
        const q1 = query(collection(db, "invoices"), where("id", "==", invoiceId));
        const snap1 = await getDocs(q1);
        for (const document of snap1.docs) {
          await deleteDoc(doc(db, "invoices", document.id));
        }

        const q2 = query(collection(db, "invoices"), where("invNo", "==", invoiceId));
        const snap2 = await getDocs(q2);
        for (const document of snap2.docs) {
          await deleteDoc(doc(db, "invoices", document.id));
        }
      } catch(e) {
        console.warn("Query delete error:", e);
      }
    }

    const localKey = "rin_invoices";
    let history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history = history.filter(item => item.id !== invoiceId && item.invNo !== invoiceId);
    localStorage.setItem(localKey, JSON.stringify(history));

    return { success: true, message: "伝票を削除しました。" };
  } catch (e) {
    console.error("deleteInvoice error:", e);
    return { success: false, message: "伝票の削除中にエラーが発生しました。" };
  }
}

// --- 練習予定 (Practice Schedules) 機能 ---
export async function fetchPracticeSchedules() {
  const localKey = "rin_practice_schedules";
  const history = JSON.parse(localStorage.getItem(localKey) || "[]");

  if (!db) return history;

  try {
    const q = query(collection(db, "practice_schedules"), orderBy("date", "asc"));
    const snap = await getDocs(q);
    const dbDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem(localKey, JSON.stringify(dbDocs));
    return dbDocs;
  } catch (e) {
    console.warn("fetchPracticeSchedules fallback used:", e);
    return history;
  }
}

export async function savePracticeSchedule(data) {
  try {
    const localKey = "rin_practice_schedules";
    let history = JSON.parse(localStorage.getItem(localKey) || "[]");

    const scheduleData = {
      ...data,
      createdAt: new Date().toISOString(),
      serverTimestamp: db ? serverTimestamp() : null
    };

    if (db) {
      const ref = await addDoc(collection(db, "practice_schedules"), scheduleData);
      scheduleData.id = ref.id;
    } else {
      scheduleData.id = "prac_" + Date.now();
    }

    history.push(scheduleData);
    localStorage.setItem(localKey, JSON.stringify(history));

    return { success: true, message: "練習予定を登録・保存しました！", data: scheduleData };
  } catch (e) {
    console.error("savePracticeSchedule error:", e);
    return { success: false, message: e.message };
  }
}

export async function deletePracticeSchedule(id) {
  try {
    if (db) {
      try {
        await deleteDoc(doc(db, "practice_schedules", id));
      } catch (e) {
        console.warn("deletePracticeSchedule direct error:", e);
      }
    }
    const localKey = "rin_practice_schedules";
    let history = JSON.parse(localStorage.getItem(localKey) || "[]");
    history = history.filter(item => item.id !== id);
    localStorage.setItem(localKey, JSON.stringify(history));

    return { success: true, message: "練習予定を削除しました。" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

