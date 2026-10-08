const CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxxBGHE4mZ5iDdplvvaFxVhrHoOMETyRoafgk8iG-DGx9vhY27JgFhc3VHFBO22hu4x0w/exec',
  snapPixelId: '233915bf-25f6-4119-9362-701fe3212185',
  product: 'SHILAJIT+',
  sku: 'SHILAJIT-PLUS',
  offers: [
    { label: 'العبوة الفردية — 1 عبوة / 100 غرام', price: 198 },
    { label: 'الباقة الثنائية — عبوتان / 200 غرام', price: 288 },
    { label: 'باقة التوفير — 3 عبوات / 300 غرام', price: 324 }
  ]
};
function trackEvent(name,data){try{if(typeof window.snaptr!=='function')return false;window.snaptr('track',name,data);return true;}catch(_){return false;}}
(function initSnapPixel(){if(!CONFIG.snapPixelId)return;try{(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var r=t.createElement('script');r.async=true;r.src=n;var u=t.getElementsByTagName('script')[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');window.snaptr('init',CONFIG.snapPixelId);trackEvent('PAGE_VIEW',{item_ids:[CONFIG.sku]});}catch(_){} })();
const orderForm=document.getElementById('order-form');
const orderSection=document.getElementById('order');
let checkoutTracked=false,orderSubmitting=false,orderSubmitted=false,pendingOrder=null;
function selectedOffer(values){const code=Number(values.get('offer'));return Number.isInteger(code)&&code>=1&&code<=CONFIG.offers.length?{code,...CONFIG.offers[code-1]}:null;}
function normalizeSaudiPhone(value){
 let phone=String(value||'').trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\s()\-\u200e\u200f\u061c]/g,'');
 if(phone.startsWith('+966'))phone='0'+phone.slice(4);else if(phone.startsWith('00966'))phone='0'+phone.slice(5);else if(phone.startsWith('966'))phone='0'+phone.slice(3);else if(/^5\d{8}$/.test(phone))phone='0'+phone;
 return /^05\d{8}$/.test(phone)?phone:null;
}
function updateSummary(){if(!orderForm)return;const selected=selectedOffer(new FormData(orderForm)),name=document.getElementById('summary-package'),price=document.getElementById('summary-price');if(selected){if(name)name.textContent=selected.label;if(price)price.textContent=selected.price+' ر.س';}}
function trackStartCheckout(){if(checkoutTracked||orderSubmitted||!orderForm)return;const selected=selectedOffer(new FormData(orderForm));if(!selected)return;checkoutTracked=trackEvent('START_CHECKOUT',{price:selected.price,currency:'SAR',item_ids:[CONFIG.sku]});}
if(orderForm){
 orderForm.addEventListener('change',()=>{updateSummary();trackStartCheckout();});
 orderForm.addEventListener('focusin',trackStartCheckout);
 orderForm.addEventListener('input',event=>{if(typeof event.target.setCustomValidity==='function'){event.target.setCustomValidity('');event.target.removeAttribute('aria-invalid');}const status=document.getElementById('form-message');if(status)status.textContent='';});
 updateSummary();
 orderForm.addEventListener('submit',async event=>{
  event.preventDefault();if(orderSubmitting||orderSubmitted)return;
  const status=document.getElementById('form-message'),button=orderForm.querySelector('.submit'),values=new FormData(orderForm),selected=selectedOffer(values);
  const name=String(values.get('name')||'').trim(),address=String(values.get('address')||'').trim(),phone=normalizeSaudiPhone(values.get('phone'));
  if(status)status.textContent='';
  const checks=[['name',name.length<2?'يرجى إدخال الاسم الكامل.':''],['address',address.length<5?'يرجى إدخال المدينة والحي والعنوان بالتفصيل.':''],['phone',!phone?'أدخل رقم جوال سعودي صحيحًا، مثل 05xxxxxxxx.':'']];
  for(const [fieldName,message] of checks){const field=orderForm.elements.namedItem(fieldName);if(!field)continue;field.setCustomValidity(message);if(message)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');}
  if(!orderForm.reportValidity())return;
  if(!selected){if(status)status.textContent='اختر باقة واحدة قبل إرسال الطلب.';return;}
  if(navigator.onLine===false){if(status)status.textContent='لا يوجد اتصال بالإنترنت. تحقق من الاتصال ثم أعد المحاولة.';return;}
  const details={product:CONFIG.product,name,phone,address,offerCode:selected.code,offer:selected.label,price:selected.price,country:'SA',sku:CONFIG.sku,currency:'SAR',pageUrl:window.location.href,source:'SHILAJIT+ Landing Page'};
  const fingerprint=JSON.stringify(details);
  if(!pendingOrder||pendingOrder.fingerprint!==fingerprint)pendingOrder={fingerprint,transactionId:'SHILAJIT-'+Date.now()+'-'+Math.random().toString(36).slice(2,9).toUpperCase()};
  const payload={...details,transactionId:pendingOrder.transactionId,clientOrderId:pendingOrder.transactionId,utm:Object.fromEntries(new URLSearchParams(window.location.search))};
  trackStartCheckout();orderSubmitting=true;button.disabled=true;button.textContent='جارٍ إرسال طلبك…';orderForm.setAttribute('aria-busy','true');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
  try{
   const response=await fetch(CONFIG.scriptUrl,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});
   if(!response.ok)throw new Error('http-error');
   const result=await response.json();if(!result||result.ok!==true)throw new Error('order-rejected');
   orderSubmitted=true;orderForm.innerHTML='<div class="success" role="status" tabindex="-1"><span aria-hidden="true">✓</span><h2>تم استلام طلبك بنجاح</h2><p>شكرًا لك. سنتواصل معك لتأكيد بيانات الطلب والتوصيل.<br>الدفع عند الاستلام.</p></div>';
   orderForm.querySelector('.success')?.focus({preventScroll:true});
   trackEvent('PURCHASE',{price:selected.price,currency:'SAR',transaction_id:payload.transactionId,client_dedup_id:payload.transactionId,item_ids:[CONFIG.sku]});
  }catch(error){
   button.disabled=false;button.textContent='تأكيد الطلب — الدفع عند الاستلام';
   if(status)status.textContent=error.name==='AbortError'?'تأخر رد الخدمة. لا تكرر الطلب مباشرة إذا كنت ضغطت إرسالًا سابقًا؛ تحقق من استلامه أولًا.':error.message==='order-rejected'?'لم يتم تسجيل الطلب. تحقق من البيانات ثم حاول مجددًا.':'تعذر تأكيد تسجيل الطلب بسبب الاتصال. إذا سبق الإرسال، تحقق من استلام الطلب قبل إعادة المحاولة.';
  }finally{clearTimeout(timeout);orderSubmitting=false;orderForm.removeAttribute('aria-busy');}
 });
}
const sticky=document.querySelector('.sticky-order');
if(sticky&&orderSection){
 const updateSticky=()=>{const rect=orderSection.getBoundingClientRect(),vh=window.visualViewport?window.visualViewport.height:window.innerHeight;sticky.classList.toggle('is-hidden',rect.top<vh*.9&&rect.bottom>vh*.1);};
 sticky.addEventListener('click',event=>{event.preventDefault();orderSection.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
 window.addEventListener('scroll',updateSticky,{passive:true});window.addEventListener('resize',updateSticky,{passive:true});window.addEventListener('pageshow',updateSticky);window.addEventListener('hashchange',updateSticky);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',updateSticky,{passive:true});updateSticky();
}
document.querySelectorAll('[data-package]').forEach(button=>button.addEventListener('click',()=>{const radio=orderForm?.querySelector('input[name="offer"][value="'+button.dataset.package+'"]');if(radio){radio.checked=true;updateSummary();trackStartCheckout();}}));
document.querySelectorAll('.faq details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)document.querySelectorAll('.faq details').forEach(other=>{if(other!==item)other.open=false;});}));
