/* إعدادات قابلة للتعديل قبل إطلاق الحملة */
const CONFIG = {
  // ضع السعر النهائي بالدرهم المغربي. اتركه null لإظهار "يؤكد عند التواصل".
  PRODUCT_PRICE_MAD: null,
  // أدخل رقم واتساب بصيغة دولية مع رمز البلد، أرقام فقط دون + أو مسافات. مثال شكلي: 2126XXXXXXXX
  WHATSAPP_NUMBER: "",
  PRODUCT_NAME: "Googeer Himalayan Shilajit",
  PRODUCT_WEIGHT: "100 غرام",
  // Pixel موجود سابقًا في المشروع. لا يتم تسجيل Purchase عند فتح واتساب لأنه ليس عملية بيع مؤكدة.
  SNAP_PIXEL_ID: "233915bf-25f6-4119-9362-701fe3212185"
};

// Initialiser le Snap Pixel existant pour conserver la mesure des visites et contacts.
(function initSnapPixel() {
  if (!CONFIG.SNAP_PIXEL_ID) return;
  try {
    (function (e, t, n) {
      if (e.snaptr) return;
      const a = e.snaptr = function () {
        a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
      };
      a.queue = [];
      const r = t.createElement("script");
      r.async = true;
      r.src = n;
      const s = t.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(r, s);
    })(window, document, "https://sc-static.net/scevent.min.js");
    window.snaptr("init", CONFIG.SNAP_PIXEL_ID);
    window.snaptr("track", "PAGE_VIEW", { item_category: "dietary_supplement" });
  } catch (_) {}
})();

const priceElement = document.getElementById("display-price");
if (priceElement) {
  if (Number.isFinite(CONFIG.PRODUCT_PRICE_MAD) && CONFIG.PRODUCT_PRICE_MAD > 0) {
    priceElement.textContent = new Intl.NumberFormat("fr-MA", {
      style: "currency", currency: "MAD", maximumFractionDigits: 0
    }).format(CONFIG.PRODUCT_PRICE_MAD);
  } else {
    priceElement.textContent = "يُؤكَّد عند التواصل";
  }
}

function trackContact() {
  try {
    if (typeof window.snaptr === "function") {
      window.snaptr("track", "CONTACT", { item_category: "dietary_supplement" });
    }
  } catch (_) {}
}

function buildWhatsAppMessage() {
  const price = Number.isFinite(CONFIG.PRODUCT_PRICE_MAD) && CONFIG.PRODUCT_PRICE_MAD > 0
    ? new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(CONFIG.PRODUCT_PRICE_MAD)
    : "أرجو تأكيد السعر الحالي";
  return [
    "السلام عليكم، أريد الاستفسار عن المنتج:",
    CONFIG.PRODUCT_NAME,
    "الوزن: " + CONFIG.PRODUCT_WEIGHT,
    "السعر: " + price,
    "من فضلكم أكدوا التوفر وتكلفة التوصيل داخل المغرب."
  ].join("\n");
}

document.querySelectorAll(".js-order").forEach((link) => {
  link.addEventListener("click", (event) => {
    const phone = String(CONFIG.WHATSAPP_NUMBER || "").replace(/\D/g, "");
    const feedback = document.getElementById("order-feedback");

    if (!phone) {
      if (feedback) {
        feedback.textContent = "لتفعيل الطلب عبر واتساب، أضف رقمك بصيغة دولية داخل CONFIG في ملف script.js ثم احفظ التعديل.";
      }
      // نترك الرابط ينتقل إلى قسم الطلب حتى تبقى الصفحة قابلة للاستخدام قبل ضبط الرقم.
      return;
    }

    event.preventDefault();
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(buildWhatsAppMessage());
    trackContact();
    window.open(url, "_blank");
    if (feedback) feedback.textContent = "تم تجهيز رسالة الطلب. أرسلها عبر واتساب لتأكيد السعر والتوفر.";
  });
});

// إبقاء روابط التنقل سلسة مع دعم إعداد تقليل الحركة في الجهاز.
document.querySelectorAll('a[href^="#"]:not(.js-order)').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  });
});
