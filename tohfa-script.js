// tohfa-script.js
let cart = JSON.parse(localStorage.getItem('TOHFA_CART')) || [];

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

function toggleCart() {
    const cartOverlay = document.getElementById('cartOverlay');
    cartOverlay.classList.toggle('active');
    
    // لو السلة مفتوحة، اقفل سكرول الصفحة الرئيسية
    if (cartOverlay.classList.contains('active')) {
        document.body.classList.add('stop-scrolling');
    } else {
        document.body.classList.remove('stop-scrolling');
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

function updateUI() {
    const cartContainer = document.getElementById('cartItemsList');
    const badge = document.getElementById('cartBadge');
    const totalDisplay = document.getElementById('cartTotal');
    
    if (!cartContainer) return;

    cartContainer.innerHTML = '';
    let total = 0;
    let totalItems = 0;

    cart.forEach((item, index) => {
        let numericPrice = parseFloat(item.price.toString().replace(/[^\d.]/g, ''));
        total += (numericPrice * item.quantity);
        totalItems += item.quantity;

        // هيكل المنتج جوه السلة المطور
        cartContainer.innerHTML += `
            <div class="cart-item">
                <img src="${item.img}" alt="${item.name}" onerror="this.src='tohfa/9.jpg.jpeg'">
                <div class="item-info-box">
                    <h4>${item.name}</h4>
                    <span class="price">${item.price}</span>
                    <div class="qty-controls">
                        <button onclick="changeQuantity(${index}, -1)">-</button>
                        <span class="qty-num">${item.quantity}</span>
                        <button onclick="changeQuantity(${index}, 1)">+</button>
                    </div>
                </div>
                <div class="remove-item-btn" onclick="removeFromCart(${index})">&times;</div>
            </div>
        `;
    });

    badge.innerText = totalItems;
    totalDisplay.innerText = total.toLocaleString() + " ج.م";
}

function checkout() {
    if (cart.length === 0) return alert("السلة فارغة!");
    
    let summary = cart.map(item => `${item.name} (x${item.quantity})`).join(' + ');
    let finalTotal = document.getElementById('cartTotal').innerText;

    document.getElementById('hiddenProd').value = summary;
    document.getElementById('hiddenPrice').value = finalTotal;

    // نقفل السلة ونرجع السكرول للـ body عشان نعرف نملى الأبلكيشن
    document.body.classList.remove('stop-scrolling');
    document.getElementById('cartOverlay').classList.remove('active');
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

        const response = await fetch("https://formspree.io/f/xjgqbyqe", {
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