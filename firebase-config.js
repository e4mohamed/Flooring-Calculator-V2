// =========================================================================
// firebase-config.js — إعداد Firebase المشترك (يُستخدم في index.html و products.html)
// =========================================================================
// ملاحظة: هذا الملف آمن للنشر العلني على GitHub. مفاتيح Firebase Web هنا
// ليست "سرية" بالمعنى التقليدي؛ الحماية الفعلية تتم عبر قواعد الأمان
// (Security Rules) في Firestore، وعبر تسجيل دخول الأدمن (Firebase Auth).
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAKU_571ofux25Rob--Y4q1ymvvuLXppAc",
  authDomain: "stac-c367e.firebaseapp.com",
  projectId: "stac-c367e",
  storageBucket: "stac-c367e.firebasestorage.app",
  messagingSenderId: "668970731747",
  appId: "1:668970731747:web:a6bb99e922b67fb3dc1dd6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// single shared document holding all product/pricing data
export const PRODUCTS_DOC_PATH = ["app_data", "products"];
