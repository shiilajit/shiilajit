/* GOOGEER Himalayan Shilajit — checkout, Google Sheets order submission, and Snap Pixel tracking. */
const CONFIG = {
  PRODUCT_NAME: "Googeer Himalayan Shilajit",
  SKU: "GOOGEER-SHILAJIT-100G",
  PRODUCT_WEIGHT: "100 غرام",
  COUNTRY: "SA",
  CURRENCY: "SAR",
  OFFERS: {
    1: { label: "عبوة واحدة · 100 غرام", price: 198 },
    2: { label: "عبوتان · 200 غرام", price: 288 },
    3: { label: "3 عبوات · 300 غرام", price: 324 }
  },
  ORDER_ENDPOINT: "https://script.google.com/macros/s/AKfycbxxBGHE4mZ5iDdplvvaFxVhrHoOMETyRoafgk8iG-DGx9vhY27JgFhc3VHFBO22hu4x0w/exec",
  SNAP_PIXEL_ID: "233915bf-25f6-4119-9362-701fe3212185"
};

function trackSnap(eventName, data) {
  try {
    if (typeof window.snaptr !== "function") return false;
    window.snaptr("track", eventName, data || {});
    return true;
  } catch (_) {
    return false;
  }
}

(function initPixel() {
  if (!CONFIG.SNAP_PIXEL_ID) return;
  try {
    (function(e,t,n){if(e.snaptr)return;const a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];const r=t.createElement("script");r.async=true;r.src=n;const s=t.getElementsByTagName("script")[0];s.parentNode.insertBefore(r,s)})(window,document,"https://sc-static.net/scevent.min.js");
    window.snaptr("init", CONFIG.SNAP_PIXEL_ID);
    trackSnap("PAGE_VIEW", { item_category: "dietary_supplement", item_ids: [CONFIG.SKU] });
  } catch (_) {}
})();

const form = document.getElementById("order-form");
const total = document.getElementById("summary-total");
const offerSummary = document.getElementById("summary-offer");
const status = document.getElementById("form-status");
const submitButton = form?.querySelector('button[type="submit"]');
const phoneInput = form?.elements.phone;
const phoneError = document.getElementById("phone-error");
let checkoutTracked = false;
let orderSubmitting = false;
let orderSubmitted = false;
let pendingOrder = null;

function currentOffer() {
  const code = Number(new FormData(form).get("offer") || 1);
  return CONFIG.OFFERS[code] ? { code, ...CONFIG.OFFERS[code] } : { code: 1, ...CONFIG.OFFERS[1] };
}

function updateSummary() {
  const offer = currentOffer();
  if (offerSummary) offerSummary.textContent = offer.label;
  if (total) total.textContent = offer.price + " ريال";
}

function normalizeSaudiPhone(value) {
  let phone = String(value || "").trim()
    .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s()\-\u200e\u200f\u061c]/g, "");
  if (phone.startsWith("+966")) phone = "0" + phone.slice(4);
  else if (phone.startsWith("00966")) phone = "0" + phone.slice(5);
  else if (phone.startsWith("966")) phone = "0" + phone.slice(3);
  else if (/^5\d{8}$/.test(phone)) phone = "0" + phone;
  return /^05\d{8}$/.test(phone) ? phone : null;
}

function trackCheckout() {
  if (checkoutTracked || orderSubmitted) return;
  const offer = currentOffer();
  checkoutTracked = trackSnap("START_CHECKOUT", {
    price: offer.price,
    currency: CONFIG.CURRENCY,
    item_ids: [CONFIG.SKU],
    item_category: "dietary_supplement",
    number_items: offer.code
  });
}

form?.addEventListener("change", () => {
  updateSummary();
  trackCheckout();
});
form?.addEventListener("focusin", trackCheckout);

phoneInput?.addEventListener("input", () => {
  phoneInput.removeAttribute("aria-invalid");
  if (phoneError) phoneError.textContent = "";
  if (status) {
    status.textContent = "";
    status.className = "form-status";
  }
});

updateSummary();

if (submitButton) {
  submitButton.disabled = false;
  submitButton.textContent = "تأكيد الطلب — الدفع عند الاستلام ←";
}
if (status) {
  status.className = "form-status";
  status.textContent = "";
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form || !status || !submitButton || orderSubmitting || orderSubmitted) return;

  status.textContent = "";
  status.className = "form-status";
  if (phoneError) phoneError.textContent = "";

  const name = String(form.elements.name.value || "").trim();
  const phone = normalizeSaudiPhone(form.elements.phone.value);
  const phoneField = form.elements.phone;
  if (name.length < 2) {
    status.textContent = "يرجى كتابة الاسم الكامل.";
    status.className = "form-status error";
    form.elements.name.focus();
    return;
  }
  if (!phone) {
    if (phoneError) phoneError.textContent = "أدخل رقم جوال سعودي صحيحًا من 10 أرقام، مثل 05xxxxxxxx.";
    phoneField.setAttribute("aria-invalid", "true");
    phoneField.focus();
    return;
  }
  const offer = currentOffer();
  if (navigator.onLine === false) {
    status.className = "form-status error";
    status.textContent = "تحقق من اتصال الإنترنت ثم أعد المحاولة.";
    return;
  }

  const details = {
    product: CONFIG.PRODUCT_NAME,
    weight: CONFIG.PRODUCT_WEIGHT,
    name,
    phone,
    // This checkout intentionally collects only name and phone. The address is
    // confirmed by the team on the follow-up call before shipping.
    address: "يتم تأكيد العنوان هاتفيًا",
    offerCode: offer.code,
    offer: offer.label,
    price: offer.price,
    quantity: offer.code,
    country: CONFIG.COUNTRY,
    sku: CONFIG.SKU,
    currency: CONFIG.CURRENCY,
    paymentMethod: "COD",
    pageUrl: window.location.href,
    source: "GOOGEER Shilajit Landing Page",
    snapClickId: new URLSearchParams(window.location.search).get("ScCid") || "",
    utm: Object.fromEntries(new URLSearchParams(window.location.search))
  };
  const fingerprint = JSON.stringify({ phone, name: name.toLowerCase(), offerCode: offer.code });
  if (!pendingOrder || pendingOrder.fingerprint !== fingerprint) {
    pendingOrder = {
      fingerprint,
      transactionId: "SHILAJIT-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9).toUpperCase()
    };
  }
  const payload = {
    ...details,
    transactionId: pendingOrder.transactionId,
    clientOrderId: pendingOrder.transactionId,
    client_dedup_id: pendingOrder.transactionId,
    submittedAt: new Date().toISOString()
  };

  orderSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "جارٍ إرسال الطلب…";
  form.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(CONFIG.ORDER_ENDPOINT, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("request_failed");
    const result = await response.json();
    if (!result || result.ok !== true) throw new Error("not_confirmed");

    orderSubmitted = true;
    status.className = "form-status success";
    status.textContent = "تم استلام طلبك بنجاح. سنتواصل معك لتأكيد البيانات والعنوان قبل الشحن.";
    trackSnap("PURCHASE", {
      price: offer.price,
      currency: CONFIG.CURRENCY,
      transaction_id: payload.transactionId,
      client_dedup_id: payload.transactionId,
      item_ids: [CONFIG.SKU],
      item_category: "dietary_supplement",
      number_items: offer.code
    });
    submitButton.textContent = "تم استلام طلبك ✓";
    form.querySelectorAll('input, button[type="submit"]').forEach(el => { el.disabled = true; });
  } catch (_) {
    status.className = "form-status error";
    status.textContent = "تعذر تأكيد استلام الطلب. لم نتمكن من تأكيد تسجيله؛ حاول مرة أخرى بعد قليل.";
    submitButton.disabled = false;
    submitButton.textContent = "إعادة المحاولة — تأكيد الطلب";
  } finally {
    orderSubmitting = false;
    form.removeAttribute("aria-busy");
  }
});

/* Reliable CTA-to-checkout navigation, adapted from XCORE FIT.
   Re-check the anchor after layout settles so the first tap lands at the
   top of the complete order area, even in Snapchat's in-app browser. */
function scrollToCheckoutStart() {
  const target = document.getElementById("checkout");
  if (!target) return;
  const top = Math.max(0, window.pageYOffset + target.getBoundingClientRect().top - 8);
  window.scrollTo({ top, left: 0, behavior: "auto" });
}
document.addEventListener("click", event => {
  const link = event.target.closest('a[href="#checkout"]');
  if (!link) return;
  const target = document.getElementById("checkout");
  if (!target) return;
  event.preventDefault();
  if (window.location.hash !== "#checkout") {
    window.history.replaceState(null, "", "#checkout");
  }
  scrollToCheckoutStart();
  requestAnimationFrame(() => requestAnimationFrame(scrollToCheckoutStart));
  setTimeout(scrollToCheckoutStart, 180);
  setTimeout(scrollToCheckoutStart, 480);
}, { capture: true });

/* Keep the fixed mobile CTA from covering the order form, as on XCORE FIT. */
const checkoutSection = document.getElementById("checkout");
const mobileCta = document.querySelector(".mobile-cta");
if (mobileCta && checkoutSection) {
  const updateMobileCtaVisibility = () => {
    const rect = checkoutSection.getBoundingClientRect();
    const viewport = window.visualViewport?.height || window.innerHeight;
    const checkoutIsActive = rect.top <= viewport * 0.92 && rect.bottom >= 80;
    mobileCta.classList.toggle("is-hidden", checkoutIsActive);
  };
  window.addEventListener("scroll", updateMobileCtaVisibility, { passive: true });
  window.addEventListener("resize", updateMobileCtaVisibility);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateMobileCtaVisibility);
    window.visualViewport.addEventListener("scroll", updateMobileCtaVisibility, { passive: true });
  }
  updateMobileCtaVisibility();
}

