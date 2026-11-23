/* IVO Advocacia · ferramentas interativas
   Tudo roda no navegador; nada é enviado sem o visitante tocar em "Enviar pelo WhatsApp".
   window.IVO (injetado pela página): { whatsapp, areas: {slug: nome}, situacoes, documentos } */
(function () {
  'use strict';
  var IVO = window.IVO || {};
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ utilidades --
  function num(s) {
    if (s == null) return NaN;
    s = String(s).trim().replace(/[R$\s%]/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return parseFloat(s);
  }
  var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function pct(x, d) { return x.toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + '%'; }
  function dataLonga(d) { return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  function dataCurta(d) { return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
  function lerData(v) { if (!v) return null; var p = v.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] || 1)); }
  function hojeUTC() { var n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
  function dias(a, b) { return Math.round((b - a) / 86400000); }
  function linha(rot, val) { return '<div class="resultado__linha"><span>' + rot + '</span><b>' + val + '</b></div>'; }
  function selo(tipo, txt) { return '<span class="resultado__selo selo--' + tipo + '">' + txt + '</span>'; }
  function mostrar(res) {
    res.hidden = false;
    if (!reduz) { res.classList.remove('anima-entra'); void res.offsetWidth; res.classList.add('anima-entra'); }
  }
  function wa(msg) { return 'https://wa.me/' + (IVO.whatsapp || '') + '?text=' + encodeURIComponent(msg); }
  function prepararEnvio(form, msg) {
    var a = form.querySelector('[data-enviar]');
    if (a) { a.href = wa(msg); a.target = '_blank'; }
    var c = form.querySelector('[data-copiar]');
    if (c) c.onclick = function () {
      var ok = function () { c.textContent = 'Resumo copiado'; setTimeout(function () { c.textContent = 'Copiar resumo'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(ok, function () {}); else ok();
    };
  }
  function erro(form, campo, ok) {
    var el = form.querySelector('[name="' + campo + '"]');
    if (!el) return;
    var box = el.closest('.campo');
    if (box) box.classList.toggle('campo--erro', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) el.focus();
  }

  // Feriados nacionais (inclui Sexta-feira Santa e Consciência Negra, nacional desde 2024).
  function pascoa(a) {
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4,
      g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30,
      k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451),
      mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
    return new Date(Date.UTC(a, mes - 1, dia));
  }
  var cacheFer = {};
  function feriados(ano) {
    if (cacheFer[ano]) return cacheFer[ano];
    var f = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
    if (ano >= 2024) f.push('11-20');
    var s = {};
    f.forEach(function (x) { s[ano + '-' + x] = 1; });
    var p = pascoa(ano); p.setUTCDate(p.getUTCDate() - 2);
    s[p.toISOString().slice(0, 10)] = 1;
    return (cacheFer[ano] = s);
  }
  function util(d) { var w = d.getUTCDay(); return w !== 0 && w !== 6 && !feriados(d.getUTCFullYear())[d.toISOString().slice(0, 10)]; }
  function somarUteis(d, n) { var x = new Date(d); while (n > 0) { x.setUTCDate(x.getUTCDate() + 1); if (util(x)) n--; } return x; }

  // ------------------------------------------------- baixa da negativação --
  function baixa(form) {
    var input = form.querySelector('[name="data"]');
    var res = form.querySelector('.resultado');
    function calc() {
      var d = lerData(input.value);
      if (!d) { res.hidden = true; return; }
      var lim = somarUteis(d, 5), h = hojeUTC();
      form.querySelector('[data-saida="limite"]').textContent = dataLonga(lim);
      var sit = form.querySelector('[data-saida="situacao"]');
      var passou = h > lim;
      sit.innerHTML = passou
        ? selo('atencao', 'O prazo terminou há ' + dias(lim, h) + ' dia' + (dias(lim, h) === 1 ? '' : 's')) + '<p class="resultado__nota">Se o nome continua no cadastro, consulte o CPF no Serasa, SPC e Boa Vista e salve a consulta com data.</p>'
        : selo('ok', 'Ainda dentro do prazo');
      mostrar(res);
      prepararEnvio(form, 'Olá, equipe IVO. Usei a ferramenta de prazo da baixa no site.\n\nPaguei a dívida em ' + dataCurta(d) + '. O prazo de 5 dias úteis (Súmula 548) terminou em ' + dataCurta(lim) + '.' + (passou ? ' Meu nome continua negativado.' : '') + '\n\nGostaria de conversar sobre o caso.');
    }
    input.addEventListener('change', calc);
    form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  }

  // ------------------------------------------------------ juros × média BCB --
  var bcb = null;
  function carregarBcb() {
    if (bcb) return Promise.resolve(bcb);
    return fetch('/site-ivo-demo/assets/dados/bcb-credito-pessoal.json').then(function (r) { return r.json(); }).then(function (j) { return (bcb = j); });
  }
  function taxaPrice(V, P, n) {
    if (P * n <= V) return 0;
    var lo = 1e-7, hi = 1;
    for (var k = 0; k < 200; k++) {
      var i = (lo + hi) / 2, pm = V * i / (1 - Math.pow(1 + i, -n));
      if (pm > P) hi = i; else lo = i;
    }
    return (lo + hi) / 2;
  }
  function juros(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var V = num(form.valor.value), P = num(form.parcela.value), n = Math.round(num(form.n.value)), mes = form.mes.value;
      var ok = true;
      [['valor', V > 0], ['parcela', P > 0], ['n', n > 0 && n <= 420], ['mes', !!mes]].reverse().forEach(function (c) { erro(form, c[0], c[1]); if (!c[1]) ok = false; });
      if (!ok) return;
      carregarBcb().then(function (serie) {
        var i = taxaPrice(V, P, n), ia = Math.pow(1 + i, 12) - 1;
        var refDig = num(form.ref.value), ref = !isNaN(refDig) && refDig > 0 ? refDig / 100 : (serie[mes] != null ? serie[mes] / 100 : null);
        var fonte = !isNaN(refDig) && refDig > 0 ? 'informada por você' : 'Banco Central, crédito pessoal não consignado, ' + mes.split('-').reverse().join('/');
        form.querySelector('[data-saida="taxa"]').textContent = pct(i * 100) + ' ao mês';
        var html = linha('Equivalente ao ano', pct(ia * 100)) + linha('Total a pagar', moeda.format(P * n)) + linha('Juros totais', moeda.format(P * n - V));
        var s = '', resumoRef = '';
        if (ref) {
          var pRef = V * ref / (1 - Math.pow(1 + ref, -n)), razao = i / ref;
          html += linha('Taxa média de referência (' + fonte + ')', pct(ref * 100) + ' ao mês') +
            linha('Parcela se fosse a taxa média', moeda.format(pRef)) +
            linha('Relação com a média', razao.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' vez' + (razao >= 2 ? 'es' : '') + ' a média');
          s = razao > 1.5 ? selo('atencao', 'Taxa acima de 1,5 vez a média de mercado') : razao > 1 ? selo('neutro', 'Taxa acima da média, em menos de 1,5 vez') : selo('ok', 'Taxa igual ou abaixo da média');
          resumoRef = '\nMédia de referência: ' + pct(ref * 100) + ' a.m. (' + fonte + '). Relação: ' + razao.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + 'x.';
        } else {
          html += linha('Taxa média de referência', 'sem dado para o mês');
        }
        form.querySelector('[data-saida="linhas"]').innerHTML = html;
        form.querySelector('[data-saida="selo"]').innerHTML = s;
        mostrar(form.querySelector('.resultado'));
        prepararEnvio(form, 'Olá, equipe IVO. Usei a ferramenta de juros no site.\n\nEmpréstimo de ' + moeda.format(V) + ' em ' + n + ' parcelas de ' + moeda.format(P) + ', contratado em ' + mes.split('-').reverse().join('/') + '.\nTaxa calculada: ' + pct(i * 100) + ' a.m. (' + pct(ia * 100) + ' a.a.).' + resumoRef + '\n\nGostaria que analisassem o contrato.');
      });
    });
  }

  // -------------------------------------------------- reajuste do plano --
  var tetosAns = [ // ciclos maio a abril
    { de: '2023-05', ate: '2024-04', teto: 9.63 },
    { de: '2024-05', ate: '2025-04', teto: 6.91 },
    { de: '2025-05', ate: '2026-04', teto: 6.06 },
  ];
  function reajuste(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = num(form.antes.value), d = num(form.depois.value), mes = form.mes.value, tipo = form.querySelector('[name="tipo"]:checked').value, faixa = form.faixa.checked;
      var ok = true;
      [['antes', a > 0], ['depois', d > 0], ['mes', !!mes]].reverse().forEach(function (c) { erro(form, c[0], c[1]); if (!c[1]) ok = false; });
      if (!ok) return;
      var p = (d / a - 1) * 100;
      var tetoDig = num(form.teto.value), ciclo = null;
      tetosAns.forEach(function (c) { if (mes >= c.de && mes <= c.ate) ciclo = c; });
      var teto = !isNaN(tetoDig) ? tetoDig : ciclo ? ciclo.teto : null;
      form.querySelector('[data-saida="pct"]').textContent = pct(p);
      var html = linha('Mensalidade antes', moeda.format(a)) + linha('Mensalidade depois', moeda.format(d)) + linha('Diferença por mês', moeda.format(d - a));
      var s = '', nota = '', resumoTeto = '';
      if (tipo === 'individual') {
        if (teto != null) {
          html += linha('Teto da ANS ' + (ciclo && isNaN(tetoDig) ? '(ciclo ' + ciclo.de.slice(0, 4) + '/' + ciclo.ate.slice(0, 4) + ')' : '(informado)'), pct(teto));
          s = faixa ? selo('neutro', 'Reajuste com mudança de faixa etária: o teto anual não se aplica sozinho') : p > teto + 0.005 ? selo('atencao', 'Percentual acima do teto da ANS para o ciclo') : selo('ok', 'Percentual dentro do teto da ANS');
          resumoTeto = ' Teto ANS considerado: ' + pct(teto) + '.';
        } else {
          s = selo('neutro', 'Informe o teto da ANS do ciclo para comparar');
        }
        nota = 'Planos individuais e familiares: o reajuste anual não pode superar o percentual autorizado pela ANS para o ciclo (maio a abril).';
      } else {
        s = selo('neutro', 'Plano coletivo: não há teto da ANS');
        nota = 'Nos planos coletivos, o reajuste é negociado com a pessoa jurídica contratante e deve ser justificado. Contratos com menos de 30 vidas seguem o agrupamento definido pela ANS.';
      }
      if (faixa) nota += ' Mudança de faixa etária: para contratos desde 2004, a última faixa (59 anos ou mais) não pode custar mais que seis vezes a primeira (RN 63/2003), e o STJ exige percentuais razoáveis (Tema 952).';
      form.querySelector('[data-saida="linhas"]').innerHTML = html;
      form.querySelector('[data-saida="selo"]').innerHTML = s;
      form.querySelector('[data-saida="nota"]').textContent = nota;
      mostrar(form.querySelector('.resultado'));
      var nomes = { individual: 'individual/familiar', empresarial: 'coletivo empresarial', adesao: 'coletivo por adesão' };
      prepararEnvio(form, 'Olá, equipe IVO. Usei a ferramenta de reajuste do plano de saúde no site.\n\nPlano ' + nomes[tipo] + '. Mensalidade passou de ' + moeda.format(a) + ' para ' + moeda.format(d) + ' em ' + mes.split('-').reverse().join('/') + ' (' + pct(p) + ').' + (faixa ? ' Houve mudança de faixa etária.' : '') + resumoTeto + '\n\nGostaria de conversar sobre o reajuste.');
    });
  }

  // ------------------------------------------------ restituição em dobro --
  var MARCO = '2021-03-30';
  function restituicao(form) {
    var caixa = form.querySelector('[data-linhas]'), cont = 0;
    function novaLinha() {
      cont++;
      var div = document.createElement('div');
      div.className = 'campos campos--2';
      div.style.marginTop = '0';
      div.innerHTML = '<div class="campo"><label for="rd-d' + cont + '">Data do pagamento ' + cont + '</label><input id="rd-d' + cont + '" type="date" data-d></div>' +
        '<div class="campo"><label for="rd-v' + cont + '">Valor pago (R$)</label><input id="rd-v' + cont + '" inputmode="decimal" placeholder="89,90" data-v></div>';
      caixa.appendChild(div);
      return div;
    }
    novaLinha(); novaLinha();
    form.querySelector('[data-mais]').addEventListener('click', function () { var d = novaLinha(); d.querySelector('input').focus(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var antes = 0, depois = 0, semData = 0, qtd = 0, lista = [];
      caixa.querySelectorAll('.campos').forEach(function (l) {
        var dv = l.querySelector('[data-d]').value, v = num(l.querySelector('[data-v]').value);
        if (!(v > 0)) return;
        qtd++;
        lista.push((dv ? dv.split('-').reverse().join('/') : 'sem data') + ': ' + moeda.format(v));
        if (!dv) semData += v; else if (dv >= MARCO) depois += v; else antes += v;
      });
      if (!qtd) { var f = caixa.querySelector('[data-v]'); if (f) { f.closest('.campo').classList.add('campo--erro'); f.focus(); } return; }
      var total = antes + depois + semData;
      form.querySelector('[data-saida="total"]').textContent = moeda.format(total);
      var html = linha('Cobranças lançadas', String(qtd)) +
        linha('Pagas a partir de 30/03/2021', moeda.format(depois)) +
        linha('Referência em dobro para esse período', moeda.format(depois * 2)) +
        linha('Pagas antes de 30/03/2021', moeda.format(antes));
      if (semData) html += linha('Sem data informada', moeda.format(semData));
      form.querySelector('[data-saida="linhas"]').innerHTML = html;
      mostrar(form.querySelector('.resultado'));
      prepararEnvio(form, 'Olá, equipe IVO. Usei a ferramenta de cobranças indevidas no site.\n\nContesto ' + qtd + ' cobrança(s) já paga(s), somando ' + moeda.format(total) + ':\n' + lista.join('\n') + '\n\nGostaria de conversar sobre o caso.');
    });
  }

  // ------------------------------------------------- entrega do imóvel --
  function imovel(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = lerData(form.data.value), pago = num(form.pago.value), tol = form.querySelector('[name="tol"]:checked').value;
      erro(form, 'data', !!d); if (!d) return;
      var lim = new Date(d); if (tol === 'sim') lim.setUTCDate(lim.getUTCDate() + 180);
      var h = hojeUTC(), atraso = dias(lim, h);
      form.querySelector('[data-saida="limite"]').textContent = dataLonga(lim);
      var meses = 0;
      if (atraso > 0) { var m = new Date(lim); while (true) { m.setUTCMonth(m.getUTCMonth() + 1); if (m <= h) meses++; else break; } }
      var html = linha('Data prevista no contrato', dataCurta(d)) + linha('Tolerância considerada', tol === 'sim' ? '180 dias corridos' : 'nenhuma');
      var s;
      if (atraso > 0) {
        html += linha('Dias de atraso após o limite', String(atraso)) + linha('Meses completos de atraso', String(meses));
        if (pago > 0) html += linha('Referência do art. 43-A, § 2º (1% do valor pago por mês)', moeda.format(pago * 0.01 * meses));
        s = selo('atencao', 'Prazo de entrega ultrapassado');
      } else {
        html += linha('Dias até o limite', String(-atraso));
        s = selo('ok', 'Ainda dentro do prazo');
      }
      if (tol === 'ns') html += linha('Observação', 'confira no quadro-resumo se a tolerância está prevista');
      form.querySelector('[data-saida="linhas"]').innerHTML = html;
      form.querySelector('[data-saida="selo"]').innerHTML = s;
      mostrar(form.querySelector('.resultado'));
      prepararEnvio(form, 'Olá, equipe IVO. Usei a ferramenta de prazo de entrega do imóvel no site.\n\nEntrega prevista: ' + dataCurta(d) + '. Tolerância de 180 dias no contrato: ' + ({ sim: 'sim', nao: 'não', ns: 'não sei' })[tol] + '. Data limite: ' + dataCurta(lim) + '.' + (atraso > 0 ? ' Atraso de ' + atraso + ' dias até hoje.' : '') + '\n\nGostaria de conversar sobre o contrato.');
    });
  }

  // -------------------------------------------------- organize seu caso --
  function diagnostico(form) {
    var passos = ['area', 'situacao', 'quando', 'reclamou', 'urgencia', 'docs', 'contato', 'fim'];
    var r = {}, atual = 0;
    var barra = form.querySelector('.diag-progresso span'), status = form.querySelector('[data-diag-status]');
    function ir(i) {
      atual = i;
      passos.forEach(function (p, k) { form.querySelector('[data-passo="' + p + '"]').hidden = k !== i; });
      barra.style.setProperty('--f', (i / (passos.length - 1)).toFixed(3));
      status.textContent = 'Passo ' + (i + 1) + ' de ' + passos.length;
      var q = form.querySelector('[data-passo="' + passos[i] + '"] .diag-pergunta');
      if (q && i > 0) q.focus({ preventScroll: true });
    }
    form.querySelectorAll('[data-passo] .diag-escolhas').forEach(function (box) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-valor]'); if (!b) return;
        var passo = box.closest('[data-passo]').getAttribute('data-passo');
        r[passo] = b.getAttribute('data-valor');
        if (passo === 'area') montarArea(r.area);
        ir(atual + 1);
      });
    });
    function montarArea(slug) {
      var sit = (IVO.situacoes || {})[slug] || [];
      form.querySelector('[data-situacoes]').innerHTML = sit.concat(['Outra situação']).map(function (s) { return '<button type="button" data-valor="' + s.replace(/"/g, '&quot;') + '">' + s + '</button>'; }).join('');
      var docs = (IVO.documentos || {})[slug] || [];
      form.querySelector('[data-docs]').innerHTML = docs.map(function (d, i) { return '<label class="opcao"><input type="checkbox" name="doc" value="' + d.replace(/"/g, '&quot;') + '"><span>' + d + '</span></label>'; }).join('');
    }
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-voltar]')) { ir(Math.max(0, atual - 1)); }
      if (e.target.closest('[data-seguir]')) { r.docs = Array.prototype.map.call(form.querySelectorAll('[name="doc"]:checked'), function (c) { return c.value; }); ir(atual + 1); }
      if (e.target.closest('[data-recomecar]')) { r = {}; form.reset(); ir(0); }
      if (e.target.closest('[data-finalizar]')) {
        if (form.site.value) return; // robô
        if (!form.aceite.checked) { form.aceite.focus(); form.aceite.closest('.check').style.color = '#9A3B2E'; return; }
        var nomeArea = (IVO.areas || {})[r.area] || r.area;
        var urg = r.urgencia && r.urgencia.indexOf('Sim') === 0;
        var txt = (urg ? 'URGENTE · ' : '') + 'Caso organizado pelo site da IVO Advocacia\n\n' +
          'Área: ' + nomeArea + '\nSituação: ' + r.situacao + '\nQuando começou: ' + r.quando + '\nJá reclamou: ' + r.reclamou + '\nUrgência: ' + r.urgencia +
          '\nDocumentos que tenho: ' + (r.docs && r.docs.length ? r.docs.join('; ') : 'ainda nenhum') +
          (form.nome.value.trim() ? '\nNome: ' + form.nome.value.trim() : '') + (form.cidade.value.trim() ? '\nCidade: ' + form.cidade.value.trim() : '') +
          (form.relato.value.trim() ? '\n\nRelato: ' + form.relato.value.trim() : '');
        form.querySelector('[data-saida="resumo"]').textContent = txt;
        prepararEnvio(form, txt);
        ir(passos.length - 1);
      }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    ir(0);
  }

  var mapa = { 'baixa-da-negativacao': baixa, 'juros-do-emprestimo': juros, 'reajuste-do-plano': reajuste, 'restituicao-em-dobro': restituicao, 'entrega-do-imovel': imovel, 'organize-seu-caso': diagnostico };
  document.querySelectorAll('[data-ferramenta]').forEach(function (f) { var fn = mapa[f.getAttribute('data-ferramenta')]; if (fn) fn(f); });
})();
