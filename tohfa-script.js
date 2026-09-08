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
function addToCart(name, price, img, stock, btn) {
    // stock: أقصى كمية متاحة من المنتج (لو مش متبعتة، بتتحسب لا نهائية
    // يعني من غير حد أقصى - للتوافق مع أي استدعاء قديم للدالة)
    const maxStock = (typeof stock === 'number') ? stock : Infinity;

    const existing = cart.find(item => item.name === name);
    if (existing) {
        if (existing.qty + 1 > maxStock) {
            alert(`متأسفين، الكمية المتاحة من "${name}" هي ${maxStock} فقط ولسه عندك ${existing.qty} في السلة.`);
            return;
        }
        existing.qty += 1;
        existing.stock = maxStock; // تحديث الحد الأقصى لو اتغير
    } else {
        if (maxStock < 1) {
            alert(`متأسفين، "${name}" نفذت الكمية.`);
            return;
        }
        cart.push({ name, price, img, qty: 1, stock: maxStock });
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

    // منع الزيادة فوق الكمية المتاحة فعليًا من المنتج
    if (delta > 0 && typeof cart[index].stock === 'number' && cart[index].qty + delta > cart[index].stock) {
        alert(`متأسفين، الكمية المتاحة من "${cart[index].name}" هي ${cart[index].stock} فقط.`);
        return;
    }

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
    let itemsSummary = cart.map(item => `${item.name} (x${item.qty})`).join(' + ');
    let totalValue = document.getElementById('cartTotal').innerText;

    // ملى الخانات المخفية
    document.getElementById('hiddenProd').value = itemsSummary;
    document.getElementById('hiddenPrice').value = totalValue;
    document.getElementById('mTitle').innerText = "إتمام طلب السلة";

    const cartOverlay = document.getElementById('cartOverlay');
    if (cartOverlay) cartOverlay.classList.remove('active');
    document.body.classList.remove('stop-scrolling');

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
                localStorage.removeItem(CART_STORAGE_KEY); // تصفير السلة
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
/* ==========================================================
   🆕 دالة التحقق من توفر المنتج
   - أي منتج من غير خاصية available بيتحسب متاح تلقائيًا
   - عشان تخلي منتج "خلصت كميته"، ضيف له: available: false
     مثال: { name: "...", price: 500, img: "...", available: false }
   ========================================================== */
/* ==========================================================
   🆕 دالة التحقق من توفر المنتج (نسخة محدّثة)
   - لو المنتج فيه خانة stock (رقم الكمية المتاحة)، بيتقفل تلقائي
     لما الرقم يوصل لصفر أو أقل، من غير ما تحتاج تكتب available:false
     يدوي كل مرة. مثال: { name: "...", price: 500, img: "...", stock: 3 }
   - لسه بتدعم الطريقة القديمة (available: false) لو حابب تستخدمها
     لمنتج معينه من غير عد كمية.
   - أي منتج من غير stock ومن غير available بيتحسب متاح تلقائيًا.
   ========================================================== */
function isAvailable(item) {
    if (typeof item.stock === 'number') return item.stock > 0;
    return item.available !== false;
}

// 1. مخزن المنتجات (ضيف هنا كل المنتجات اللي معاك في ثواني)
const allProducts = [
    { name: " طقم شمعدان اسود ", price: 1550, img: "tohfa/sham3dan3.jpeg", stock: 1 },
    { name: "شمعدان استرس معدن ", price: 750, img: "tohfa/sham3dan4.jpeg", stock: 1 },
    { name: "  طقم شمعدان اسود مموج", price: 1050, img: "tohfa/sham3dan5.jpeg", stock: 1 },
    { name: " شمعدان معدن كريستال ", price: 550, img: "tohfa/sham3dan6.jpeg", stock: 1 },
    { name: "   شمعدان معدن كريستال عريض", price: 550, img: "tohfa/sham3dan7.jpeg", stock: 1 },
    { name: " شمعدان معدن فردي ", price: 250, img: "tohfa/sham3dan8.jpeg", stock: 1 },
    { name: " شمعدان معدن زوجي ", price: 350, img: "tohfa/sham3dan10.jpeg", stock: 1 },
    { name: " شمعدان نحاس شمبين ", price: 1350, img: "tohfa/sham3dan9.jpeg", stock: 1 },

    { name: "شمعدان ثلاثي ", price: 1495, img: "tohfa/sham3dan.jpg.jpeg", stock: 1 },
    { name: "طقم شمعدان ميرور حلقات ", price: 1100, img: "tohfa/sham3dan1.jpeg", stock: 2 },
    { name: "طقم شمعدان ميرور ورد ", price: 1250, img: "tohfa/sham3dan2.jpeg", stock: 2 },
    { name: "مبخره هيدستينس", price: 600, img: "tohfa/mab5ara.jpg.jpeg", stock: 1 },
    { name: "مبخره هيدستينس افريقيه", price: 630, img: "tohfa/decorm.jpeg", stock: 1 },
    { name: "مبخره شلال", price: 700, img: "tohfa/mab5aras.jpeg", stock: 1 },
    { name: "مبخره شلال بوزي", price: 550, img: "tohfa/mab5aras0.jpeg", stock: 1 },

    { name: "ديكور اب", price: 450, img: "tohfa/decor0.jpeg", stock: 1 },
    { name: "ديكور اب اريكه", price: 450, img: "tohfa/decor2.jpeg", stock: 1 },
    { name: "بنت عوسه ابيض", price: 700, img: "tohfa/decor3.jpeg", stock: 1 },
    { name: "بنت عوسه مع طبق", price: 750, img: "tohfa/decor4.jpeg", stock: 1 },
    { name: "انتيك امراه دهبي", price: 705, img: "tohfa/decor5.jpeg", stock: 1 },
    { name: "طقم تفاحه مستورد ", price: 1300, img: "tohfa/decor6.jpeg", stock: 1 },

    { name: "بلوره مع حامل معدني", price: 300, img: "tohfa/decorb.jpeg", stock: 1 },
    { name: "بلوره مع حامل رخام", price: 300, img: "tohfa/decorb1.jpeg", stock: 1 },
    { name: "بلوره تاور", price: 400, img: "tohfa/decorb2.jpeg", stock: 1 },
    { name: "انتيكه اقراص ملونه", price: 500, img: "tohfa/decoran.jpeg", stock: 1 },
    { name: " اباجوره سمارت", price:580 , img: "tohfa/abajora.jpg.jpeg", stock: 1 },
    { name: " اباجوره يقطينه مضيئه", price:845 , img: "tohfa/decora.jpeg", stock: 1 },
    { name: " اباجوره ليد قابل للطي", price:590 , img: "tohfa/decora0.jpeg", stock: 1 },

    { name: "بوكس مناديل بابلز ابيض", price:500 , img: "tohfa/decor3w.jpeg", stock: 1 },
    { name: "بوكس مناديل بابلز اسود", price:400 , img: "tohfa/decor3b.jpeg", stock: 1 },
    { name: "بوكس مناديل حبل مستورد", price:550 , img: "tohfa/decore3w0.jpeg", stock: 1 },
    { name: "بوكس مناديل صدفه ", price:600 , img: "tohfa/decore3g.jpeg", stock: 1 },
    { name: "بوكس مناديل شنطه يد", price:650 , img: "tohfa/decore3g0.jpeg", stock: 1 },

    { name: "رصيف", price:600 , img: "tohfa/decorr.jpeg", stock: 1 },
        { name: "كره استانلس  ", price:700 , img: "tohfa/decor1.jpeg", stock: 1 },
    { name: "نتيجه دبدوب  ", price:250 , img: "tohfa/decoren.jpeg", stock: 1 },
    { name: "مركب بحري ديكور صغير  ", price:600 , img: "tohfa/decormr.jpeg", stock: 1 },
    { name: "مركب بحري ديكور كبير  ", price:720 , img: "tohfa/decormr1.jpeg", stock: 1 },
    { name: "كريستال حصان ", price:1750 , img: "tohfa/decorh.jpeg", stock: 1 },
    { name: "كريستال راس حصان ", price:1250 , img: "tohfa/decorh1.jpeg", stock: 1 },
    { name: "قطعتين كريستال وزه ", price:2450 , img: "tohfa/decorw.jpeg", stock: 1 },
    { name: "مرايا بابلز  ", price:250 , img: "tohfa/dm.jpeg", stock: 1 },
    { name: "مرايا كريستال  ", price:490 , img: "tohfa/dm0.jpeg", stock: 1 },
    { name: "مبخره ليد   ", price:490 , img: "tohfa/df.jpeg", stock: 1 },
    { name: "فواحه اطفال ", price:320 , img: "tohfa/df0.jpeg", stock: 1 },
    { name: "فواحه اطفال قطه  ", price:230 , img: "tohfa/df1.jpeg", stock: 1 },

    { name: "صينيه تقديم  ", price:350 , img: "tohfa/shayala.jpeg", stock: 1 },
    { name: "منظم ابيض  ", price:1100 , img: "tohfa/shayala1.jpeg", stock: 1 },
    { name: "صينيه معدن ورقه صغير  ", price:300 , img: "tohfa/shayala2.jpeg", stock: 1 },
    { name: "صينيه معدن ورقه كبير  ", price:400 , img: "tohfa/shayala3.jpeg", stock: 1 },
    { name: "طقم ستاند قطعتين ميرور  ", price:2600 , img: "tohfa/shayala4.jpeg", stock: 1 },
    { name: "بوله ميرور ", price:685 , img: "tohfa/shayala5.jpeg", stock: 1 },
    { name: "طبق ميرور", price:850 , img: "tohfa/shayala6.jpeg", stock: 1 },
    { name: "طبق الترا", price:1450 , img: "tohfa/shayala7.jpeg", stock: 1 },
    { name: "طبق الترا عريض", price:1450 , img: "tohfa/shayala8.jpeg", stock: 1 },
    { name: "بونبونيره الترا", price:935 , img: "tohfa/shayala9.jpeg", stock: 1 },

    { name: "ساعه بحار اطفال  ", price:735 , img: "tohfa/sa3a.jpeg", stock: 1 },
    { name: "ساعه منبه باستل تركي  ", price:600 , img: "tohfa/sa3a1.jpeg", stock: 1 },
    { name: "ساعه منبه صغير  ", price:300 , img: "tohfa/sa3a2.jpeg", stock: 1 },
    { name: "فاز فواحه معطر  ", price:485 , img: "tohfa/fowaha.jpeg", stock: 1 },

    // عشان تضيف منتج جديد.. خد السطر اللي فوق "نسخ" وغير البيانات بس
];

// 2. وظيفة "رص" المنتجات تلقائياً في الصفحة
function renderProducts() {
    const container = document.getElementById('products-list');
    if (!container) return; // حماية لو الصفحة مفيهاش المكان ده

    container.innerHTML = ''; // تنظيف المكان الأول

    allProducts.forEach(product => {
        const available = isAvailable(product);
        container.innerHTML += `
            <div class="product-card glass-card ${available ? '' : 'out-of-stock'}">
                <img src="${product.img}" class="product-img" loading="lazy">
                ${available ? '' : '<span class="out-of-stock-badge">Sold Out</span>'}
                <span class="product-name">${product.name}</span>
                <span class="product-price">${product.price} ج.م</span>
                <div class="btn-group">
                    <button class="order-btn" ${available ? `onclick="openOrderForm('${product.name}', '${product.price} ج.م')"` : 'disabled'}>طلب</button>
                    <button class="add-to-cart-btn" ${available ? `onclick="addToCart('${product.name}', ${product.price}, '${product.img}', ${typeof product.stock === 'number' ? product.stock : 'undefined'})"` : 'disabled'}>🛒</button>
                </div>
            </div>
        `;
    });
}

// تشغيل الوظيفة أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', renderProducts);






// 1. مخزن بيانات الورد (كل منتج في سطر واحد زي ما طلبت)
const flowerProducts = [
    { name: "بوت فايبر كوبايه مع زرع اريكا", price: "2200 ج.م", img: "tohfa/z/b.jpeg", stock: 1 },
    { name: "بوت فايبر مع زرع شاميدورا", price: "2000 ج.م", img: "tohfa/z/b0.jpeg", stock: 1 },
    { name: "حوض + مجاميع كبير ", price: "1550 ج.م", img: "tohfa/z/b1.jpeg", stock: 1 },
    { name: "حوض + مجاميع صغير ", price: "1100 ج.م", img: "tohfa/z/b2.jpeg", stock: 1 },
    { name: "بوت فراوله مع زرع كولكاسيا", price: "480 ج.م", img: "tohfa/z/b3.jpeg", stock: 1 },
    { name: "بوت كريستاله مع كريز ", price: "1120 ج.م", img: "tohfa/z/b4.jpeg", stock: 1 },

    { name: "فرع عباد شمس مستورد  ", price: "295 ج.م", img: "tohfa/z/z1.jpeg", stock: 1 },
    { name: "فرع كريز مستورد  ", price: "320 ج.م", img: "tohfa/z/z2.jpeg", stock: 1 },
    { name: "بيبي فلاور 8 فرع مستورد ", price: "250 ج.م", img: "tohfa/z/z3.jpeg", stock: 1 },
    { name: "فروع نباتات مختلفه اخضر ", price: "235 ج.م", img: "tohfa/z/z4.jpeg", stock: 1 },
    { name: "فروع نباتات مختلفه اخضر ", price: "235 ج.م", img: "tohfa/z/z5.jpeg", stock: 1 },
    { name: "فرع كالبتوس مستورد  ", price: "170 ج.م", img: "tohfa/z/z7.jpeg", stock: 1 },
    { name: "جهنميه اسود مستورد  ", price: "175 ج.م", img: "tohfa/z/z8.jpeg", stock: 1 },
    { name: "فرع 70 سم اصفر مستورد ", price: "145 ج.م", img: "tohfa/z/z9.jpeg", stock: 1 },
    { name: "فرع 70 سم احمر مستورد ", price: "145 ج.م", img: "tohfa/z/z10.jpeg", stock: 1 },
    { name: "فرع 70 سم دهبي مستورد ", price: "145 ج.م", img: "tohfa/z/z11.jpeg", stock: 1 },
    { name: "فروع نباتات مختلفه اخضر ", price: "235 ج.م", img: "tohfa/z/z12.jpeg", stock: 1 },
    { name: "بامبو 19 ورقه سباعي مستورد ", price: "195 ج.م", img: "tohfa/z/z13.jpeg", stock: 1 },
    { name: "فرع كريستال مستورد  ", price: "90 ج.م", img: "tohfa/z/z14.jpeg", stock: 1 },


    { name: "صباره فستان استانلس", price: "300 ج.م", img: "tohfa/z/flowersf.jpeg", stock: 1 },
    { name: "صباره وش استانلس", price: "300 ج.م", img: "tohfa/z/flowersw.jpeg", stock: 1 },
    { name: "حامل نباتات استانلس", price: "200 ج.م", img: "tohfa/z/flowersh.jpeg", stock: 1 },
    { name: "صباره رخام اسود", price: "200 ج.م", img: "tohfa/z/flowerss.jpeg", stock: 1 },
    { name: "صباره رخام ابيض", price: "200 ج.م", img: "tohfa/z/flowerss0.jpeg", stock: 1 },

    { name: "وعاء نباتات سيراميك صغير اسود", price: "400 ج.م", img: "tohfa/z/flowersw0.jpeg", stock: 1 },
    { name: "وعاء نباتات سيراميك صغير دهبي", price: "400 ج.م", img: "tohfa/z/flowersw1.jpeg", stock: 1 },
    { name: "وعاء نباتات سيراميك صغير ابيض", price: "400 ج.م", img: "tohfa/z/flowersw2.jpeg", stock: 1 },
    { name: "وعاء نباتات سيراميك كبير ابيض", price: "740 ج.م", img: "tohfa/z/flowerswl.jpeg", stock: 1 },
    { name: "وعاء نباتات سيراميك كبير دهبي", price: "740 ج.م", img: "tohfa/z/flowerswl0.jpeg", stock: 1 },
    { name: "بوت زرع ديكور صغير ابيض", price: "250 ج.م", img: "tohfa/z/flowersb.jpeg", stock: 1 },
    { name: "بوت زرع ديكور صغير اسود", price: "250 ج.م", img: "tohfa/z/flowersb0.jpeg", stock: 1 },
    { name: "بوت زرع ديكور صغير دهبي", price: "250 ج.م", img: "tohfa/z/flowersb1.jpeg", stock: 1 },
    { name: "نبتة صبار مدهب صغير اسود", price: "250 ج.م", img: "tohfa/z/flowersn.jpeg", stock: 1 },

];

// 2. وظيفة عرض الورد تلقائياً
function renderFlowers() {
    const container = document.getElementById('flowers-list');
    
    // لو إحنا في صفحة الورد (لقى الـ id المخصص للورد)
    if (container) {
        container.innerHTML = ''; 
        
        flowerProducts.forEach(item => {
            const available = isAvailable(item);
            container.innerHTML += `
                <div class="product-card glass-card ${available ? '' : 'out-of-stock'}">
                    <img src="${item.img}" class="product-img">
                    ${available ? '' : '<span class="out-of-stock-badge">Sold Out</span>'}
                    <span class="product-name">${item.name}</span>
                    <span class="product-price">${item.price}</span>
                    <div class="btn-group">
                        <button class="order-btn" ${available ? `onclick="openOrderForm('${item.name}', '${item.price}')"` : 'disabled'}>طلب</button>
                        <button class="add-to-cart-btn" ${available ? `onclick="addToCart('${item.name}', '${item.price}', '${item.img}', ${typeof item.stock === 'number' ? item.stock : 'undefined'})"` : 'disabled'}>🛒</button>
                    </div>
                </div>
            `;
        });
    }
}

// 3. التأكد من تشغيل الوظيفة
document.addEventListener('DOMContentLoaded', renderFlowers);






const vasesProducts = [
    { name: "   طقم فاز فخار اورنج", price: "700 ج.م", img: "tohfa/vase/vasef.jpeg", stock: 1 },
    { name: "  طقم فاز فخار ابيض ", price: "700 ج.م", img: "tohfa/vase/vasef0.jpeg", stock: 1 },
    { name: "   طقم فاز متداخل", price: "600 ج.م", img: "tohfa/vase/vasef1.jpeg", stock: 1 },
    { name: "   طقم فاز جركن ", price: "750 ج.م", img: "tohfa/vase/vasef2.jpeg", stock: 1 },
    { name: "  طقم فاز فخار كندا ", price: "110 ج.م", img: "tohfa/vase/vasef3.jpeg", stock: 1 },
    { name: "   فاز فخار ابيض", price: "500 ج.م", img: "tohfa/vase/vasef4.jpeg", stock: 1 },
    { name: "  فاز فخار رمادي ", price: "500 ج.م", img: "tohfa/vase/vasef5.jpeg", stock: 1 },
    { name: "   فاز فخار اخضر", price: "500 ج.م", img: "tohfa/vase/vasef6.jpeg", stock: 1 },
    { name: "   فاز فخار ابيض", price: "500 ج.م", img: "tohfa/vase/vasef7.jpeg", stock: 1 },
    { name: "   فاز خزف صغير", price: "110 ج.م", img: "tohfa/vase/vasek.jpeg", stock: 1 },
    { name: "   فاز خزف كبير", price: "320 ج.م", img: "tohfa/vase/vasek0.jpeg", stock: 1 },

    { name: "مزهريه ذهبيه كبير", price: "750 ج.م", img: "tohfa/vase/vasesm.jpeg", stock: 1 },
    { name: "مزهريه ذهبيه وسط", price: "620 ج.م", img: "tohfa/vase/vasesmm.jpeg", stock: 1 },
    { name: "مزهريه ذهبيه صغير", price: "580 ج.م", img: "tohfa/vase/vasesms.jpeg", stock: 1 },
    { name: "مزهريه خزفيه ذهبيه كبير", price: "820 ج.م", img: "tohfa/vase/vasesmk.jpeg", stock: 1 },
    { name: "مزهريه خزفيه ذهبيه وسط", price: "650 ج.م", img: "tohfa/vase/vasesmkm.jpeg", stock: 1 },
    { name: "مزهريه خزفيه ذهبيه صغير", price: "550 ج.م", img: "tohfa/vase/vasesmks.jpeg", stock: 1 },
    { name: "فاز ذهبيه شاين", price: "550 ج.م", img: "tohfa/vase/vasems0.jpeg", stock: 1 },

    { name: "فاز زور اسود ", price: "1000 ج.م", img: "tohfa/vase/vasesz.jpeg", stock: 1 },
    { name: "فاز زور اسود كبير", price: "1200 ج.م", img: "tohfa/vase/vasesz0.jpeg", stock: 1 },
    { name: "مزهريه زجاجيه قرع ", price: "720 ج.م", img: "tohfa/vase/vasesmz0.jpeg", stock: 1 },
    { name: "مزهريه زجاجيه قرع صغير", price: "580 ج.م", img: "tohfa/vase/vasesmz.jpeg", stock: 1 },
    { name: "مزهريه زجاجيه اسود صغير", price: "780 ج.م", img: "tohfa/vase/vasesmz1.jpeg", stock: 1 },
    { name: "مزهريه زجاجيه اسود ", price: "850 ج.م", img: "tohfa/vase/vasesmz2.jpeg", stock: 1 },
    { name: "مزهريه خزفي زيتي ", price: "599 ج.م", img: "tohfa/vase/vasesk.jpeg", stock: 0 },
    { name: "فاز اسود ميرور ", price: "1650 ج.م", img: "tohfa/vase/vasesb.jpeg", stock: 1 },
    { name: "فاز اسود مدهب ", price: "450 ج.م", img: "tohfa/vase/vasesb0.jpeg", stock: 1 },
    { name: "فاز اسود مدور ميرور ", price: "1500 ج.م", img: "tohfa/vase/vasesbm.jpeg", stock: 1 },
    { name: "فاز رمادي مدور ميرور ", price: "1500 ج.م", img: "tohfa/vase/vasesbg.jpeg", stock: 1 },
    { name: "فاز كريستال شاطئ  ", price: "1200 ج.م", img: "tohfa/vase/vasess.jpeg", stock: 1 },
    { name: "فاز خشبي كرمزي  ", price: "1200 ج.م", img: "tohfa/vase/vasess0.jpeg", stock: 1 },
    { name: "فاز كريستال صغير  ", price: "500 ج.م", img: "tohfa/vase/vase.jpeg", stock: 1 },
    { name: "فاز نحاس مدهب ابيض   ", price: "1900 ج.م", img: "tohfa/vase/vasesn.jpeg", stock: 1 },
    { name: "فاز نحاس مدهب ابيض صغير  ", price: "1700 ج.م", img: "tohfa/vase/vasesn0.jpeg", stock: 1 },
    { name: "فاز نحاس شامبيه   ", price: "1400 ج.م", img: "tohfa/vase/vasesn1.jpeg", stock: 1 },

];

// 2. وظيفة عرض الورد تلقائياً
function rendervases() {
    const container = document.getElementById('vases-list');
    
    // لو إحنا في صفحة الورد (لقى الـ id المخصص للورد)
    if (container) {
        container.innerHTML = ''; 
        
        vasesProducts.forEach(item => {
            const available = isAvailable(item);
            container.innerHTML += `
                <div class="product-card glass-card ${available ? '' : 'out-of-stock'}">
                    <img src="${item.img}" class="product-img">
                    ${available ? '' : '<span class="out-of-stock-badge">Sold Out</span>'}
                    <span class="product-name">${item.name}</span>
                    <span class="product-price">${item.price}</span>
                    <div class="btn-group">
                        <button class="order-btn" ${available ? `onclick="openOrderForm('${item.name}', '${item.price}')"` : 'disabled'}>طلب</button>
                        <button class="add-to-cart-btn" ${available ? `onclick="addToCart('${item.name}', '${item.price}', '${item.img}', ${typeof item.stock === 'number' ? item.stock : 'undefined'})"` : 'disabled'}>🛒</button>
                    </div>
                </div>
            `;
        });
    }
}

// 3. التأكد من تشغيل الوظيفة
document.addEventListener('DOMContentLoaded', rendervases);






const wallProducts = [
    { name: "تابلوه جلد قران 120*80 ", price: "1200 ج.م", img: "tohfa/wall/w.jpeg", stock: 1 },
    { name: "تابلوه جلد شجر 120*80", price: "1200 ج.م", img: "tohfa/wall/w0.jpeg", stock: 1 },
    { name: "تابلوه جلد عرايس 120*80", price: "1200 ج.م", img: "tohfa/wall/w1.jpeg", stock: 1 },
    { name: "تابلوه كلاسيك زيت خشب بني غامق 120*60", price: "1590 ج.م", img: "tohfa/wall/w2.jpeg", stock: 1 },
    { name: "تابلوه كلاسيك زيت خشب بني 120*60", price: "1590 ج.م", img: "tohfa/wall/w3.jpeg", stock: 1 },
    { name: "تابلوه كلاسيك زيت خشب دهبي 120*60", price: "1690 ج.م", img: "tohfa/wall/w4.jpeg", stock: 1 },
    { name: "تابلوه هاند ميد مدهب بارز 150*80", price: "1950 ج.م", img: "tohfa/wall/w5.jpeg", stock: 1 },
    { name: "تابلوه هاند ميد مدهب اخضر بارز 150*80", price: "1950 ج.م", img: "tohfa/wall/w6.jpeg", stock: 1 },
    { name: "تابلوه هاند ميد ورد بارز 150*80", price: "1950 ج.م", img: "tohfa/wall/w7.jpeg", stock: 1 },
    { name: "تابلوه هاند ميد ورد بارز اخضر  120*80 ", price: "2150 ج.م", img: "tohfa/wall/w8.jpeg", stock: 1 },
    { name: "تابلوه جلد بنت افريقيه 120*80", price: "1200 ج.م", img: "tohfa/wall/w9.jpeg", stock: 1 },
    { name: "تابلوه جلد بحار 120*80", price: "1200 ج.م", img: "tohfa/wall/w10.jpeg", stock: 1 },
    { name: "تابلوه جلد  90*50", price: "850 ج.م", img: "tohfa/wall/w11.jpeg", stock: 1 },
    { name: "تابلوه جلد 80*60", price: "850 ج.م", img: "tohfa/wall/w13.jpeg", stock: 1 },
   
];

// 2. وظيفة عرض الورد تلقائياً
function renderwall() {
    const container = document.getElementById('wall-list');
    
    // لو إحنا في صفحة الورد (لقى الـ id المخصص للورد)
    if (container) {
        container.innerHTML = ''; 
        
       wallProducts.forEach(item => {
            const available = isAvailable(item);
            container.innerHTML += `
                <div class="product-card glass-card ${available ? '' : 'out-of-stock'}">
                    <img src="${item.img}" class="product-img">
                    ${available ? '' : '<span class="out-of-stock-badge">Sold Out</span>'}
                    <span class="product-name">${item.name}</span>
                    <span class="product-price">${item.price}</span>
                    <div class="btn-group">
                        <button class="order-btn" ${available ? `onclick="openOrderForm('${item.name}', '${item.price}')"` : 'disabled'}>طلب</button>
                        <button class="add-to-cart-btn" ${available ? `onclick="addToCart('${item.name}', '${item.price}', '${item.img}', ${typeof item.stock === 'number' ? item.stock : 'undefined'})"` : 'disabled'}>🛒</button>
                    </div>
                </div>
            `;
        });
    }
}

// 3. التأكد من تشغيل الوظيفة
document.addEventListener('DOMContentLoaded', renderwall);