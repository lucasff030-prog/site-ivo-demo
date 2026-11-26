/* IVO Advocacia · comportamento do site
   Nada se move sozinho. Este arquivo cuida do topo, do menu do celular, do
   sumário dos artigos e da origem das campanhas (para a mensagem do WhatsApp
   dizer de qual anúncio a pessoa veio). */
(function () {
  'use strict';

  // ------------------------------------------------- origem da campanha --
  // Anúncios devem levar ?utm_source=...&utm_campaign=... (ver CAMPANHAS.md).
  // A origem vale para a visita inteira e entra no fim da mensagem do WhatsApp.
  var CHAVE = 'ivo-origem';
  var q = new URLSearchParams(location.search);
  var camp = q.get('utm_campaign') || q.get('c');
  var fonte = q.get('utm_source') || (q.get('gclid') ? 'google' : q.get('fbclid') ? 'meta' : '');
  try {
    if (camp || fonte) sessionStorage.setItem(CHAVE, JSON.stringify({ c: camp || '', f: fonte || '', p: location.pathname }));
  } catch (e) {}
  function lerOrigem() { try { return JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; } }
  // Nomes das campanhas (preenchido pelo gerador a partir de fonte/campanhas.mjs).
  var CAMPANHAS = {"saude-reajuste":"Plano de saúde: reajuste","saude-prazo":"Plano de saúde: demora para marcar ou autorizar","saude-carencia":"Plano de saúde: negativa por carência","descontos":"Dívidas não contratadas (consignado, RMC, associação)","inss-margem":"Benefício do INSS: descontos acima do limite","imovel-atraso":"Imóvel na planta: atraso na entrega","imovel-distrato":"Imóvel na planta: rescisão (distrato)","energia-conta":"Energia: conta alta ou recuperação de consumo","energia-corte":"Energia: aviso de corte","saude-negativa":"Plano de saúde: negativa de cirurgia, exame ou tratamento","bancario":"Direito Bancário (fraudes, Pix, superendividamento)","consumidor":"Direito do Consumidor (negativação, cobranças)","imobiliario":"Direito Imobiliário (contratos, locação)","relato":"Relato livre, por etapas","institucional":"Marca / institucional"};
  window.ivoOrigem = function () {
    var o = lerOrigem();
    if (!o) return '';
    var nome = CAMPANHAS[o.c] ? CAMPANHAS[o.c] + ' [' + o.c + ']' : o.c;
    return 'Ref.: ' + [nome, o.f].filter(Boolean).join(' / ');
  };
  var origem = lerOrigem();
  if (origem) document.body.classList.add('veio-de-anuncio');

  // ------------------------------------------------------------ medição --
  // Só funciona se window.IVO_MEDICAO existir (preenchido em fonte/config.mjs)
  // e depois que a pessoa aceitar os cookies.
  window.dataLayer = window.dataLayer || [];
  window.ivoEvento = function (nome, dados) {
    var d = dados || {}; if (origem) { d.campanha = origem.c; d.fonte = origem.f; }
    window.dataLayer.push(Object.assign({ event: nome }, d));
    if (window.gtag) window.gtag('event', nome, d);
    if (window.fbq) window.fbq('trackCustom', nome, d);
    if (nome === 'whatsapp_clique' && window.fbq) window.fbq('track', 'Contact');
  };
  var M = window.IVO_MEDICAO;
  function carregarMedicao() {
    if (M.googleTagId) {
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + M.googleTagId; document.head.appendChild(s);
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', M.googleTagId);
    }
    if (M.metaPixelId) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', M.metaPixelId); window.fbq('track', 'PageView');
    }
  }
  if (M && (M.googleTagId || M.metaPixelId)) {
    var aceite = null; try { aceite = localStorage.getItem('ivo-cookies'); } catch (e) {}
    if (aceite === 'sim') carregarMedicao();
    else if (aceite !== 'nao') {
      var barra = document.createElement('div');
      barra.className = 'cookies'; barra.setAttribute('role', 'region'); barra.setAttribute('aria-label', 'Cookies');
      barra.innerHTML = '<p>Usamos cookies de medição para saber quais anúncios e páginas são úteis. <a href="/privacidade/">Privacidade</a></p><div class="acoes"><button class="botao" type="button" data-c="sim">Aceitar</button><button class="botao botao--linha" type="button" data-c="nao">Recusar</button></div>';
      document.body.appendChild(barra);
      barra.addEventListener('click', function (e) {
        var b = e.target.closest('[data-c]'); if (!b) return;
        try { localStorage.setItem('ivo-cookies', b.getAttribute('data-c')); } catch (x) {}
        if (b.getAttribute('data-c') === 'sim') carregarMedicao();
        barra.remove();
      });
    }
  }

  // Links fixos de WhatsApp: acrescenta a origem e registra o clique.
  document.querySelectorAll('a[data-wa]').forEach(function (a) {
    var ref = window.ivoOrigem();
    if (ref) {
      try { var u = new URL(a.href); u.searchParams.set('text', (u.searchParams.get('text') || '') + '\n\n' + ref); a.href = u.toString(); } catch (e) {}
    }
    a.addEventListener('click', function () { window.ivoEvento('whatsapp_clique', { origem: a.getAttribute('data-wa') }); });
  });

  // ------------------------------------------------------------------ topo --
  var topo = document.querySelector('[data-topo]');
  function topoScroll() { topo.classList.toggle('is-solido', window.scrollY > 24); }

  // ------------------------------------------------------------------ menu --
  var botaoMenu = document.querySelector('.topo__menu');
  var menu = document.getElementById('menu-movel');
  var menuAberto = false;
  function abrirMenu(abrir) {
    menuAberto = abrir;
    botaoMenu.setAttribute('aria-expanded', String(abrir));
    botaoMenu.querySelector('.topo__menu-rot').textContent = abrir ? 'Fechar' : 'Menu';
    document.body.classList.toggle('menu-aberto', abrir);
    menu.hidden = !abrir;
    if (abrir) { var primeiro = menu.querySelector('a'); if (primeiro) primeiro.focus(); }
  }
  if (botaoMenu) {
    botaoMenu.addEventListener('click', function () { abrirMenu(!menuAberto); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuAberto) { abrirMenu(false); botaoMenu.focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) abrirMenu(false); });
  }

  // ------------------------------------------------------ sumário do artigo --
  var sumario = document.querySelectorAll('.sumario a');
  if (sumario.length && 'IntersectionObserver' in window) {
    var porId = {};
    sumario.forEach(function (a) { porId[a.getAttribute('href').slice(1)] = a; });
    var ioS = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (x.isIntersecting) { sumario.forEach(function (a) { a.removeAttribute('aria-current'); }); var a = porId[x.target.id]; if (a) a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(porId).forEach(function (id) { var h = document.getElementById(id); if (h) ioS.observe(h); });
  }

  window.addEventListener('scroll', topoScroll, { passive: true });
  topoScroll();
})();
