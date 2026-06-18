/**
 * firebase-orders.js
 * نظام الطلبات المتصل بـ Firebase Realtime Database
 * لذة الملوك — Lazat Al-Molouk
 */

// ─── Firebase Config ───────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAL83w-3k6hawV9APwjB42BRs1ibcPQ2Zg",
  authDomain: "dashpoard-menu.firebaseapp.com",
  databaseURL: "https://dashpoard-menu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dashpoard-menu",
  storageBucket: "dashpoard-menu.firebasestorage.app",
  messagingSenderId: "523221788596",
  appId: "1:523221788596:web:0d52eb3c259c20c39834e1"
};

// ─── Firebase SDK (CDN) ────────────────────────────────────────────────────
// يتم تحميل Firebase عبر CDN في الـ HTML

const FIREBASE_DB_URL = FIREBASE_CONFIG.databaseURL;

// ─── Firebase REST API Helper ──────────────────────────────────────────────
// نستخدم REST API بدل SDK عشان أسهل في التكامل

const FirebaseDB = {
  
  /**
   * بعت طلب جديد لـ Firebase
   */
  async pushOrder(orderData) {
    try {
      const url = `${FIREBASE_DB_URL}/orders.json?auth=`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) throw new Error("فشل في إرسال الطلب");
      const result = await response.json();
      return result.name; // Firebase key
    } catch (err) {
      console.error("Firebase Error:", err);
      throw err;
    }
  },

  /**
   * جيب كل الطلبات
   */
  async getOrders() {
    try {
      const url = `${FIREBASE_DB_URL}/orders.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("فشل في جلب الطلبات");
      const data = await response.json();
      if (!data) return [];
      
      return Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value
      })).sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
      console.error("Firebase Error:", err);
      return [];
    }
  },

  /**
   * تحديث حالة الطلب
   */
  async updateOrderStatus(firebaseKey, status) {
    try {
      const url = `${FIREBASE_DB_URL}/orders/${firebaseKey}.json`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: status,
          updatedAt: Date.now()
        })
      });
      if (!response.ok) throw new Error("فشل تحديث الحالة");
      return true;
    } catch (err) {
      console.error("Firebase Error:", err);
      return false;
    }
  },

  /**
   * حذف طلب
   */
  async deleteOrder(firebaseKey) {
    try {
      const url = `${FIREBASE_DB_URL}/orders/${firebaseKey}.json`;
      const response = await fetch(url, { method: "DELETE" });
      return response.ok;
    } catch (err) {
      console.error("Firebase Error:", err);
      return false;
    }
  },

  /**
   * Real-time listener باستخدام SSE (Server-Sent Events)
   */
  listenToOrders(callback) {
    const url = `${FIREBASE_DB_URL}/orders.json`;
    
    // Polling كل 5 ثواني (Firebase REST لا يدعم SSE بدون SDK)
    let lastData = null;
    
    const poll = async () => {
      const orders = await this.getOrders();
      const currentData = JSON.stringify(orders);
      
      if (currentData !== lastData) {
        lastData = currentData;
        callback(orders);
      }
    };

    poll(); // أول مرة فوراً
    const interval = setInterval(poll, 5000); // كل 5 ثواني
    
    return () => clearInterval(interval); // دالة لإيقاف الـ listener
  }
};

// ─── Order Builder ─────────────────────────────────────────────────────────

const OrderBuilder = {
  
  /**
   * بناء بيانات الطلب من السلة
   */
  buildFromCart(cart, options = {}) {
    const {
      customerPhone = "",
      deliveryType = "delivery",
      area = null,
      deliveryFee = 0,
      notes = ""
    } = options;

    const itemsTotal = cart.reduce((sum, item) => 
      sum + (item.price || 0) * item.quantity, 0);

    const orderNumber = this.generateOrderNumber();

    return {
      orderNumber,
      timestamp: Date.now(),
      status: "pending", // pending | accepted | preparing | ready | completed | rejected
      customerPhone,
      deliveryType,
      area: area || null,
      deliveryFee,
      notes,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      })),
      itemsTotal,
      grandTotal: itemsTotal + deliveryFee
    };
  },

  generateOrderNumber() {
    const counter = Number(localStorage.getItem("orderCounter") || 1000) + 1;
    localStorage.setItem("orderCounter", counter);
    return counter;
  }
};

// ─── Status Labels ─────────────────────────────────────────────────────────

const ORDER_STATUS = {
  pending:    { label: "⏳ جديد",       color: "#f59e0b", bg: "#fef3c7" },
  accepted:   { label: "✅ مقبول",      color: "#10b981", bg: "#d1fae5" },
  preparing:  { label: "👨‍🍳 قيد التحضير", color: "#3b82f6", bg: "#dbeafe" },
  ready:      { label: "🚀 جاهز",       color: "#8b5cf6", bg: "#ede9fe" },
  completed:  { label: "✔️ مكتمل",      color: "#6b7280", bg: "#f3f4f6" },
  rejected:   { label: "❌ مرفوض",      color: "#ef4444", bg: "#fee2e2" }
};

// ─── Export ────────────────────────────────────────────────────────────────
window.FirebaseDB = FirebaseDB;
window.OrderBuilder = OrderBuilder;
window.ORDER_STATUS = ORDER_STATUS;
