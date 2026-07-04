// tohfa-script.js
let cart = JSON.parse(localStorage.getItem('TOHFA_CART')) || [];

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
});

function toggleCart() {
    const cartOverlay = document.getElementById('cartOverlay');
    cartOverlay.classList.toggle('active');
    
    // السحر هنا: لو السلة واخدة كلاس active، ضيف كلاس قفل السكرول للـ body
    if (cartOverlay.classList.contains('active')) {
        document.body.classList.add('stop-scrolling');
    } else {
        document.body.classList.remove('stop-scrolling');
    }
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

// إرسال الطلب للأبلكيشن
// وظيفة إتمام الطلب من السلة
function checkout() {
    if (cart.length === 0) {
        alert("السلة فارغة! اختر بعض التحف أولاً.");
        return;
    }
     toggleCart(); // دي لوحدها هتشيل الـ stop-scrolling لأنها بتنادي الوظيفة اللي فوق
    document.getElementById('orderModal').style.display = 'flex';
    // تجميع كل اللي في السلة في نص واحد مرتب
    let itemsSummary = cart.map(item => `${item.name} (عدد ${item.quantity})`).join(' + ');
    let totalValue = document.getElementById('cartTotal').innerText;

    // وضع البيانات في الاستمارة
    document.getElementById('hiddenProd').value = itemsSummary;
    document.getElementById('hiddenPrice').value = totalValue;

    // قفل السلة وفتح الأبلكيشن
    toggleCart(); 
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