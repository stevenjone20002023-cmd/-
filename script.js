// ملف: script.js
import { getFirestore, collection, onSnapshot, addDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Service Worker registered!'))
      .catch(err => console.log('Service Worker registration failed', err));
  });
}

const config = window.MY_STORE_CONFIG;
if (!config) { alert("خطأ: لم يتم العثور على ملف الإعدادات config.js!"); }

let allProducts = {};
let cart = [];
let user = null;
let deferredPrompt;
let adminPhoneNumber = ""; 
let sliderInterval;
let currentProductId = null;

const db = getFirestore(window.app);

document.addEventListener('DOMContentLoaded', () => {
    
    onSnapshot(collection(db, 'settings'), snapshot => {
        if(!snapshot.empty) {
            snapshot.forEach(docSnap => {
                const s = docSnap.data();
                if(s.whatsapp) adminPhoneNumber = s.whatsapp;
            });
        }
    });

    onSnapshot(doc(db, 'settings', 'news'), docSnap => {
        const textEl = document.getElementById('store-news-text');
        const container = document.getElementById('news-ticker-container');
        if(textEl && container) {
            if(docSnap.exists() && docSnap.data().text) {
                textEl.innerText = docSnap.data().text;
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
    });

    onSnapshot(collection(db, 'categories'), snapshot => {
        const catContainer = document.getElementById('dynamic-categories');
        if(!catContainer) return;
        catContainer.innerHTML = `<div class="category-item" onclick="filterProducts('all')"><div class="cat-box active"><div class="square-icon"></div></div><span class="cat-name">الكل</span></div>`;
        if(!snapshot.empty) {
            snapshot.forEach(docSnap => {
                const cat = docSnap.data();
                catContainer.innerHTML += `<div class="category-item" onclick="filterProducts('${cat.id}')"><div class="cat-box"><img src="${cat.image}" class="cat-img"></div><span class="cat-name">${cat.name}</span></div>`;
            });
        }
    });

    onSnapshot(collection(db, 'banners'), snapshot => {
        const slider = document.getElementById('dynamic-slider');
        if(!slider) return;
        slider.innerHTML = "";
        if(sliderInterval) clearInterval(sliderInterval);
        if(!snapshot.empty) {
            const banners = [];
            snapshot.forEach(docSnap => banners.push(docSnap.data()));
            banners.forEach(b => { slider.innerHTML += `<img src="${b.image}" alt="${b.title || 'Offer'}">`; });
            let currentIndex = 0;
            const totalSlides = banners.length;
            if(totalSlides > 1) {
                sliderInterval = setInterval(() => {
                    currentIndex = (currentIndex + 1) % totalSlides;
                    slider.style.transform = `translateX(-${currentIndex * 100}%)`;
                }, 3000);
            }
        } else { slider.innerHTML = '<img src="https://via.placeholder.com/800x450?text=Welcome" style="width:100%; height:100%; object-fit:cover">'; }
    });

    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
        if(!localStorage.getItem('visited')) { 
            window.showPage('home-page'); 
            localStorage.setItem('visited', 'true'); 
        }
    }, 2000);

    const installBtn = document.getElementById('install-btn');
    const closeInstall = document.getElementById('close-install');
    
    window.addEventListener('beforeinstallprompt', (e) => { 
        e.preventDefault(); 
        deferredPrompt = e; 
        const installBanner = document.getElementById('install-banner');
        if(installBanner) installBanner.style.display = 'flex'; 
    });
    
    if(installBtn) {
        installBtn.addEventListener('click', async () => { 
            if(deferredPrompt) { 
                deferredPrompt.prompt(); 
                deferredPrompt = null; 
                const installBanner = document.getElementById('install-banner');
                if(installBanner) installBanner.style.display = 'none'; 
            } 
        });
    }
    if(closeInstall) {
        closeInstall.addEventListener('click', () => {
            const installBanner = document.getElementById('install-banner');
            if(installBanner) installBanner.style.display = 'none';
        });
    }
    
    onSnapshot(collection(db, 'products'), snapshot => {
        const container = document.getElementById('products-container');
        if(!container) return;
        container.innerHTML = "";
        allProducts = {};
        if (snapshot.empty) { container.innerHTML = "<p style='width:200%; text-align:center;'>لا توجد منتجات</p>"; return; }
        
        const docs = [];
        snapshot.forEach(d => {
            const data = d.data();
            allProducts[d.id] = data;
            docs.push({id: d.id, data: data});
        });

        docs.reverse().forEach((item, index) => {
             const key = item.id;
             const prod = item.data;
             const delay = index * 0.1;
             const card = `<div class="product-card" data-category="${prod.category || 'general'}" id="card-${key}" onclick="animateCardAndOpen(event, '${key}', 'card-${key}')" style="animation-delay: ${delay}s"><span class="discount-badge">جديد</span><div class="img-wrapper"><img src="${prod.image}" class="prod-img" loading="lazy"></div><div class="prod-details"><div class="prod-title">${prod.title}</div><div class="price">${Number(prod.price || 0).toLocaleString()} د.ع</div></div></div>`;
            container.innerHTML += card;
        });
    });

    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.product-card');
            let count = 0;
            cards.forEach(card => {
                const title = card.querySelector('.prod-title').innerText.toLowerCase();
                if(title.includes(term)) {
                    card.style.display = 'flex';
                    if(term.length > 0) count++;
                } else {
                    card.style.display = 'none';
                }
            });
            if(term.length > 0) {
                const toast = document.getElementById('toast-notification'); 
                if (count > 0) {
                    toast.innerText = count === 1 ? "تم العثور على نتيجة واحدة" : `تم العثور على ${count} نتائج`;
                } else {
                    toast.innerText = "لا توجد نتائج";
                }
                toast.className = '';
                void toast.offsetWidth;
                toast.classList.add('show-toast'); 
                setTimeout(() => toast.classList.remove('show-toast'), 2000); 
            }
        });
    }
});

window.animateCardAndOpen = function(event, id, cardId) {
    const card = document.getElementById(cardId);
    if(!card) return;
    window.openProductPage(id);
}

window.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active-page');
    window.scrollTo(0,0);
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(pageId === 'home-page') {
        const firstNav = document.querySelector('.nav-item:nth-child(1)');
        if(firstNav) firstNav.classList.add('active');
    } else if(pageId === 'cart-page') {
        const secondNav = document.querySelector('.nav-item:nth-child(2)');
        if(secondNav) secondNav.classList.add('active');
        window.updateCartUI();
    }
}

window.goBack = function() { window.showPage('home-page'); }

window.openProductPage = function(id) {
    currentProductId = id;
    const prod = allProducts[id];
    if(!prod) return;
    
    const titleEl = document.getElementById('detail-title');
    if(titleEl) titleEl.innerText = prod.title || "";
    
    const priceEl = document.getElementById('detail-price');
    if(priceEl) priceEl.innerText = Number(prod.price || 0).toLocaleString() + " د.ع";
    
    const container = document.getElementById('detail-images-container');
    if(container) {
        container.innerHTML = "";
        let imgs = prod.images && Array.isArray(prod.images) ? prod.images : [prod.image];
        imgs.slice(0, 3).forEach(img => {
            container.innerHTML += `<img src="${img}" style="width: 100%; height: 250px; object-fit: contain; margin-bottom: 15px; border-radius: 10px; background: #fafafa; border: 1px solid #eee;">`;
        });
    }
    
    const descEl = document.querySelector('.detail-desc p');
    if(descEl) descEl.innerHTML = prod.description ? prod.description.replace(/\n/g, "<br>") : "لا يوجد وصف";
    
    const btnsContainer = document.getElementById('detail-dynamic-buttons');
    if(btnsContainer) {
        btnsContainer.innerHTML = '';
        if(prod.buttons && prod.buttons.length > 0) {
            prod.buttons.forEach(b => {
                btnsContainer.innerHTML += `<button onclick="openIframe('${b.url}')" class="dynamic-link-btn">${b.name}</button>`;
            });
        }
    }
    window.showPage('product-page');
}

window.openIframe = function(url) {
    const modal = document.getElementById('iframe-modal');
    const iframe = document.getElementById('internal-iframe');
    if(modal && iframe) {
        iframe.src = url;
        modal.style.display = 'flex';
    }
}

window.closeIframe = function() {
    const modal = document.getElementById('iframe-modal');
    const iframe = document.getElementById('internal-iframe');
    if(modal && iframe) {
        iframe.src = "";
        modal.style.display = 'none';
    }
}

window.addToCartFromDetail = function() {
    if(!currentProductId || !allProducts[currentProductId]) return;
    const prod = allProducts[currentProductId];
    
    const existing = cart.find(item => item.id === currentProductId);
    if(existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: currentProductId, title: prod.title, price: Number(prod.price) || 0, image: prod.image, qty: 1, age: 1 });
    }
    window.updateCartUI();
    showToast("تمت الإضافة للسلة!");
}

window.addToCart = function(title, price, img) { 
    cart.push({ title, price, img, qty: 1, age: 1 }); 
    window.updateCartUI(); 
    showToast("تمت الإضافة للسلة!"); 
}

window.updateCartUI = function() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    if(!cartItems || !cartTotal) return;
    
    cartItems.innerHTML = "";
    let total = 0;
    let totalItems = 0;
    
    const badge = document.getElementById('cart-badge');

    if(cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">السلة فارغة حالياً</p>';
        cartTotal.innerText = '0';
        const grandTotalEl = document.getElementById('cart-grand-total');
        if(grandTotalEl) grandTotalEl.innerText = '0';
        if(badge) badge.style.display = 'none';
        return;
    }
    
    cart.forEach((item, index) => {
        totalItems += item.qty;
        total += item.price * item.qty;
        cartItems.innerHTML += `
            <div style="display:flex; align-items:center; background:#fff; padding:10px; border-radius:10px; margin-bottom:10px; box-shadow:0 2px 5px rgba(0,0,0,0.05); border: 1px solid #eee;">
                <img src="${item.image}" style="width:60px; height:60px; object-fit:contain; border-radius:5px; margin-left:15px;">
                <div style="flex-grow:1;">
                    <div style="font-weight:bold; font-size:14px;">${item.title}</div>
                    <div style="color:var(--primary); font-size:14px; font-weight:bold; margin-top:5px;">${item.price.toLocaleString()} د.ع</div>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px; font-size:12px;">
                        <span>العمر:</span>
                        <button onclick="changeAge(${index}, 1)" style="border:1px solid #ddd; background:#f9f9f9; width:22px; height:22px; border-radius:5px; font-weight:bold; cursor:pointer;">+</button>
                        <span style="font-weight:bold; font-size:14px;">${item.age || 1}</span>
                        <button onclick="changeAge(${index}, -1)" style="border:1px solid #ddd; background:#f9f9f9; width:22px; height:22px; border-radius:5px; font-weight:bold; cursor:pointer;">-</button>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; background:#f9f9f9; padding:5px 10px; border-radius:20px;">
                    <span style="font-size:12px; font-weight:bold; color:#555; margin-left:5px;">الكمية:</span>
                    <button onclick="changeQty(${index}, 1)" style="border:none; background:none; font-weight:bold; font-size:18px; cursor:pointer;">+</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button onclick="changeQty(${index}, -1)" style="border:none; background:none; font-weight:bold; font-size:18px; cursor:pointer;">-</button>
                </div>
            </div>
        `;
    });
    
    cartTotal.innerText = total.toLocaleString();
    const grandTotalEl = document.getElementById('cart-grand-total');
    if(grandTotalEl) {
        grandTotalEl.innerText = (total + 5000).toLocaleString();
    }
    
    if(badge) {
        badge.style.display = 'flex';
        badge.innerText = totalItems;
    }
}

window.changeAge = function(index, amount) {
    if(!cart[index].age) cart[index].age = 1;
    cart[index].age += amount;
    if(cart[index].age < 1) cart[index].age = 1; 
    window.updateCartUI();
}

window.changeQty = function(index, amount) {
    cart[index].qty += amount;
    if(cart[index].qty <= 0) cart.splice(index, 1);
    window.updateCartUI();
}

window.removeFromCart = function(index) { 
    cart.splice(index, 1); 
    window.updateCartUI(); 
}

window.clearCart = function() { 
    cart = []; 
    window.updateCartUI(); 
}

window.processCheckout = async function() {
    if(cart.length === 0) { showToast("السلة فارغة!"); return; }
    
    const name = document.getElementById('order-name').value;
    const phone = document.getElementById('order-phone').value;
    const gov = document.getElementById('order-gov').value;
    const address = document.getElementById('order-address').value;
    const notesSupplier = document.getElementById('order-notes-supplier') ? document.getElementById('order-notes-supplier').value : '';

    if(!name || !phone || !gov || !address) {
        showToast("يرجى ملء جميع الحقول المطلوبة");
        return;
    }

    const toast = document.getElementById('toast-notification'); 
    toast.innerText = "جاري إرسال الطلب..."; 
    toast.className = '';
    toast.classList.add('show-toast');

    try {
        const orderNumber = Math.floor(1000000 + Math.random() * 9000000); 
        let currentTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

        await addDoc(collection(db, 'orders'), {
            cart: cart,
            name: name,
            phone: phone,
            gov: gov,
            address: address,
            notesSupplier: notesSupplier,
            deliveryFee: 5000,
            totalAmount: currentTotal + 5000,
            orderNumber: orderNumber,
            status: 'pending',
            date: serverTimestamp()
        });
        
        toast.classList.remove('show-toast'); 
        
        cart = [];
        document.getElementById('order-name').value = '';
        document.getElementById('order-phone').value = '';
        document.getElementById('order-gov').value = '';
        document.getElementById('order-address').value = '';
        if(document.getElementById('order-notes-supplier')) document.getElementById('order-notes-supplier').value = '';
        window.updateCartUI();
        
        document.getElementById('success-modal').style.display = 'flex';
        
    } catch (e) {
        toast.classList.remove('show-toast');
        showToast("حدث خطأ أثناء الإرسال!");
        console.error(e);
    }
}

window.closeSuccessModal = function() {
    document.getElementById('success-modal').style.display = 'none';
    window.showPage('home-page');
}

window.handleGoogleLogin = function() { 
    showToast("جاري الاتصال..."); 
    setTimeout(() => { 
        user = { name: "مستخدم", email: "user@gmail.com", avatar: "https://via.placeholder.com/80" }; 
        updateProfileUI(); 
        window.showPage('home-page'); 
    }, 1500); 
}

function updateProfileUI() { 
    if(user) { 
        const pName = document.getElementById('profile-name');
        if(pName) pName.innerText = user.name; 
        const pEmail = document.getElementById('profile-email');
        if(pEmail) pEmail.innerText = user.email; 
        const pImg = document.getElementById('profile-img');
        if(pImg) pImg.src = user.avatar; 
    } 
}

window.openWhatsAppSupport = function() { 
    if (adminPhoneNumber) window.open(`https://wa.me/${adminPhoneNumber}`, '_blank'); 
    else showToast("رقم الخدمة غير متوفر"); 
}

function showToast(msg) { 
    const toast = document.getElementById('toast-notification'); 
    if(toast) {
        toast.innerText = msg; 
        toast.className = 'toast-3d'; 
        void toast.offsetWidth; 
        toast.classList.add('show-toast'); 
        setTimeout(() => {
            toast.classList.remove('show-toast');
            setTimeout(() => toast.className = '', 400); 
        }, 3000); 
    }
}

window.toggleSidebar = function() { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.toggle('active'); 
    if(overlay) overlay.classList.toggle('active'); 
}

window.filterProducts = function(cat) {
    const cards = document.querySelectorAll('.product-card');
    document.querySelectorAll('.cat-box').forEach(b => b.classList.remove('active'));
    if(typeof event !== 'undefined' && event.currentTarget) {
        const box = event.currentTarget.querySelector('.cat-box');
        if(box) box.classList.add('active');
    }
    cards.forEach(card => { 
        if(cat === 'all' || card.dataset.category === cat) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none'; 
        }
    });
}
