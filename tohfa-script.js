// tohfa/tohfa-script.js

/* ==========================================================
   1) الإعدادات العامة وتحميل السلة من المتصفح
   - CART_STORAGE_KEY: مفتاح واحد موحّد بنستخدمه في كل مكان بدل ما
     نكتب النص "TOHFA_CART" يدوي في أكتر من دالة (زي ما كان بيحصل
     قبل كده، وده اللي سبب باج إن السلة ما كانتش بتتمسح بعد الطلب
     لأن مكان كان بيمسح مفتاح باسم مختلف "TOHFA_STORE_CART")
   ========================================================== */
const CART_STORAGE_KEY = 'TOHFA_CART';
let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

/* ==========================================================
   2) تشغيل الكود عند تحميل الصفحة
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    // 🐞 تم نقل تأثير النافبار عند السكرول هنا جوه DOMContentLoaded
    // عشان نتأكد إن عنصر .navbar موجود فعلاً قبل ما نتعامل معاه
    const nav = document.querySelector('.navbar');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
});

/* ==========================================================
   3) فتح / قفل السلة الجانبية
   🐞 تم إصلاح: كانت بتقفل سكرول الصفحة بـ inline style مباشر
   (document.body.style.overflow) وده مش نفس الطريقة اللي باقي
   الكود (checkout) بيستخدمها (كلاس stop-scrolling). دلوقتي الاتنين
   بيستخدموا نفس الكلاس عشان يكونوا متسقين مع ملفات الـ CSS.
   ========================================================== */
function toggleCart() {
    const cartOverlay = document.getElementById('cartOverlay');
    if (!cartOverlay) return;

    cartOverlay.classList.toggle('active');
    document.body.classList.toggle('stop-scrolling', cartOverlay.classList.contains('active'));
}

/* ==========================================================
   4) إضافة منتج للسلة
   - لو المنتج موجود بالفعل بيزود الكمية بس، غير كده بيضيفه جديد
   - بيعمل أنيميشن بسيط على زرار "أضف للسلة" (تمت الإضافة ✔)
   🐞 تم إصلاح: كانت بتعتمد على المتغير العام event مباشرة، ده بيشتغل
   بس لما الدالة متنادية من onclick="" جوه الـ HTML مباشرة. خليتها
   تستقبل الزرار كباراميتر اختياري عشان تشتغل حتى لو اتنادت من
   جافاسكريبت تاني (addEventListener مثلاً) من غير ما تتكسر.
   ========================================================== */
function addToCart(name, price, img, btn) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, img, qty: 1 });
    }
    saveAndRefresh();

    // أنيميشن زرار الطلب: بيقبل الزرار كباراميتر، ولو مش موصول بيرجع
    // لـ event.target (للتوافق مع onclick="addToCart(...)" القديمة)
    const targetBtn = btn || (typeof event !== 'undefined' ? event.target : null);
    if (targetBtn) {
        const oldText = targetBtn.innerText;
        targetBtn.innerText = "تمت الإضافة ✔";
        targetBtn.disabled = true;
        setTimeout(() => {
            targetBtn.innerText = oldText;
            targetBtn.disabled = false;
        }, 1500);
    }
}

/* ==========================================================
   4-ب) طلب منتج واحد مباشرة ("طلب المنتج")
   🐞 تم إصلاح: كل صفحات المنتجات كان فيها نظام طلب قديم منفصل
   (openForm / closeForm / sendOrder) بيستخدم نفس الـ IDs بالظبط
   اللي بيستخدمها نظام السلة الجديد (orderModal, orderForm, mTitle,
   submitBtn...). لما يتكرر نفس الـ ID مرتين في نفس الصفحة،
   getElementById بياخد أول عنصر بس - يعني زرار "إتمام الطلب" في
   السلة كان أحياناً بيفتح المودال أو يكتب في الفورم الغلط.
   الحل: نظام طلب واحد موحّد بس. الدالة دي بتضيف المنتج للسلة
   فوراً وتفتح فورم الطلب على طول، فبتدي نفس تجربة "اطلب دلوقتي"
   من غير ما يتكرر أي عنصر في الصفحة.
   ========================================================== */
function orderNow(name, price, img) {
    addToCart(name, price, img);
    checkout();
}

/* ==========================================================
   5) تغيير كمية منتج في السلة (+ / -)
   لو الكمية نزلت لأقل من 1 بيشيل المنتج من السلة تلقائياً
   ========================================================== */
function changeQty(index, delta) {
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty < 1) return removeFromCart(index);
    saveAndRefresh();
}

/* ==========================================================
   6) حذف منتج من السلة نهائياً
   ========================================================== */
function removeFromCart(index) {
    cart.splice(index, 1);
    saveAndRefresh();
}

/* ==========================================================
   7) حفظ السلة في localStorage وتحديث الواجهة فوراً
   ========================================================== */
function saveAndRefresh() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
}

/* ==========================================================
   8) رسم عناصر السلة في الواجهة + حساب الإجمالي + تحديث البادج
   🐞 تم إصلاح: أضفنا تحقق (guard) على badge و totalDisp زي ما كان
   موجود بالفعل على list، عشان لو أي عنصر منهم مش موجود في الـ HTML
   الكود ميرميش error ويوقف تنفيذ باقي السكريبت.
   ========================================================== */
function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const badge = document.getElementById('cartBadge');
    const totalDisp = document.getElementById('cartTotal');

    if (!list) return;

    list.innerHTML = '';
    let total = 0;
    let count = 0;

    cart.forEach((item, index) => {
        let priceNum = parseFloat(item.price.toString().replace(/[^\d.]/g, ''));
        total += (priceNum * item.qty);
        count += item.qty;

        list.innerHTML += `
            <div class="cart-item animate-reveal">
                <img src="${item.img}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="price-tag">${item.price}</div>
                    <div class="qty-btn-group">
                        <button onclick="changeQty(${index}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="remove-item" onclick="removeFromCart(${index})">&times;</div>
            </div>
        `;
    });

    if (badge) badge.innerText = count;
    if (totalDisp) totalDisp.innerText = total.toLocaleString() + " ج.م";
}

/* ==========================================================
   9) إتمام الطلب: بيقفل السلة الجانبية ويفتح فورم بيانات الطلب
   🐞 تمت إضافة: تعبئة تلقائية لتفاصيل السلة (المنتجات + الإجمالي)
   جوه حقل مخفي في الفورم (لو موجود) اسمه orderSummary، عشان
   تفاصيل الطلب توصل مع الإيميل اللي بيبعته Formspree. الكود آمن:
   لو الحقل مش موجود في الـ HTML، بيتجاهل الخطوة دي من غير أي مشاكل.
   ========================================================== */
function checkout() {
    if (cart.length === 0) return alert("السلة فارغة!");

    const summaryField = document.getElementById('orderSummary');
    if (summaryField) {
        const lines = cart.map(item => `${item.name} × ${item.qty} = ${item.price}`);
        const total = cart.reduce((sum, item) => {
            const priceNum = parseFloat(item.price.toString().replace(/[^\d.]/g, ''));
            return sum + (priceNum * item.qty);
        }, 0);
        summaryField.value = lines.join('\n') + `\n\nالإجمالي: ${total.toLocaleString()} ج.م`;
    }

    // قفل السلة ورجوع السكرول قبل فتح الأبلكيشن
    document.body.classList.remove('stop-scrolling');
    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) cartOverlay.classList.remove('active');

    // فتح الأبلكيشن
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'flex';
}

/* ==========================================================
   10) إغلاق فورم بيانات الطلب
   ========================================================== */
function closeOrderForm() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
}

/* ==========================================================
   11) إرسال البيانات النهائية لـ Formspree (بيوصل أوتوماتيك للجيميل)
   🐞 تم إصلاح: بعد نجاح الإرسال كان بيمسح مفتاح localStorage غلط
   ("TOHFA_STORE_CART" بدل "TOHFA_CART")، فالسلة ما كانتش بتتصفر
   فعلياً بعد إتمام الطلب. دلوقتي بيستخدم نفس CART_STORAGE_KEY
   المستخدم في كل الملف، وأضفنا try/catch عشان لو النت فصل أثناء
   الإرسال الكود ميعلقش ويظهر رسالة خطأ واضحة بدل ما يفضل معلق.
   ========================================================== */
async function sendFinalOrder() {
    const form = document.getElementById('orderForm');
    const btn = document.getElementById('submitBtn');
    if (!form || !btn) return;

    if (!form.checkValidity()) {
        alert("برجاء ملء كافة الخانات المطلوبة");
        return;
    }

    btn.innerText = "جاري إرسال الطلب...";
    btn.disabled = true;

    try {
        const response = await fetch("https://formspree.io/f/xrewzqnn", {
            method: "POST",
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            alert("تم استلام طلبك بنجاح! سنتواصل معك قريباً لتأكيد الموعد.");
            // مسح السلة فعلياً بعد نجاح الطلب (بنفس المفتاح المستخدم في كل مكان)
            localStorage.removeItem(CART_STORAGE_KEY);
            window.location.reload(); // إعادة تحميل الصفحة لتصفير السلة
        } else {
            alert("عذراً، حدث خطأ في الشبكة. حاول مرة أخرى.");
        }
    } catch (err) {
        alert("تعذر الاتصال بالإنترنت. تأكد من اتصالك وحاول مرة أخرى.");
    } finally {
        btn.innerText = "تأكيد وإرسال الطلب";
        btn.disabled = false;
    }
}