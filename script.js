/* =========================================================
   PricePulse — Shared application logic (Arabic - Full)
   ========================================================= */

let PRODUCTS = [];
const API_URL = 'https://pricepulse1.vercel.app/api/public/products';

// ===== تنسيق العملة (تم التعديل ليكون مثل أمازون تماماً) =====
(function addCurrencyStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .price-amount { 
        display: inline-flex; 
        align-items: baseline; 
        direction: ltr; 
        white-space: nowrap; 
    }
    .currency-symbol { 
        font-size: 0.65em; 
        font-weight: 600; 
        color: var(--text-dim, #8A7A6D); 
        margin-right: 3px; 
    }
    .price-number { 
        font-weight: 800; 
        font-size: inherit; 
    }
    /* تم تصغير الحجم ورفع النقطة مع الـ 00 */
    .price-decimal { 
        font-size: 0.3em; 
        font-weight: 700; 
        vertical-align: super; 
        line-height: 0; 
        display: inline-block;
        margin-left: 1px;
    }
    
    /* فصل السعرين في البطاقة */
    .price-wrapper { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; margin-bottom: 8px; }
    .price-current { font-size: 1.15rem; color: var(--good); }
    .price-original { font-size: 0.85rem; color: var(--muted); text-decoration: line-through; }
  `;
  document.head.appendChild(style);
})();

function bestPrice(product) {
  return product.stores.reduce((a, b) => (a.price < b.price ? a : b));
}

function money(n, currency = 'EGP') {
  // نقوم بتنسيق الرقم لفصل الجزء الصحيح عن الجزء العشري
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : '00';

  if (currency === 'EGP') {
    // النقطة والـ 00 مع بعض مرفوعين فوق الرقم
    return `<span class="price-amount"><span class="currency-symbol">EGP</span><span class="price-number">${integerPart}</span><span class="price-decimal">.${decimalPart}</span></span>`;
  }
  return `<span class="price-amount"><span class="currency-symbol">$</span><span class="price-number">${integerPart}</span><span class="price-decimal">.${decimalPart}</span></span>`;
}

function discountPct(oldP, newP) {
  if (!oldP || oldP === 0) return 0;
  return Math.round(((oldP - newP) / oldP) * 100);
}

function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function productCardHTML(p) {
  if (!p.stores || p.stores.length === 0) return '';
  const best = bestPrice(p);
  const pct = discountPct(best.old, best.price);
  const currency = p.currency || 'EGP';
  return `
    <article class="product-card" data-id="${p.id}">
      ${pct > 0 ? `<span class="badge-drop">${pct}% خصم</span>` : ""}
      <div class="product-thumb" aria-hidden="true">${p.icon}</div>
      <div class="product-body">
        <div class="store-list">
          ${p.stores.map(s => `<span class="store-tag">${s.name}</span>`).join(' ')}
        </div>
        <h3><a href="product.html?id=${p.id}&cat=${p.category}">${p.name}</a></h3>
        
        <!-- السعر الحالي والأصلي بنفس التنسيق الصحيح -->
        <div class="price-wrapper">
          <div class="price-current">${money(best.price, currency)}</div>
          ${best.old > 0 ? `<div class="price-original">${money(best.old, currency)}</div>` : ''}
        </div>

        <button class="btn cheapest-btn" data-id="${p.id}" type="button">أفضل سعر</button>
      </div>
    </article>
  `;
}

function renderGrid(container, products) {
  if (!container) return;
  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>لا توجد نتائج مطابقة.</p>
      </div>`;
    return;
  }
  container.innerHTML = products.map(productCardHTML).join("");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".cheapest-btn");
  if (!btn) return;
  const product = PRODUCTS.find((p) => p.id === btn.dataset.id);
  if (!product) return;
  const best = bestPrice(product);
  const currency = product.currency || 'EGP';
  showToast(`أفضل سعر لـ ${product.name}: ${money(best.price, currency)} من ${best.name}`);
});

async function fetchProducts() {
  if (PRODUCTS.length > 0) return;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch products');
    PRODUCTS = await response.json();
    PRODUCTS.forEach(p => {
      if (!p.currency) p.currency = 'EGP';
    });
  } catch (err) {
    console.error('Error loading products:', err);
    PRODUCTS = [];
  }
}

async function initHomePage() {
  const grid = document.querySelector("#product-grid");
  if (!grid) return;

  await fetchProducts();
  if (PRODUCTS.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>تعذر تحميل المنتجات. حاول مرة أخرى لاحقاً.</p></div>`;
    return;
  }

  let initialFilter = "all";
  const returnCat = sessionStorage.getItem('returnCategory');
  if (returnCat) {
    initialFilter = returnCat;
    sessionStorage.removeItem('returnCategory');
  }

  const savedScroll = parseInt(sessionStorage.getItem('returnScroll') || '0');
  const savedCardId = sessionStorage.getItem('returnCardId');
  sessionStorage.removeItem('returnScroll');
  sessionStorage.removeItem('returnCardId');

  renderGrid(grid, PRODUCTS);

  const searchInput = document.querySelector("#search-input");
  const tabs = document.querySelectorAll(".tab[data-filter]");
  let activeFilter = initialFilter;

  function applyFilters() {
    const term = (searchInput?.value || "").trim();
    let list = PRODUCTS;
    if (activeFilter !== "all") {
      list = list.filter((p) => p.category === activeFilter);
    }
    if (term) {
      list = list.filter((p) => p.name.toLowerCase().includes(term.toLowerCase()));
    }
    renderGrid(grid, list);
  }

  tabs.forEach((tab) => {
    if (tab.dataset.filter === activeFilter) {
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
    } else {
      tab.classList.remove("active");
      tab.setAttribute("aria-selected", "false");
    }
  });

  searchInput?.addEventListener("input", applyFilters);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.dataset.filter;
      applyFilters();
    });
  });

  document.querySelector("#search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilters();
  });

  applyFilters();

  if (savedScroll > 0 || savedCardId) {
    setTimeout(() => {
      if (savedCardId) {
        const targetCard = document.querySelector(`.product-card[data-id="${savedCardId}"]`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      if (savedScroll > 0) {
        window.scrollTo({ top: savedScroll, behavior: 'smooth' });
      }
    }, 300);
  }
}

function initOffersPage() {
  const grid = document.querySelector("#offers-grid");
  if (!grid) return;

  if (PRODUCTS.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>لا توجد منتجات متاحة.</p></div>`;
    return;
  }

  const withDiscount = PRODUCTS.map((p) => ({ p, best: bestPrice(p) }))
    .filter((x) => discountPct(x.best.old, x.best.price) > 0)
    .sort((a, b) => discountPct(b.best.old, b.best.price) - discountPct(a.best.old, a.best.price));

  let list = withDiscount.map((x) => x.p);
  renderGrid(grid, list);

  const chips = document.querySelectorAll(".chip[data-sort]");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const sort = chip.dataset.sort;
      let sorted = [...list];
      if (sort === "price-asc") sorted.sort((a, b) => bestPrice(a).price - bestPrice(b).price);
      if (sort === "price-desc") sorted.sort((a, b) => bestPrice(b).price - bestPrice(a).price);
      if (sort === "discount") {
        sorted.sort((a, b) => {
          const da = discountPct(bestPrice(a).old, bestPrice(a).price);
          const db = discountPct(bestPrice(b).old, bestPrice(b).price);
          return db - da;
        });
      }
      renderGrid(grid, sorted);
    });
  });
}

function initCategoriesPage() {
  const wrap = document.querySelector("#category-counts");
  if (!wrap) return;
  if (PRODUCTS.length === 0) return;
  
  wrap.querySelectorAll(".cat-card").forEach((card) => {
    const cat = card.dataset.category;
    const count = PRODUCTS.filter((p) => p.category === cat).length;
    const countEl = card.querySelector(".count");
    if (countEl) countEl.textContent = `${count} منتج`;
  });
}

async function initProductPage() {
  const wrap = document.querySelector("#product-detail");
  if (!wrap) return;

  await fetchProducts();

  const params = new URLSearchParams(location.search);
  const id = params.get("id") || (PRODUCTS.length > 0 ? PRODUCTS[0].id : null);
  
  if (!id || PRODUCTS.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>المنتج غير موجود.</p></div>`;
    return;
  }

  const cat = params.get("cat") || "all";

  if (cat && cat !== "all") {
    sessionStorage.setItem('returnCategory', cat);
  } else {
    sessionStorage.removeItem('returnCategory');
  }
  sessionStorage.setItem('returnScroll', window.scrollY);
  sessionStorage.setItem('returnCardId', id);

  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>المنتج غير موجود.</p></div>`;
    return;
  }

  const best = bestPrice(product);
  const sortedStores = [...product.stores].sort((a, b) => a.price - b.price);
  const currency = product.currency || 'EGP';

  document.title = `${product.name} — PricePulse`;

  wrap.innerHTML = `
    <div class="pd-hero">
      <div class="pd-image" aria-hidden="true">${product.icon}</div>
      <div class="pd-info">
        <h1>${product.name}</h1>
        <div class="stars" aria-label="التقييم ${product.rating} من 5">${"★".repeat(Math.round(product.rating))}${"☆".repeat(5 - Math.round(product.rating))}
          <span style="color:var(--muted); font-weight:600; font-size:.85rem;">(${product.reviews} تقييم)</span>
        </div>
        
        <div class="price-wrapper">
          <div class="price-current" style="font-size:1.7rem;">${money(best.price, currency)}</div>
          ${best.old > 0 ? `<div class="price-original">${money(best.old, currency)}</div>` : ''}
        </div>

        <button class="btn cheapest-btn" data-id="${product.id}" type="button" style="width:auto; padding:12px 22px;">
          احصل على أفضل سعر — ${best.name}
        </button>
      </div>
    </div>

    <div class="section-title"><h2>قارن الأسعار عبر المتاجر</h2></div>
    <div class="info-card" style="padding:0; overflow-x:auto;">
      <table class="compare-table">
        <thead>
          <tr><th>المتجر</th><th>السعر</th><th>السعر الأصلي</th><th>الرابط</th></tr>
        </thead>
        <tbody>
          ${sortedStores
            .map(
              (s, i) => `
            <tr class="${i === 0 ? "row-best" : ""}">
              <td>${s.name}${i === 0 ? " 🏆" : ""}</td>
              <td>${money(s.price, currency)}</td>
              <td class="price-old">${s.old > 0 ? money(s.old, currency) : '—'}</td>
              <td>
                ${s.url ? `<a href="${s.url}" target="_blank" class="btn small ghost" style="text-decoration:none;">زيارة المتجر</a>` : `<span style="color:var(--muted);">لا يوجد رابط</span>`}
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function initContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const message = form.querySelector("#message").value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailOk || !message) {
      e.preventDefault();
      showToast("يرجى التأكد من ملء جميع الحقول بشكل صحيح.");
      return;
    }
    showToast("سيتم فتح بريدك الإلكتروني لإرسال الرسالة.");
  });
}

function markActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".bottom-nav a, .brand-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  markActiveNav();
  if (window.location.pathname.includes('product.html') || window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
    await fetchProducts();
  }
  initHomePage();
  initOffersPage();
  initCategoriesPage();
  initProductPage();
  initContactForm();
});

document.addEventListener("click", function(e) {
    const link = e.target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("javascript:")) return;
    if (href.startsWith("product.html")) return;
    e.preventDefault();
    window.location.replace(href);
});
