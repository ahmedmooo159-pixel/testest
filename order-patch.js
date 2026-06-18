/**
 * order-patch.js
 * ─────────────────────────────────────────────────────────────
 * أضف هذا الملف في index.html قبل main.js مباشرة:
 *
 *   <script src="firebase-orders.js"></script>
 *   <script src="order-patch.js"></script>
 *   <script src="main.js"></script>
 *
 * الملف ده بيعدّل دالة إرسال الطلب عشان:
 *   1. يبعت الطلب لـ Firebase (شاشة المطعم)
 *   2. يفتح واتساب كمان (للتأكيد)
 * ─────────────────────────────────────────────────────────────
 */

// ─── Override finalizeOrderWithArea ──────────────────────────────────────────
// بعد ما يتحمل main.js، هنعدل الدالة دي
document.addEventListener('DOMContentLoaded', function () {

  // نحتفظ بالدالة الأصلية للواتساب
  const _originalFinalize = window.finalizeOrderWithArea;

  window.finalizeOrderWithArea = async function (area, deliveryFee) {
    // جيب السلة الحالية
    const currentCart = window._getCart ? window._getCart() : (window.cart || []);

    if (!currentCart || currentCart.length === 0) return;

    // بيانات الطلب
    const contactInput = document.getElementById('user-contact') ||
                         document.getElementById('user-contact-drawer');
    const customerPhone = contactInput ? contactInput.value.trim() : '';

    const notesEl = document.getElementById('order-notes');
    const notes = notesEl ? notesEl.value.trim() : (window._pendingOrderNotes || '');

    const deliveryRadio = document.querySelector('input[name="delivery-type"]:checked');
    const deliveryType = deliveryRadio ? deliveryRadio.value : 'delivery';

    // ─── 1. إرسال لـ Firebase ───────────────────────────────────────────
    try {
      const orderData = OrderBuilder.buildFromCart(currentCart, {
        customerPhone,
        deliveryType,
        area,
        deliveryFee: deliveryFee || 0,
        notes
      });

      const firebaseKey = await FirebaseDB.pushOrder(orderData);
      console.log('✅ الطلب وصل Firebase:', firebaseKey);

      // إظهار رسالة نجاح
      showOrderSuccess(orderData.orderNumber);

    } catch (err) {
      console.error('❌ Firebase Error:', err);
      // لو Firebase فشل، نكمل بالواتساب على طول
    }

    // ─── 2. فتح واتساب كمان (اختياري — احذف السطر ده لو مش عايزه) ──────
    if (_originalFinalize) {
      _originalFinalize(area, deliveryFee);
    }
  };

  // ─── Helper: شاشة تأكيد الطلب ─────────────────────────────────────────────
  function showOrderSuccess(orderNumber) {
    // إنشاء overlay تأكيد
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background: #fff; border-radius: 20px;
        padding: 2.5rem 2rem; text-align: center;
        max-width: 340px; width: 90%;
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">✅</div>
        <h2 style="
          font-family: 'Cairo', sans-serif;
          font-size: 1.4rem; font-weight: 900;
          color: #5c0000; margin-bottom: 0.5rem;
        ">تم استلام طلبك!</h2>
        <p style="
          font-family: 'Cairo', sans-serif;
          color: #666; font-size: 0.95rem; margin-bottom: 1rem;
        ">رقم طلبك: <strong style="color:#800000; font-size:1.2rem">#${orderNumber}</strong></p>
        <p style="
          font-family: 'Cairo', sans-serif;
          color: #888; font-size: 0.85rem; margin-bottom: 1.5rem;
        ">سيتواصل معك المطعم قريباً عبر واتساب 🚀</p>
        <button onclick="this.closest('div[style]').parentElement.remove()" style="
          background: #800000; color: #fff;
          border: none; border-radius: 50px;
          padding: 0.8rem 2rem;
          font-family: 'Cairo', sans-serif;
          font-size: 1rem; font-weight: 700;
          cursor: pointer; width: 100%;
        ">حسناً 👍</button>
      </div>
      <style>
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // إغلاق تلقائي بعد 5 ثواني
    setTimeout(() => {
      if (overlay.parentElement) overlay.remove();
    }, 5000);
  }

});
