/* IVO Advocacia · comportamento do site
   O motor scrollcraft cuida dos atos (pin, pan, cue, reveal, parallax, in).
   Aqui fica o que é só deste site: topo, menu, eixo, portal do monograma,
   prévia de imagem nos artigos e sumário de leitura. */
(function () {
  'use strict';
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var suave = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  // No celular, atos mais curtos (menos tempo preso em cada cena).
  var movel = matchMedia('(max-width: 860px)').matches;
  if (movel) document.querySelectorAll('[data-span-movel]').forEach(function (el) { el.setAttribute('data-sc-span', el.getAttribute('data-span-movel')); });
  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);

  // ------------------------------------------------------------------ topo --
  var topo = document.querySelector('[data-topo]');
  var ultimoY = 0, menuAberto = false;
  function topoScroll() {
    var y = window.scrollY;
    topo.classList.toggle('is-solido', y > 40);
    if (!menuAberto) topo.classList.toggle('is-escondido', y > 640 && y > ultimoY + 4);
    if (y < ultimoY - 4 || y < 640) topo.classList.remove('is-escondido');
    ultimoY = y;
  }

  // ------------------------------------------------------------------ menu --
  var botaoMenu = document.querySelector('.topo__menu');
  var menu = document.getElementById('menu-movel');
  function abrirMenu(abrir) {
    menuAberto = abrir;
    botaoMenu.setAttribute('aria-expanded', String(abrir));
    botaoMenu.querySelector('.topo__menu-rot').textContent = abrir ? 'Fechar' : 'Menu';
    document.body.classList.toggle('menu-aberto', abrir);
    if (abrir) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-aberto'); });
      var primeiro = menu.querySelector('a'); if (primeiro) setTimeout(function () { primeiro.focus(); }, 60);
    } else {
      menu.classList.remove('is-aberto');
      setTimeout(function () { if (!menuAberto) menu.hidden = true; }, reduz ? 0 : 420);
    }
  }
  if (botaoMenu) {
    botaoMenu.addEventListener('click', function () { abrirMenu(!menuAberto); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuAberto) { abrirMenu(false); botaoMenu.focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) abrirMenu(false); });
  }

  // ------------------------------------------------- progresso de um ato --
  function progresso(el) {
    var r = el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : clamp(1 - r.bottom / (r.height + window.innerHeight), 0, 1);
  }

  // ------------------------------------------- princípios: marcas de leitura --
  var principios = document.querySelector('[data-principios]');
  var marcas = principios ? principios.querySelectorAll('.principios__marcas span') : [];
  function principiosTick() {
    if (!principios) return;
    var p = progresso(principios);
    for (var i = 0; i < marcas.length; i++) {
      var ini = i / marcas.length, fim = (i + 1) / marcas.length;
      marcas[i].style.setProperty('--f', clamp((p - ini) / (fim - ini), 0, 1).toFixed(3));
    }
  }

  // ------------------------------------------- portal do monograma (pico) --
  var portal = document.querySelector('[data-portal]');
  var P = null;
  if (portal) {
    var svgEl = portal.querySelector('.portal__svg');
    P = {
      el: portal, svg: svgEl,
      grupo: svgEl.querySelector('#portal-grupo'),
      porta: svgEl.querySelector('#portal-porta'),
      imagem: svgEl.querySelector('#portal-imagem'),
      movel: movel,
      tracos: svgEl.querySelectorAll('.portal__traco'),
      tinta: svgEl.querySelector('.portal__tinta-g'),
      fora: portal.querySelector('.portal__abertura-texto'),
      dentro: portal.querySelector('.portal__dentro'),
      dentroFundo: portal.querySelector('.portal__dentro-fundo'),
      c: { x: 1030.56, y: 371.32 },   // centro do monograma
      alvo: { x: 1046.6, y: 381 },     // janela entre o V e o O, por onde se atravessa
      w: 0, h: 0,
    };
    var medir = function () {
      P.w = window.innerWidth; P.h = window.innerHeight;
      P.svg.setAttribute('viewBox', '0 0 ' + P.w + ' ' + P.h);
      P.imagem.setAttribute('width', P.w); P.imagem.setAttribute('height', P.h);
      P.s0 = Math.min(P.h * 0.62, P.w * 0.7) / 76.75;
      P.s1 = Math.hypot(P.w, P.h) / 2 / 5.2;
    };
    // No celular, a foto do escritório dentro do monograma vai em tamanho menor.
    if (movel) P.imagem.setAttribute('href', P.imagem.getAttribute('href').replace('escritorio-g.jpg', 'escritorio.jpg'));
    P.medir = medir;
    medir();
    window.addEventListener('resize', medir);
  }
  function portalTick() {
    if (!P) return;
    if (!P.w || !P.h || !isFinite(P.s0) || P.s0 <= 0) { P.medir(); if (!isFinite(P.s0) || P.s0 <= 0) return; }
    var p = reduz ? 0.08 : progresso(P.el);
    var desenho = suave(p / 0.2);
    var e = reduz ? 0 : suave((p - 0.22) / 0.54);
    var e2 = e * e * (3 - 2 * e);
    var s = P.s0 * Math.pow(P.s1 / P.s0, e2);
    var Cx = P.w / 2, Cy = P.h * 0.47;
    var px = lerp(Cx + (P.alvo.x - P.c.x) * P.s0, Cx, e2);
    var py = lerp(Cy + (P.alvo.y - P.c.y) * P.s0, Cy, e2);
    var t = 'translate(' + px.toFixed(2) + ' ' + py.toFixed(2) + ') scale(' + s.toFixed(4) + ') translate(' + (-P.alvo.x) + ' ' + (-P.alvo.y) + ')';
    P.grupo.setAttribute('transform', t);
    P.porta.setAttribute('transform', t);
    for (var i = 0; i < P.tracos.length; i++) P.tracos[i].style.strokeDashoffset = String(1 - (reduz ? 1 : desenho));
    P.tinta.style.opacity = reduz ? 1 : clamp((p - 0.1) / 0.12, 0, 1).toFixed(3);
    var esc = P.movel ? 1 : 1.12 - e2 * 0.12;
    if (!P.movel || !P.imagemFixa) { P.imagemFixa = P.movel; P.imagem.setAttribute('transform', 'translate(' + (P.w / 2) + ' ' + (P.h / 2) + ') scale(' + esc.toFixed(4) + ') translate(' + (-P.w / 2) + ' ' + (-P.h / 2) + ')'); }
    var dentro = reduz ? 1 : clamp((p - 0.76) / 0.12, 0, 1);
    if (P.fora) P.fora.style.opacity = reduz ? 0 : (1 - clamp((p - 0.18) / 0.12, 0, 1)).toFixed(3);
    P.dentro.style.opacity = dentro.toFixed(3);
    P.dentro.style.transform = 'translateY(' + ((1 - dentro) * 24).toFixed(1) + 'px)';
    P.dentro.style.visibility = dentro > 0.01 ? 'visible' : 'hidden';
    P.dentroFundo.style.setProperty('--dentro', dentro.toFixed(3));
  }

  // ------------------------------------------------------------------ eixo --
  var eixoLinks = document.querySelectorAll('.eixo a');
  if (eixoLinks.length && 'IntersectionObserver' in window) {
    var mapa = {};
    eixoLinks.forEach(function (a) { mapa[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          eixoLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
          var a = mapa[en.target.id]; if (a) a.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(mapa).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ------------------------------------------- prévia de imagem nos artigos --
  var lista = document.querySelectorAll('[data-previa]');
  if (lista.length && fino && !reduz) {
    var previa = document.createElement('div');
    previa.className = 'previa'; previa.setAttribute('aria-hidden', 'true');
    var img = document.createElement('img'); img.alt = ''; previa.appendChild(img);
    document.body.appendChild(previa);
    var mx = 0, my = 0, ax = 0, ay = 0, ativo = false;
    lista.forEach(function (a) {
      a.addEventListener('mouseenter', function () { img.src = a.getAttribute('data-previa'); previa.classList.add('is-visivel'); ativo = true; });
      a.addEventListener('mouseleave', function () { previa.classList.remove('is-visivel'); ativo = false; });
    });
    window.addEventListener('mousemove', function (e) { mx = e.clientX + 28; my = e.clientY - 110; }, { passive: true });
    (function seguir() {
      ax = lerp(ax, mx, 0.18); ay = lerp(ay, my, 0.18);
      if (ativo) { previa.style.setProperty('--x', ax.toFixed(1) + 'px'); previa.style.setProperty('--y', ay.toFixed(1) + 'px'); }
      requestAnimationFrame(seguir);
    })();
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

  // ------------------------------------------------------------- um só laço --
  var pedido = false;
  function quadro() { pedido = false; topoScroll(); principiosTick(); portalTick(); }
  function agendar() { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } }
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  quadro();
})();
