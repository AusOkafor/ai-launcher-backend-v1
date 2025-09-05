export default async function handler(req, res) {
    // CORS for embedding
    const origin = req.headers.origin || '*'
    const allowed = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ]
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return
    }

    const backend = process.env.WIDGET_BACKEND_URL || 'http://localhost:3000'
    const script = `
(function(){
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ORIGIN = (function(){ try { return new URL(SRC).origin; } catch(e){ return ''; } })();
  var API = (ORIGIN ? ORIGIN : '${backend}') + '/api/cart-recovery';
  var SHOP = (window.Shopify && window.Shopify.shop) || (document.currentScript && document.currentScript.getAttribute('data-shop')) || '';

  function getToken(){
    if (window.Shopify && window.Shopify.cartToken) return Promise.resolve(window.Shopify.cartToken);
    return fetch('/cart.js').then(function(r){return r.json()}).then(function(c){return c && c.token}).catch(function(){return 'token_'+Date.now()});
  }

  function collect(){
    var email = (document.querySelector('input[type="email"]')||{}).value || '';
    var tel = (document.querySelector('input[type="tel"]')||{}).value || '';
    var fn = (document.querySelector('input[name*="first"],#firstName')||{}).value || '';
    var ln = (document.querySelector('input[name*="last"],#lastName')||{}).value || '';
    return { email: email, phone: tel, firstName: fn, lastName: ln };
  }

  function postCheckout(){
    getToken().then(function(token){
      var c = collect();
      if(!c.email && !c.phone) return;
      var payload = { shop: SHOP, cartToken: token, customerEmail: c.email, customerPhone: c.phone, customerData: { firstName: c.firstName, lastName: c.lastName }, checkoutUrl: window.location.href };
      try{ navigator.sendBeacon && navigator.sendBeacon(API+'/track-checkout', new Blob([JSON.stringify(payload)], {type:'application/json'})); }
      catch(e){ fetch(API+'/track-checkout', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); }
    });
  }

  // Initial and periodic capture
  setTimeout(postCheckout, 800);
  document.addEventListener('input', function(e){ if(e && (e.target.type==='email'||e.target.type==='tel')) setTimeout(postCheckout, 400); }, true);
  var iv = setInterval(postCheckout, 3000);
  setTimeout(function(){ clearInterval(iv); }, 5*60*1000);
})();
    `
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    res.status(200).send(script)
}