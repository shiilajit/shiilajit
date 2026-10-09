/* Shilajit checkout: simplified XCORE-style flow. Set a dedicated order endpoint before accepting live orders. */
const CONFIG = {
  PRODUCT_NAME: "Googeer Himalayan Shilajit",
  PRODUCT_WEIGHT: "100 غرام",
  OFFERS: {
    1: { label: "عبوة واحدة · 100 غرام", price: 198 },
    2: { label: "عبوتان · 200 غرام", price: 288 },
    3: { label: "3 عبوات · 300 غرام", price: 324 }
  },
  ORDER_ENDPOINT: "",
  SNAP_PIXEL_ID: "233915bf-25f6-4119-9362-701fe3212185"
};

(function initPixel() {
  if (!CONFIG.SNAP_PIXEL_ID) return;
  try {
    (function(e,t,n){if(e.snaptr)return;const a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];const r=t.createElement("script");r.async=true;r.src=n;const s=t.getElementsByTagName("script")[0];s.parentNode.insertBefore(r,s)})(window,document,"https://sc-static.net/scevent.min.js");
    window.snaptr("init", CONFIG.SNAP_PIXEL_ID);
    window.snaptr("track", "PAGE_VIEW", { item_category: "dietary_supplement", item_ids: ["GOOGEER-SHILAJIT-100G"] });
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

function currentOffer() {
  const code = Number(new FormData(form).get("offer") || 1);
  return { code, ...CONFIG.OFFERS[code] };
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
  if (checkoutTracked || typeof window.snaptr !== "function") return;
  const offer = currentOffer();
  checkoutTracked = true;
  try { window.snaptr("track", "START_CHECKOUT", { price: offer.price, currency: "SAR", item_ids: ["GOOGEER-SHILAJIT-100G"], item_category: "dietary_supplement", number_items: offer.code }); } catch (_) {}
}
form?.addEventListener("change", () => { updateSummary(); trackCheckout(); });
form?.addEventListener("focusin", trackCheckout, { once: true });
phoneInput?.addEventListener("input", () => {
  phoneInput.removeAttribute("aria-invalid");
  if (phoneError) phoneError.textContent = "";
  if (status) { status.textContent = ""; status.className = "form-status"; }
});
updateSummary();

const checkoutReady = Boolean(CONFIG.ORDER_ENDPOINT);
if (!checkoutReady && submitButton && status) {
  submitButton.disabled = true;
  submitButton.textContent = "الطلب غير متاح مؤقتًا";
  status.className = "form-status error";
  status.textContent = "نموذج الطلب جاهز، لكن استقبال الطلبات يحتاج ربط نظام الطلبات الخاص بهذا المنتج.";
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form || !status || !submitButton) return;
  status.textContent = "";
  if (phoneError) phoneError.textContent = "";
  const name = String(form.elements.name.value || "").trim();
  const phone = normalizeSaudiPhone(form.elements.phone.value);
  if (name.length < 2) {
    status.textContent = "يرجى كتابة الاسم.";
    form.elements.name.focus();
    return;
  }
  if (!phone) {
    if (phoneError) phoneError.textContent = "أدخل رقم جوال سعودي صحيحًا من 10 أرقام، مثل 05xxxxxxxx.";
    form.elements.phone.setAttribute("aria-invalid", "true");
    form.elements.phone.focus();
    return;
  }
  const offer = currentOffer();
  if (!CONFIG.ORDER_ENDPOINT) {
    status.className = "form-status error";
    status.textContent = "لم يُسجَّل الطلب؛ نظام استقبال طلبات هذا المنتج غير مربوط بعد.";
    return;
  }
  const payload = {
    product: CONFIG.PRODUCT_NAME,
    weight: CONFIG.PRODUCT_WEIGHT,
    name, phone,
    offer_code: offer.code,
    offer: offer.label,
    quantity: offer.code,
    total_sar: offer.price,
    currency: "SAR",
    payment_method: "COD",
    page_url: window.location.href,
    submitted_at: new Date().toISOString(),
    utm: Object.fromEntries(new URLSearchParams(window.location.search))
  };
  submitButton.disabled = true;
  submitButton.textContent = "جارٍ إرسال الطلب…";
  try {
    const response = await fetch(CONFIG.ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("request_failed");
    const result = await response.json();
    if (result.success !== true) throw new Error("not_confirmed");
    status.className = "form-status success";
    status.textContent = "تم استلام طلبك بنجاح. سنتواصل معك لتأكيد التوصيل.";
    try {
      if (typeof window.snaptr === "function") window.snaptr("track", "PURCHASE", { price: offer.price, currency: "SAR", transaction_id: result.transactionId || undefined, item_ids: ["GOOGEER-SHILAJIT-100G"], item_category: "dietary_supplement", number_items: offer.code });
    } catch (_) {}
    form.reset();
    updateSummary();
  } catch (_) {
    status.className = "form-status error";
    status.textContent = "تعذر تأكيد استلام الطلب. لم نؤكد تسجيله؛ حاول مرة أخرى لاحقًا.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "تأكيد الطلب — الدفع عند الاستلام ←";
  }
});

document.querySelectorAll('a[href="#checkout"]').forEach(link => link.addEventListener("click", event => {
  const target = document.getElementById("checkout");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}));
