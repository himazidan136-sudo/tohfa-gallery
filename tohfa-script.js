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
    
    // لو السلة فتحت، اقفل سكرول الصفحة الرئيسية
    if (cartOverlay.classList.contains('active')) {
        document.body.classList.add('stop-scrolling');
    } else {
        document.body.classList.remove('stop-scrolling');
    }
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
// وظيفة إتمام الطلب من السلة
// 1. وظيفة طلب منتج واحد مباشرة (الزرار اللي تحت الصورة)
function openOrderForm(name, price) {
    document.getElementById('hiddenProd').value = name;
    document.getElementById('hiddenPrice').value = price;
    document.getElementById('mTitle').innerText = "طلب: " + name;
    document.getElementById('orderModal').style.display = 'flex';
}

// 2. وظيفة إتمام الطلب من السلة (الزرار اللي جوه السلة)
// وظيفة إتمام الطلب من السلة
function checkout() {
    if (cart.length === 0) {
        alert("السلة فارغة!");
        return;
    }
    
    // تجميع المنتجات
    let itemsSummary = cart.map(item => `${item.name} (x${item.quantity})`).join(' + ');
    let totalValue = document.getElementById('cartTotal').innerText;

    // ملى الخانات المخفية
    document.getElementById('hiddenProd').value = itemsSummary;
    document.getElementById('hiddenPrice').value = totalValue;
    document.getElementById('mTitle').innerText = "إتمام طلب السلة";

    toggleCart(); // قفل السلة
    document.getElementById('orderModal').style.display = 'flex'; // فتح الأبلكيشن
}
async function sendFinalOrder() {
    const form = document.getElementById('orderForm');
    const btn = document.getElementById('submitBtn');

    if(form.checkValidity()) {
        btn.innerText = "جاري الإرسال...";
        btn.disabled = true;

        const formData = new FormData(form);

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert("تم استلام طلبك بنجاح! شكراً لك.");
                localStorage.removeItem('TOHFA_STORE_CART'); // تصفير السلة
                window.location.reload(); 
            } else {
                alert("السيرفر رفض الطلب: " + result.message);
            }
        } catch (error) {
            alert("فشل الاتصال، جرب استخدام بيانات الهاتف (4G).");
        } finally {
            btn.innerText = "تأكيد وإرسال الطلب";
            btn.disabled = false;
        }
    } else {
        alert("برجاء ملء البيانات كاملة");
    }
}
// الوظيفة الموحدة لقفل الأبلكيشن
function closeOrderForm() {
    // بنجيب المربع الكبير
    const modal = document.getElementById('orderModal');
    
    if (modal) {
        modal.style.display = 'none'; // إخفاء المربع
        
        // مهم جداً: رجوع سكرول الصفحة الرئيسية اللي كنا قفلناه
        document.body.classList.remove('stop-scrolling');
        document.body.style.overflow = 'auto'; 
    }
}

// زيادة تأكيد: قفل المودال لو الزبون داس في أي حتة فاضية بره المربع
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target == modal) {
        closeOrderForm();
    }
}
// وظيفة فتح الصورة
function openLightbox(src) {
    const modal = document.getElementById('imageModal');
    const fullImg = document.getElementById('fullImage');
    if(!modal || !fullImg) return; // حماية لو الكود مش موجود في الصفحة

    fullImg.src = src;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    document.body.style.overflow = 'hidden'; // قفل سكرول الصفحة
}

function closeLightbox() {
    const modal = document.getElementById('imageModal');
    if(!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // رجوع السكرول
    }, 400);
}

// تشغيل الميزة على كل الصور تلقائياً
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'IMG' && (e.target.closest('.gallery-item') || e.target.closest('.product-img'))) {
        openLightbox(e.target.src);
    }
});
// 1. مخزن المنتجات (ضيف هنا كل المنتجات اللي معاك في ثواني)
const allProducts = [
    { name: "شمعدان ثلاثي ", price: 1495, img: "tohfa/sham3dan.jpg.jpeg" },
    { name: "طقم شمعدان ميرور حلقات ", price: 1100, img: "tohfa/sham3dan1.jpeg" },
    { name: "طقم شمعدان ميرور ورد ", price: 1100, img: "tohfa/sham3dan2.jpeg" },
    { name: "مبخره هيدستينس", price: 600, img: "tohfa/mab5ara.jpg.jpeg" },
    { name: "مبخره هيدستينس افريقيه", price: 630, img: "tohfa/decorm.jpeg" },
    { name: "بلوره مع حامل معدني", price: 300, img: "tohfa/decorb.jpeg" },
    { name: "بلوره مع حامل رخام", price: 300, img: "tohfa/decorb1.jpeg" },
    { name: "بلوره تاور", price: 400, img: "tohfa/decorb2.jpeg" },
    { name: " اباجوره سمارت", price:580 , img: "tohfa/abajora.jpg.jpeg" },
    { name: " اباجوره يقطينه مضيئه", price:845 , img: "tohfa/decora.jpeg" },
    { name: " اباجوره ليد سمارت", price:775 , img: "tohfa/decoras.jpeg" },
    { name: "بوكس مناديل بابلز اسود", price:400 , img: "tohfa/decor3b.jpeg" },
    { name: "بوكس مناديل بابلز ابيض", price:500 , img: "tohfa/decor3w.jpeg" },
    { name: "رصيف", price:600 , img: "tohfa/decorr.jpeg" },
    { name: "بنت عوسه  ", price:500 , img: "tohfa/decorbn.jpeg" },
    { name: "صينيه تقديم  ", price:350 , img: "tohfa/shayala.jpeg" },
    { name: "ساعه بحار اطفال  ", price:735 , img: "tohfa/sa3a.jpeg" },
    { name: "ساعه منبه باستل تركي  ", price:600 , img: "tohfa/sa3a1.jpeg" },
    { name: "ساعه    ", price:735 , img: "tohfa/sa3a2.jpeg" },

    // عشان تضيف منتج جديد.. خد السطر اللي فوق "نسخ" وغير البيانات بس
];

// 2. وظيفة "رص" المنتجات تلقائياً في الصفحة
function renderProducts() {
    const container = document.getElementById('products-list');
    if (!container) return; // حماية لو الصفحة مفيهاش المكان ده

    container.innerHTML = ''; // تنظيف المكان الأول

    allProducts.forEach(product => {
        container.innerHTML += `
            <div class="product-card glass-card">
                <img src="${product.img}" class="product-img" loading="lazy">
                <span class="product-name">${product.name}</span>
                <span class="product-price">${product.price} ج.م</span>
                <div class="btn-group">
                    <button class="order-btn" onclick="openOrderForm('${product.name}', '${product.price} ج.م')">طلب</button>
                    <button class="add-to-cart-btn" onclick="addToCart('${product.name}', ${product.price}, '${product.img}')">🛒</button>
                </div>
            </div>
        `;
    });
}

// تشغيل الوظيفة أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', renderProducts);