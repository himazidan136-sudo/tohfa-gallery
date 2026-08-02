// tohfa-script.js
let cart = JSON.parse(localStorage.getItem('TOHFA_CART')) || [];

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

function toggleCart() {
    const cartOverlay = document.getElementById('cartOverlay');
    cartOverlay.classList.toggle('active');
    
    if (cartOverlay.classList.contains('active')) {
        // قفل سكرول الصفحة الرئيسية (الخلفية)
        document.body.style.overflow = 'hidden';
    } else {
        // فتح سكرول الصفحة لما السلة تقفل
        document.body.style.overflow = 'auto';
    }
}

// تعديل بسيط في تحديث الواجهة للتأكد من الـ Container
function updateUI() {
    const cartContainer = document.getElementById('cartItemsList');
    // ... باقي الكود اللي عندك ...
    // تأكد إن اسم الـ id في الـ HTML هو cartItemsList وموجود جوه الـ cart-items-container
}
function addToCart(name, price, img) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, img, qty: 1 });
    }
    saveAndRefresh();
    
    // أنيميشن زرار الطلب
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "تمت الإضافة ✔";
    setTimeout(() => btn.innerText = oldText, 1500);
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty < 1) return removeFromCart(index);
    saveAndRefresh();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveAndRefresh();
}

function saveAndRefresh() {
    localStorage.setItem('TOHFA_CART', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const badge = document.getElementById('cartBadge');
    const totalDisp = document.getElementById('cartTotal');
    
    if(!list) return;

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

    badge.innerText = count;
    totalDisp.innerText = total.toLocaleString() + " ج.م";
}

function checkout() {
    if (cart.length === 0) return alert("السلة فارغة!");
    
    // ... كود تجميع البيانات اللي عندك ...

    // قفل السلة ورجوع السكرول قبل فتح الأبلكيشن
    document.body.classList.remove('stop-scrolling');
    document.getElementById('cartOverlay').classList.remove('active');
    
    // فتح الأبلكيشن
    document.getElementById('orderModal').style.display = 'flex';
}

function closeOrderForm() {
    document.getElementById('orderModal').style.display = 'none';
}

// إرسال البيانات النهائية لـ Formspree (أوتوماتيك للجيميل)
async function sendFinalOrder() {
    const form = document.getElementById('orderForm');
    const btn = document.getElementById('submitBtn');

    if(form.checkValidity()) {
        btn.innerText = "جاري إرسال الطلب...";
        btn.disabled = true;

        const response = await fetch("https://formspree.io/f/xrewzqnn", {
            method: "POST",
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            alert("تم استلام طلبك بنجاح! سنتواصل معك قريباً لتأكيد الموعد.");
            // مسح السلة بعد نجاح الطلب
            localStorage.removeItem('TOHFA_STORE_CART');
            window.location.reload(); // إعادة تحميل الصفحة لتصفير السلة
        } else {
            alert("عذراً، حدث خطأ في الشبكة. حاول مرة أخرى.");
        }
        btn.innerText = "تأكيد وإرسال الطلب";
        btn.disabled = false;
    } else {
        alert("برجاء ملء كافة الخانات المطلوبة");
    }
}
window.onscroll = function() {
    let nav = document.querySelector(".navbar");
    if (window.scrollY > 50) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
};
// tohfa/products-lightbox.js
// تكبير صورة المنتج في نص الشاشة عند الضغط عليها
// ضيف السطر ده في آخر صفحة الـ HTML قبل ما تقفل </body>:
// <script src="products-lightbox.js"></script>

document.addEventListener('DOMContentLoaded', function () {

    // 1) إنشاء عناصر اللايت بوكس مرة واحدة وإضافتها للصفحة
    const overlay = document.createElement('div');
    overlay.className = 'image-lightbox-overlay';
    overlay.innerHTML = `
        <span class="image-lightbox-close">&times;</span>
        <img src="" alt="عرض المنتج بحجم أكبر">
    `;
    document.body.appendChild(overlay);
    const lightboxImg = overlay.querySelector('img');

    // 2) فتح اللايت بوكس عند الضغط على أي صورة منتج
    //    (event delegation: بيشتغل حتى لو المنتجات اتحطت بالجافاسكريبت بعد تحميل الصفحة)
    document.addEventListener('click', function (e) {
        const clickedImg = e.target.closest('.product-img img');
        if (clickedImg) {
            lightboxImg.src = clickedImg.src;
            lightboxImg.alt = clickedImg.alt || 'عرض المنتج';
            overlay.classList.add('active');
            document.body.classList.add('stop-scrolling');
            return;
        }

        // إغلاق اللايت بوكس لو ضغط على الخلفية أو زرار الإغلاق
        if (e.target === overlay || e.target.classList.contains('image-lightbox-close')) {
            closeLightbox();
        }
    });

    // 3) إغلاق بزرار Escape من الكيبورد
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeLightbox();
        }
    });

    function closeLightbox() {
        overlay.classList.remove('active');
        document.body.classList.remove('stop-scrolling');
    }
});