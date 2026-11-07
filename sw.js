/* Banco de Questões: guarda o site para abrir sem internet (apresentações offline).
   Página: tenta a rede primeiro (para sempre pegar a versão nova) e, sem conexão, usa a cópia.
   Fontes e bibliotecas do cdnjs: usa a cópia guardada e só baixa se não tiver.
   A nuvem (Firebase), o Gemini e o resto da internet passam direto, sem cópia. */
var CACHE="bq-v1";
self.addEventListener("install",function(ev){
  ev.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(["./"]).catch(function(){});}));
  self.skipWaiting();
});
self.addEventListener("activate",function(ev){
  ev.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
function guardar(req,res){
  if(res&&(res.ok||res.type==="opaque")){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});}
  return res;
}
self.addEventListener("fetch",function(ev){
  var req=ev.request;
  if(req.method!=="GET")return;
  var u=new URL(req.url);
  var mesmo=u.origin===self.location.origin;
  var estatico=/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname);
  if(req.mode==="navigate"||(mesmo&&/\/(index\.html)?$/.test(u.pathname))){
    ev.respondWith(fetch(req).then(function(r){return guardar(mesmo?new Request(u.origin+u.pathname):req,r);}).catch(function(){
      return caches.match(new Request(u.origin+u.pathname)).then(function(r){return r||caches.match("./");});
    }));
    return;
  }
  if(mesmo){
    ev.respondWith(fetch(req).then(function(r){return guardar(req,r);}).catch(function(){return caches.match(req);}));
    return;
  }
  if(estatico){
    ev.respondWith(caches.match(req).then(function(r){return r||fetch(req).then(function(r2){return guardar(req,r2);});}));
  }
});
