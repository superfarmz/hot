/* ============================================================
   HOUSE OF TRITON — main.js
   Renders menu from HOT_DATA, wires WhatsApp ordering,
   drives scroll-based reveals and hero parallax.
   ============================================================ */

const WA_NUMBER = "918003222953";

function waLink(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

function formatPrice(price) {
  // price can be: number, string ("70/100"), or object ({S,M,L})
  if (typeof price === "number") return `₹${price}`;
  if (typeof price === "string") return `₹${price}`;
  return null; // size-based, handled separately
}

/* ---------- LOADER ---------- */
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  setTimeout(() => loader.classList.add("done"), 400);
});

/* ---------- NAV SCROLL STATE ---------- */
const nav = document.getElementById("nav");
let lastScrollY = 0;
function updateNav() {
  const y = window.scrollY;
  if (y > 80) nav.classList.add("scrolled");
  else nav.classList.remove("scrolled");
  lastScrollY = y;
}
window.addEventListener("scroll", updateNav, { passive: true });
updateNav();

/* ---------- HERO PARALLAX ---------- */
const heroBg = document.getElementById("hero-bg");
const heroContent = document.querySelector(".hero-content");
function updateHeroParallax() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  if (y > vh * 1.5) return;
  // bg moves at 40% of scroll speed — slower than viewport = parallax depth
  heroBg.style.transform = `translateY(${y * 0.4}px)`;
  // content fades and lifts slightly as you scroll away
  const progress = Math.min(y / (vh * 0.7), 1);
  heroContent.style.transform = `translateY(${y * 0.15}px)`;
  heroContent.style.opacity = `${1 - progress * 1.2}`;
}
window.addEventListener("scroll", updateHeroParallax, { passive: true });
updateHeroParallax();

/* ---------- CART + ORDER BAR ---------- */
const orderBar = document.getElementById("order-bar");
const orderBarText = document.getElementById("order-bar-text");
const orderBarBtn = document.getElementById("order-bar-btn");
const navOrderBtn = document.getElementById("nav-order");

// cart: { "ItemName||₹price": { name, priceLabel } }
const cart = {};

function buildCartMessage() {
  const items = Object.values(cart);
  if (items.length === 0) return "";
  const lines = items.map(i => `• ${i.name} — ${i.priceLabel}${i.qty > 1 ? ` x${i.qty}` : ""}`).join("\n");
  return `Hi House of Triton! 🍽️\n\nI'd like to order:\n\n${lines}\n\nPlease confirm my order. Thank you!`;
}

function updateOrderBar() {
  const items = Object.values(cart);
  const totalQty = items.reduce((sum, i) => sum + (i.qty || 1), 0);
  if (totalQty === 0) {
    orderBar.classList.remove("show");
    return;
  }
  orderBar.classList.add("show");
  if (totalQty === 1) {
    orderBarText.textContent = `${items[0].name} — ${items[0].priceLabel}`;
    orderBarBtn.textContent = "Order on WhatsApp";
  } else {
    orderBarText.textContent = `${totalQty} items in your order`;
    orderBarBtn.textContent = `Order ${totalQty} items on WhatsApp`;
  }
  const msg = buildCartMessage();
  orderBarBtn.href = waLink(msg);
  navOrderBtn.href = waLink(msg);
}

// default nav order button (no selection yet)
navOrderBtn.href = waLink("Hi House of Triton! I'd like to place an order.");

/* ---------- MANIFESTO SCROLL REVEAL ---------- */
const revealEls = document.querySelectorAll(".manifesto .reveal");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in-view");
    });
  },
  { threshold: 0.6 }
);
revealEls.forEach((el) => revealObserver.observe(el));

/* ---------- TODAY'S SPECIAL RAIL ---------- */
const todayRail = document.getElementById("today-rail");
const todayMsg = document.getElementById("today-msg");
const todayOrderBtn = document.getElementById("today-order");

const DAY_INDEX_MAP = [6, 0, 1, 2, 3, 4, 5]; // JS getDay() Sun=0 -> our Mon-first array index
const todayJsDay = new Date().getDay();
const activeTodayIndex = DAY_INDEX_MAP.indexOf(todayJsDay);

function renderTodayRail() {
  HOT_DATA.wotd.forEach((d, i) => {
    const card = document.createElement("div");
    card.className = "today-card" + (i === activeTodayIndex ? " active" : "");
    card.innerHTML = `
      <div class="today-day">${d.day}</div>
      <div class="today-name">${d.name}</div>
      <div class="today-was">₹${d.was}</div>
      <div class="today-now">₹${d.now}</div>
    `;
    card.addEventListener("click", () => {
      document.querySelectorAll(".today-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      const cartKey = d.name + "||" + `₹${d.now}`;
      // toggle in cart
      if (cart[cartKey]) {
        delete cart[cartKey];
        card.classList.remove("active");
        // re-apply today marker if needed
        if (i === activeTodayIndex) card.classList.add("active");
      } else {
        cart[cartKey] = { name: d.name, priceLabel: `₹${d.now}`, qty: 1 };
      }
      todayMsg.innerHTML = `Selected <strong>${d.name}</strong> — ₹${d.now} today only.`;
      updateOrderBar();
    });
    todayRail.appendChild(card);
  });

  // pre-fill today's order button with the actual current day
  if (activeTodayIndex >= 0) {
    const d = HOT_DATA.wotd[activeTodayIndex];
    const message = `Hi House of Triton!\n\nI'd love to order today's special:\n*${d.name}* — ₹${d.now} (${d.day})\n\nPlease confirm. Thank you!`;
    todayOrderBtn.href = waLink(message);
    todayMsg.innerHTML = `Today is <strong>${d.day}</strong> — featuring <strong>${d.name}</strong> at ₹${d.now}.`;
  }
}
renderTodayRail();

/* ---------- MENU CHAPTERS ---------- */
const chaptersContainer = document.getElementById("menu-chapters");

function renderSizePicker(item) {
  // pizza-style {S,M,L} pricing -> render as inline size options, default to M if available
  const sizes = ["S", "M", "L"];
  const available = sizes.filter((s) => item.price[s] != null);
  const defaultSize = available.includes("M") ? "M" : available[0];
  return { available, defaultSize };
}

function plateHTML(item) {
  const isHero = item.hero && item.photo;
  const hasObjectPrice = typeof item.price === "object" && item.price !== null;

  let priceDisplay = "";
  let initialPriceLabel = "";

  if (hasObjectPrice) {
    const { available, defaultSize } = renderSizePicker(item);
    initialPriceLabel = `₹${item.price[defaultSize]} (${defaultSize})`;
    priceDisplay = `<div class="plate-sizes">${available
      .map((s) => `<span data-size="${s}" class="${s === defaultSize ? "active-size" : ""}"><b>${s}</b> ₹${item.price[s]}</span>`)
      .join("")}</div>`;
  } else {
    initialPriceLabel = formatPrice(item.price);
    priceDisplay = `<div class="plate-row"><span></span><span class="plate-price">${initialPriceLabel}</span></div>`;
  }

  const stepper = `<div class="plate-stepper">
    <button class="stepper-btn stepper-minus" aria-label="Remove one">−</button>
    <span class="stepper-qty">1</span>
    <button class="stepper-btn stepper-plus" aria-label="Add one">+</button>
  </div>`;

  const hint = `<span class="plate-order">Tap to add to order</span>`;

  if (isHero) {
    return `
      <div class="plate hero-plate" data-name="${item.name}" data-price="${initialPriceLabel}">
        <div class="hero-plate-img"><img src="${item.photo}" alt="${item.name}" loading="lazy"></div>
        <div class="hero-plate-body">
          <span class="hero-plate-tag">House favourite</span>
          <div class="plate-row">
            <span class="plate-name">${item.name}</span>
            ${!hasObjectPrice ? `<span class="plate-price">${initialPriceLabel}</span>` : ""}
          </div>
          <p class="plate-desc">${item.desc}</p>
          ${hasObjectPrice ? priceDisplay : ""}
          ${hint}${stepper}
        </div>
      </div>`;
  }

  return `
    <div class="plate" data-name="${item.name}" data-price="${initialPriceLabel}">
      <div class="plate-row">
        <span class="plate-name">${item.name}</span>
        ${!hasObjectPrice ? `<span class="plate-price">${initialPriceLabel}</span>` : ""}
      </div>
      <p class="plate-desc">${item.desc}</p>
      ${hasObjectPrice ? priceDisplay : ""}
      ${hint}${stepper}
    </div>`;
}

function refreshPlateUI(plate, qty) {
  const qtyEl = plate.querySelector(".stepper-qty");
  if (qtyEl) qtyEl.textContent = qty;
  if (qty > 0) {
    plate.classList.add("picked");
  } else {
    plate.classList.remove("picked");
  }
}

function renderChapters() {
  let chapterNum = 1;
  Object.entries(HOT_DATA.menu).forEach(([key, cat]) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.id = `chapter-${key}`;

    const plates = cat.items.map((item) => plateHTML(item)).join("");

    section.innerHTML = `
      <div class="chapter-head">
        <span class="chapter-num">Chapter ${String(chapterNum).padStart(2, "0")}</span>
        <h3 class="chapter-title">${cat.label}</h3>
        <span class="chapter-sub">${cat.subtitle}</span>
      </div>
      <div class="chapter-grid">${plates}</div>
    `;
    chaptersContainer.appendChild(section);
    chapterNum++;
  });

  // wire events after all chapters are in the DOM
  document.querySelectorAll(".plate").forEach((plate) => {
    const name = plate.getAttribute("data-name");

    // size switching
    const sizeEls = plate.querySelectorAll(".plate-sizes span");
    sizeEls.forEach((sizeEl) => {
      sizeEl.addEventListener("click", (e) => {
        e.stopPropagation();
        sizeEls.forEach((s) => s.classList.remove("active-size"));
        sizeEl.classList.add("active-size");
        const size = sizeEl.getAttribute("data-size");
        const priceText = sizeEl.textContent.replace(size, "").trim();
        plate.setAttribute("data-price", `${priceText} (${size})`);
        // update cart entry if already added
        const cartKey = name + "||" + plate.getAttribute("data-price");
        if (Object.values(cart).find(i => i.name === name)) {
          const oldKey = Object.keys(cart).find(k => k.startsWith(name + "||"));
          if (oldKey) {
            const qty = cart[oldKey].qty;
            delete cart[oldKey];
            cart[cartKey] = { name, priceLabel: `${priceText} (${size})`, qty };
          }
        }
        updateOrderBar();
      });
    });

    // − button: decrement qty, remove at 0
    const minusBtn = plate.querySelector(".stepper-minus");
    minusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const priceLabel = plate.getAttribute("data-price");
      const cartKey = name + "||" + priceLabel;
      if (!cart[cartKey]) return;
      cart[cartKey].qty -= 1;
      if (cart[cartKey].qty <= 0) {
        delete cart[cartKey];
        refreshPlateUI(plate, 0);
      } else {
        refreshPlateUI(plate, cart[cartKey].qty);
      }
      updateOrderBar();
    });

    // + button: increment qty
    const plusBtn = plate.querySelector(".stepper-plus");
    plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const priceLabel = plate.getAttribute("data-price");
      const cartKey = name + "||" + priceLabel;
      if (cart[cartKey]) {
        cart[cartKey].qty += 1;
      } else {
        cart[cartKey] = { name, priceLabel, qty: 1 };
      }
      refreshPlateUI(plate, cart[cartKey].qty);
      updateOrderBar();
    });

    // plate body click: add 1 if not in cart, otherwise do nothing (use + / − buttons)
    plate.addEventListener("click", (e) => {
      if (e.target.closest(".stepper-btn") || e.target.closest(".plate-sizes")) return;
      const priceLabel = plate.getAttribute("data-price");
      const cartKey = name + "||" + priceLabel;
      if (!cart[cartKey]) {
        cart[cartKey] = { name, priceLabel, qty: 1 };
        refreshPlateUI(plate, 1);
        updateOrderBar();
      }
    });
  });
}
renderChapters();

/* ---------- COMBOS ---------- */
const combosGrid = document.getElementById("combos-grid");
function renderCombos() {
  HOT_DATA.combos.forEach((combo) => {
    const card = document.createElement("div");
    card.className = "combo-card";
    const cartKey = `Combo ${combo.num}||₹${combo.price}`;
    const comboFullName = `Combo ${combo.num}: ${combo.name}`;
    card.innerHTML = `
      <div class="combo-num">${combo.num}</div>
      <div style="flex:1">
        <div class="combo-name">${combo.name}</div>
        <div class="combo-price">₹${combo.price}</div>
        <span class="plate-order">Tap to add to order</span>
        <div class="plate-stepper" style="display:none">
          <button class="stepper-btn stepper-minus" aria-label="Remove one">−</button>
          <span class="stepper-qty">1</span>
          <button class="stepper-btn stepper-plus" aria-label="Add one">+</button>
        </div>
      </div>
    `;
    const stepper = card.querySelector(".plate-stepper");
    const hint = card.querySelector(".plate-order");
    const qtyEl = card.querySelector(".stepper-qty");

    function refreshCombo(qty) {
      if (qty > 0) {
        card.classList.add("picked");
        stepper.style.display = "inline-flex";
        hint.style.display = "none";
        qtyEl.textContent = qty;
      } else {
        card.classList.remove("picked");
        stepper.style.display = "none";
        hint.style.display = "";
      }
    }

    card.querySelector(".stepper-minus").addEventListener("click", (e) => {
      e.stopPropagation();
      if (!cart[cartKey]) return;
      cart[cartKey].qty -= 1;
      if (cart[cartKey].qty <= 0) { delete cart[cartKey]; refreshCombo(0); }
      else refreshCombo(cart[cartKey].qty);
      updateOrderBar();
    });

    card.querySelector(".stepper-plus").addEventListener("click", (e) => {
      e.stopPropagation();
      if (cart[cartKey]) cart[cartKey].qty += 1;
      else cart[cartKey] = { name: comboFullName, priceLabel: `₹${combo.price}`, qty: 1 };
      refreshCombo(cart[cartKey].qty);
      updateOrderBar();
    });

    card.addEventListener("click", (e) => {
      if (e.target.closest(".stepper-btn")) return;
      if (!cart[cartKey]) {
        cart[cartKey] = { name: comboFullName, priceLabel: `₹${combo.price}`, qty: 1 };
        refreshCombo(1);
        updateOrderBar();
      }
    });

    combosGrid.appendChild(card);
  });
}
renderCombos();

/* ---------- STORY SECTION IMAGES ---------- */
// story-img-1 (tall) uses the one real uploaded interior photo.
// story-img-2 and story-img-3 are distinct curated photos, deliberately
// NOT reused from any hero plate elsewhere on the site, to avoid duplication.
function fillStoryImages() {
  const img1 = document.getElementById("story-img-1"); // real interior photo
  const img2 = document.getElementById("story-img-2"); // unique curated photo
  const img3 = document.getElementById("story-img-3"); // unique curated photo

  if (HOT_DATA.storyPhotos) {
    img1.style.backgroundImage = `url('${HOT_DATA.storyPhotos.interior}')`;
    img2.style.backgroundImage = `url('${HOT_DATA.storyPhotos.biscoff}')`;
    img3.style.backgroundImage = `url('${HOT_DATA.storyPhotos.korean}')`;
  }
}
fillStoryImages();



