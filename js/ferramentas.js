/* IVO Advocacia · ferramentas interativas
   Tudo roda no navegador; nada é enviado sem o visitante tocar em "Enviar pelo WhatsApp".
   window.IVO (injetado pela página): { whatsapp, areas: {slug: nome}, situacoes, documentos }
   window.ivoOrigem() e window.ivoEvento() vêm de js/site.js (campanha e medição).

   DADOS PÚBLICOS (o visitante nunca os digita). Conferidos em 25/11/2026:
   - tetosAns: limite anual da ANS para planos individuais (sai entre maio e junho de cada ano);
   - prazosAns: prazos de atendimento (RN ANS 566/2022, art. 3º);
   - margemInss: limites de desconto no benefício (Lei 10.820/2003, art. 6º, §§ 5º e 5º-A);
   - tetosInss: teto de juros do consignado do INSS (resoluções do CNPS);
   - TETO_CHEQUE: teto do cheque especial (Resolução CMN 4.765/2019);
   - DIAS_AVISO e DIAS_LIMITE_CORTE: corte de energia (REN ANEEL 1.000/2021, arts. 357 e 360);
   - /assets/dados/bcb-taxas.json: taxas médias do Banco Central (fonte/dados/bcb-taxas.json). */
(function () {
  'use strict';
  var IVO = window.IVO || {};
  var HOJE_MES = (function () { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'); })();

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
  function mesBR(m) { return m.slice(0, 7).split('-').reverse().join('/'); }
  function lerData(v) { if (!v) return null; var p = v.split('-').map(Number); if (!p[0] || p[0] < 1950 || p[0] > 2100) return null; return new Date(Date.UTC(p[0], p[1] - 1, p[2] || 1)); }
  function hojeUTC() { var n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
  function dias(a, b) { return Math.round((b - a) / 86400000); }
  function maisDias(d, n) { var x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
  function maisMeses(d, n) { var x = new Date(d), dia = x.getUTCDate(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n); var ult = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); x.setUTCDate(Math.min(dia, ult)); return x; }
  function mesesEntre(a, b) { var x = a.split('-').map(Number), y = b.split('-').map(Number); return (y[0] - x[0]) * 12 + (y[1] - x[1]) + 1; }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function linha(rot, val) { return '<div class="resultado__linha"><span>' + rot + '</span><b>' + val + '</b></div>'; }
  function selo(tipo, txt) { return '<span class="resultado__selo selo--' + tipo + '">' + txt + '</span>'; }
  function nota(txt) { return '<p class="resultado__nota">' + txt + '</p>'; }
  function evento(nome, dados) { if (window.ivoEvento) window.ivoEvento(nome, dados); }
  function sai(form, nome) { return form.querySelector('[data-saida="' + nome + '"]'); }
  function wa(msg) {
    var o = window.ivoOrigem ? window.ivoOrigem() : '';
    return 'https://wa.me/' + (IVO.whatsapp || '') + '?text=' + encodeURIComponent(msg + (o ? '\n\n' + o : ''));
  }
  function prepararEnvio(form, msg) {
    var a = form.querySelector('[data-enviar]');
    if (a) {
      a.href = wa(msg); a.target = '_blank';
      a.onclick = function () { evento('whatsapp_clique', { origem: 'ferramenta-' + form.getAttribute('data-ferramenta') }); };
    }
    var c = form.querySelector('[data-copiar]');
    if (c) c.onclick = function () {
      var ok = function () { c.textContent = 'Resumo copiado'; setTimeout(function () { c.textContent = 'Copiar resumo'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(ok, function () {}); else ok();
    };
  }
  // Mostra o resultado. o = { rotulo, numero, linhas, selo, nota, msg }
  function publicar(form, o) {
    var res = form.querySelector('.resultado');
    if (o.rotulo) sai(form, 'rotulo').textContent = o.rotulo;
    sai(form, 'numero').textContent = o.numero;
    sai(form, 'linhas').innerHTML = o.linhas || '';
    sai(form, 'selo').innerHTML = o.selo || '';
    if (o.nota != null) { var n = sai(form, 'nota'); n.textContent = o.nota; n.hidden = !o.nota; }
    res.hidden = false;
    var r = res.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.75 || r.top < 0) res.scrollIntoView({ block: 'start' });
    evento('ferramenta_resultado', { ferramenta: form.getAttribute('data-ferramenta') });
    prepararEnvio(form, o.msg);
  }
  function erro(form, campo, ok) {
    var el = form.querySelector('[name="' + campo + '"]');
    if (!el) return;
    var box = el.closest('.campo');
    if (box) box.classList.toggle('campo--erro', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok) el.focus();
  }
  function validar(form, regras) {
    var ok = true;
    regras.slice().reverse().forEach(function (c) { erro(form, c[0], c[1]); if (!c[1]) ok = false; });
    return ok;
  }
  function marcado(form, nome) { var el = form.querySelector('[name="' + nome + '"]:checked'); return el ? el.value : ''; }
  // Mês e ano em duas listas: devolve "AAAA-MM" ou "".
  function lerMes(form, nome) { var m = form[nome + '_m'].value, a = form[nome + '_a'].value; return m && a ? a + '-' + m : ''; }
  document.querySelectorAll('select[data-ano-min]').forEach(function (s) {
    var min = parseInt(s.getAttribute('data-ano-min'), 10), ano = new Date().getFullYear();
    for (var a = ano; a >= min; a--) { var o = document.createElement('option'); o.value = String(a); o.textContent = String(a); s.appendChild(o); }
  });

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
  function feriado(d) { return !!feriados(d.getUTCFullYear())[d.toISOString().slice(0, 10)]; }
  function util(d) { var w = d.getUTCDay(); return w !== 0 && w !== 6 && !feriado(d); }
  function somarUteis(d, n) { var x = new Date(d); while (n > 0) { x.setUTCDate(x.getUTCDate() + 1); if (util(x)) n--; } return x; }

  // ================================================================ SAÚDE ==
  // ------------------------------------------------- reajuste do plano --
  var tetosAns = [ // ciclos de maio a abril (ANS, planos individuais e familiares)
    { de: '2018-05', ate: '2019-04', teto: 10 },
    { de: '2019-05', ate: '2020-04', teto: 7.35 },
    { de: '2020-05', ate: '2021-04', teto: 8.14 },
    { de: '2021-05', ate: '2022-04', teto: -8.19 },
    { de: '2022-05', ate: '2023-04', teto: 15.5 },
    { de: '2023-05', ate: '2024-04', teto: 9.63 },
    { de: '2024-05', ate: '2025-04', teto: 6.91 },
    { de: '2025-05', ate: '2026-04', teto: 6.06 },
    { de: '2026-05', ate: '2027-04', teto: 5.11 },
  ];
  var trocaDeFaixa = [19, 24, 29, 34, 39, 44, 49, 54, 59]; // RN ANS 63/2003 (contratos desde 2004)
  function reajuste(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = num(form.antes.value), d = num(form.depois.value), mes = lerMes(form, 'mes'), tipo = marcado(form, 'tipo'), idade = Math.round(num(form.idade.value));
      if (!validar(form, [['antes', a > 0], ['depois', d > 0], ['mes_m', !!mes && mes <= HOJE_MES]])) return;
      var faixa = form.faixa.checked || trocaDeFaixa.indexOf(idade) > -1;
      var p = (d / a - 1) * 100, ciclo = null;
      tetosAns.forEach(function (c) { if (mes >= c.de && mes <= c.ate) ciclo = c; });
      var html = linha('Mensalidade antes', moeda.format(a)) + linha('Mensalidade depois', moeda.format(d)) + linha('Diferença por mês', moeda.format(d - a));
      var nomeCiclo = ciclo ? 'maio/' + ciclo.de.slice(0, 4) + ' a abril/' + ciclo.ate.slice(0, 4) : '';
      var acima = ciclo && p > ciclo.teto + 0.005, limite = ciclo ? a * (1 + ciclo.teto / 100) : 0;
      if (ciclo) html += linha('Limite da ANS para planos individuais (' + nomeCiclo + ')', pct(ciclo.teto));
      if (acima) {
        var n = Math.min(12, Math.max(1, mesesEntre(mes, HOJE_MES)));
        html += linha('Mensalidade se o aumento fosse o limite', moeda.format(limite)) + linha('Cobrado acima do limite por mês', moeda.format(d - limite));
        if (tipo === 'individual' && !faixa) html += linha('Acima do limite desde o aumento (' + plural(n, 'mês', 'meses') + ')', moeda.format((d - limite) * n));
      }
      var s = '', txt = '';
      if (!ciclo) s = selo('neutro', 'Sem limite da ANS cadastrado para esse mês');
      else if (faixa) s = selo('neutro', 'Aumento com mudança de faixa de idade: segue regras próprias');
      else if (tipo === 'individual') s = acima ? selo('atencao', 'Aumento acima do limite da ANS para o período') : selo('ok', 'Aumento dentro do limite da ANS');
      else if (tipo === 'ns') s = acima ? selo('atencao', 'Acima do limite da ANS, se o plano for individual') : selo('ok', 'Dentro do limite da ANS');
      else s = p > Math.max(ciclo.teto, 0) * 2 ? selo('atencao', 'Mais que o dobro do limite dos planos individuais') : selo('neutro', 'Plano coletivo: o limite da ANS não se aplica');
      if (tipo === 'individual') txt = 'Planos contratados diretamente com a operadora: o aumento anual não pode passar do limite autorizado pela ANS para o período (maio a abril).';
      else if (tipo === 'ns') txt = 'O limite da ANS vale para planos contratados diretamente com a operadora. Se o plano veio pela empresa ou por associação, ele serve só de referência. O tipo do plano consta do contrato e da carteirinha.';
      else txt = 'Planos coletivos não têm limite da ANS, mas o aumento deve seguir o contrato e ser justificado pela operadora. Contratos com menos de 30 pessoas recebem um reajuste único por operadora. O limite dos planos individuais aparece só como referência.';
      if (idade >= 60) txt += ' A partir dos 60 anos, contratos assinados desde 2004 não podem ter aumento por mudança de faixa de idade: a última faixa começa aos 59 anos.';
      else if (faixa) txt += ' Mudança de faixa de idade: nos contratos assinados desde 2004, as trocas ocorrem aos 19, 24, 29, 34, 39, 44, 49, 54 e 59 anos, a última faixa não pode custar mais que seis vezes a primeira, e o STJ exige percentuais previstos no contrato e razoáveis (Tema 952).';
      var nomes = { individual: 'contratado direto com a operadora', empresarial: 'empresarial', adesao: 'coletivo por adesão', ns: 'de tipo que não sei' };
      publicar(form, {
        numero: pct(p), linhas: html, selo: s, nota: txt,
        msg: 'Olá, equipe IVO. Usei a calculadora de reajuste do plano de saúde no site.\n\nPlano ' + nomes[tipo] + '. A mensalidade passou de ' + moeda.format(a) + ' para ' + moeda.format(d) + ' em ' + mesBR(mes) + ' (' + pct(p) + ').' + (idade > 0 ? ' Idade: ' + idade + ' anos.' : '') + (form.faixa.checked ? ' O aumento veio no mês do aniversário.' : '') + (ciclo ? ' Limite da ANS no período: ' + pct(ciclo.teto) + '.' : '') + '\n\nGostaria de conversar sobre o reajuste.',
      });
    });
  }

  // ------------------------------------------------ prazo do plano (ANS) --
  var prazosAns = { // RN 566/2022, art. 3º, dias úteis
    basica: [7, 'consulta básica (clínica médica, pediatria, ginecologia, obstetrícia ou cirurgia geral)'],
    especialista: [14, 'consulta nas demais especialidades médicas'],
    terapia: [10, 'sessão com psicólogo, fonoaudiólogo, fisioterapeuta, nutricionista ou terapeuta ocupacional'],
    odonto: [7, 'consulta ou procedimento odontológico'],
    laboratorio: [3, 'exame de laboratório'],
    exame: [10, 'exame ou terapia em ambulatório'],
    onco: [10, 'radioterapia, hemoterapia ou quimioterapia oral domiciliar'],
    hospitaldia: [10, 'atendimento em hospital-dia'],
    alta: [21, 'procedimento de alta complexidade'],
    internacao: [21, 'internação eletiva'],
    urgencia: [0, 'urgência e emergência'],
  };
  function prazoPlano(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = lerData(form.data.value), tipo = form.tipo.value, atendido = marcado(form, 'atendido'), h = hojeUTC();
      if (!validar(form, [['data', !!d && d <= h]])) return;
      var pz = prazosAns[tipo], html = linha('Tipo de atendimento', pz[1].charAt(0).toUpperCase() + pz[1].slice(1)) + linha('Pedido feito em', dataCurta(d)), s, lim = null, numero;
      if (pz[0] === 0) {
        numero = 'Imediato';
        html += linha('Prazo da ANS', 'atendimento imediato');
        s = selo('atencao', 'Urgência e emergência devem ser atendidas na hora');
      } else {
        lim = somarUteis(d, pz[0]);
        numero = dataLonga(lim);
        html += linha('Prazo da ANS', pz[0] + ' dias úteis');
        if (h > lim) { html += linha('Dias corridos além do prazo', String(dias(lim, h))); s = selo('atencao', atendido === 'sim' ? 'O atendimento veio depois do prazo da ANS' : 'Prazo da ANS ultrapassado'); }
        else { html += linha('Dias corridos até o limite', String(dias(h, lim))); s = selo('ok', 'Ainda dentro do prazo da ANS'); }
      }
      s += nota('O prazo vale para qualquer profissional ou serviço da rede do plano na sua cidade, e não para um médico ou hospital específico. Se o prazo passou, registre reclamação na operadora (anote o protocolo) e na ANS, pelo telefone 0800 701 9656 ou pelo site da agência.');
      publicar(form, {
        numero: numero, linhas: html, selo: s,
        msg: 'Olá, equipe IVO. Usei a ferramenta de prazo do plano de saúde no site.\n\nPedi ' + pz[1] + ' em ' + dataCurta(d) + '. ' + (lim ? 'O prazo da ANS (' + pz[0] + ' dias úteis) termina em ' + dataCurta(lim) + '.' : 'É caso de urgência.') + (atendido === 'nao' ? ' Ainda não fui atendido.' : ' Fui atendido com atraso.') + '\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // ------------------------------------------------- carência do plano --
  var carencias = { // Lei 9.656/1998, art. 12, V, e art. 11
    urgencia: ['24 horas', 'urgência e emergência', function (d) { return maisDias(d, 1); }],
    geral: ['180 dias', 'consultas, exames, internações e cirurgias', function (d) { return maisDias(d, 180); }],
    parto: ['300 dias', 'parto', function (d) { return maisDias(d, 300); }],
    preexistente: ['24 meses', 'procedimentos de alta complexidade ligados a doença preexistente', function (d) { return maisMeses(d, 24); }],
  };
  function carencia(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = lerData(form.data.value), tipo = marcado(form, 'tipo'), h = hojeUTC();
      if (!validar(form, [['data', !!d && d <= h]])) return;
      var c = carencias[tipo], fim = c[2](d), cumprida = h >= fim;
      var html = linha('Início do plano', dataCurta(d)) + linha('Dias desde o início do plano', String(dias(d, h)));
      html += linha('Urgência e emergência (24 horas)', dataCurta(carencias.urgencia[2](d))) + linha('Consultas, exames, internações e cirurgias (180 dias)', dataCurta(carencias.geral[2](d))) + linha('Parto (300 dias)', dataCurta(carencias.parto[2](d))) + linha('Doença preexistente declarada (24 meses)', dataCurta(carencias.preexistente[2](d)));
      var s = cumprida ? selo('ok', 'Prazo máximo de carência já cumprido') : selo('neutro', 'Ainda dentro do prazo máximo de carência (' + plural(dias(h, fim), 'dia', 'dias') + ')');
      if (tipo === 'urgencia') s += nota('Passadas 24 horas do início do contrato, a carência não pode impedir o atendimento de urgência e emergência. O STJ considera abusiva a cláusula que prevê prazo maior (Súmula 597).');
      if (tipo === 'preexistente') s += nota('A restrição de até 24 meses vale apenas para procedimentos de alta complexidade, cirurgias e leitos de alta tecnologia ligados à doença declarada na contratação. Consultas, exames simples e urgências não entram. Se a operadora não exigiu exames antes da contratação, cabe a ela provar que você sabia da doença (Súmula 609 do STJ).');
      if (cumprida && tipo !== 'preexistente') s += nota('Se o plano negou o atendimento alegando carência depois dessa data, peça a negativa por escrito, com o motivo e o número de protocolo.');
      publicar(form, {
        numero: dataLonga(fim), linhas: html, selo: s,
        msg: 'Olá, equipe IVO. Usei a ferramenta de carência do plano de saúde no site.\n\nMeu plano começou em ' + dataCurta(d) + '. Preciso de ' + c[1] + '. A carência máxima da lei (' + c[0] + ') ' + (cumprida ? 'terminou' : 'termina') + ' em ' + dataCurta(fim) + '.\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // ============================================================= BANCÁRIO ==
  // Devolução em dobro: o STJ dispensou a prova de má-fé (EAREsp 676.608, com efeitos para cobranças
  // a partir de 30/03/2021) e confirmou a tese em recurso repetitivo (Tema 929, acórdão de 03/11/2026).
  // A ferramenta mantém a separação por data até o escritório confirmar o alcance do Tema 929.
  var NOTA_DOBRO = 'Para o período a partir de 30/03/2021, o STJ dispensa a prova de má-fé para a devolução em dobro. Para o período anterior, a aplicação da devolução em dobro depende da análise do caso, à luz do Tema 929 do STJ, julgado em 2026.';

  // ------------------------------------------- descontos não autorizados --
  function descontos(form) {
    var fim = form.querySelector('[data-fim]');
    form.addEventListener('change', function (e) { if (e.target.name === 'continua') fim.hidden = e.target.value !== 'nao'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = num(form.valor.value), ini = lerMes(form, 'inicio'), cont = marcado(form, 'continua') !== 'nao', f = cont ? HOJE_MES : lerMes(form, 'fim');
      if (!validar(form, [['valor', v > 0], ['inicio_m', !!ini && ini <= HOJE_MES], ['fim_m', cont || (!!f && f >= ini)]])) return;
      if (f > HOJE_MES) f = HOJE_MES;
      var n = Math.max(0, mesesEntre(ini, f));
      var antes = 0, depois = 0;
      if (ini >= '2021-04') depois = n; else if (f < '2021-04') antes = n; else { antes = mesesEntre(ini, '2021-03'); depois = n - antes; }
      var total = v * n;
      var tipos = { emprestimo: 'empréstimo consignado', cartao: 'cartão consignado (RMC/RCC)', associacao: 'mensalidade de associação ou sindicato', outro: 'origem que não sei identificar' };
      var ondes = { inss: 'no benefício do INSS', salario: 'no salário', conta: 'na conta bancária' };
      var tipo = marcado(form, 'tipo'), onde = marcado(form, 'onde');
      var html = linha('Meses com desconto', String(n)) + linha('Valor de cada desconto', moeda.format(v));
      if (depois) html += linha('Descontado a partir de abril/2021', moeda.format(v * depois)) + linha('Referência em dobro para esse período', moeda.format(v * depois * 2));
      if (antes) html += linha('Descontado até março/2021', moeda.format(v * antes));
      var dica = onde === 'inss'
        ? 'Baixe no Meu INSS o "Extrato de empréstimos" e o "Extrato de pagamento" e guarde. Eles mostram quem fez o desconto e desde quando.'
        : onde === 'salario' ? 'Separe os contracheques com os descontos e peça ao setor de pessoal a relação de consignações.' : 'Separe os extratos da conta com os descontos. Eles são a principal prova do caso.';
      publicar(form, {
        numero: moeda.format(total), linhas: html, selo: (cont ? selo('atencao', 'O desconto continua todo mês') : '') + nota(dica),
        nota: 'Referência aritmética, sem correção monetária e juros. ' + NOTA_DOBRO,
        msg: 'Olá, equipe IVO. Usei a ferramenta de descontos não autorizados no site.\n\nTenho um desconto de ' + tipos[tipo] + ' ' + ondes[onde] + ' que não reconheço: ' + moeda.format(v) + ' por mês, desde ' + mesBR(ini) + (cont ? ', e continua.' : ' até ' + mesBR(f) + '.') + '\nTotal descontado: ' + moeda.format(total) + ' em ' + plural(n, 'mês', 'meses') + '.\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // ------------------------------------------- margem consignável (INSS) --
  // % do benefício. Aposentadoria e pensão: 35 + 5 + 5 (Lei 10.820/2003, art. 6º, § 5º).
  // BPC/LOAS: 30 para empréstimos + 5 para cartão (art. 6º, § 5º-A).
  var margemInss = { comum: { emprestimo: 35, cartoes: 10, cada: 5 }, bpc: { emprestimo: 30, cartoes: 5, cada: 5 } };
  function margem(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var B = num(form.beneficio.value), E = num(form.emprestimo.value) || 0, R1 = num(form.rmc.value) || 0, R2 = num(form.rcc.value) || 0, T = E + R1 + R2;
      var bpc = marcado(form, 'beneficiotipo') === 'bpc', m = bpc ? margemInss.bpc : margemInss.comum;
      if (!validar(form, [['beneficio', B > 0], ['emprestimo', T > 0 && T < B]])) return;
      var limE = B * m.emprestimo / 100, limC = B * m.cartoes / 100, limCada = B * m.cada / 100, limT = limE + limC, totalPct = m.emprestimo + m.cartoes;
      var temCartao = R1 + R2 > 0;
      var html = linha('Valor do benefício', moeda.format(B)) + linha('Total descontado por mês', moeda.format(T)) + linha('Limite total da lei (' + totalPct + '%)', moeda.format(limT));
      html += linha('Empréstimos: ' + pct(E / B * 100, 1) + ' do benefício', moeda.format(E) + ' de até ' + moeda.format(limE));
      if (temCartao && !bpc) html += linha('Cartão de crédito (RMC): ' + pct(R1 / B * 100, 1), moeda.format(R1) + ' de até ' + moeda.format(limCada)) + linha('Cartão de benefício (RCC): ' + pct(R2 / B * 100, 1), moeda.format(R2) + ' de até ' + moeda.format(limCada));
      if (temCartao && bpc) html += linha('Cartões (RMC e RCC): ' + pct((R1 + R2) / B * 100, 1), moeda.format(R1 + R2) + ' de até ' + moeda.format(limC));
      var excessos = [];
      if (temCartao) {
        if (E > limE + 0.005) excessos.push(['empréstimos', E - limE]);
        if (bpc) { if (R1 + R2 > limC + 0.005) excessos.push(['cartões', R1 + R2 - limC]); }
        else {
          if (R1 > limCada + 0.005) excessos.push(['cartão de crédito (RMC)', R1 - limCada]);
          if (R2 > limCada + 0.005) excessos.push(['cartão de benefício (RCC)', R2 - limCada]);
        }
      } else if (T > limT + 0.005) excessos.push(['todos os descontos somados', T - limT]); // sem separar os cartões, vale o limite total
      excessos.forEach(function (x) { html += linha('Acima do limite em ' + x[0], moeda.format(x[1]) + ' por mês'); });
      var s = excessos.length ? selo('atencao', 'Descontos acima da margem prevista em lei') : selo('ok', 'Descontos dentro da margem prevista em lei');
      if (!temCartao && !excessos.length && E > limE + 0.005) s += nota('Os descontos passam de ' + m.emprestimo + '% do benefício, limite dos empréstimos, mas ficam dentro do limite total de ' + totalPct + '%, que inclui os cartões. Confira no extrato do Meu INSS se parte desse valor é de cartão (RMC ou RCC).');
      s += nota('O limite é calculado sobre o benefício depois dos descontos obrigatórios, como imposto de renda e pensão alimentícia. Se você tem esses descontos, a margem real é um pouco menor. Estar dentro da margem não torna válido um contrato que você não fez.');
      publicar(form, {
        numero: pct(T / B * 100, 1) + ' do benefício', linhas: html, selo: s,
        nota: 'Lei 10.820/2003, art. 6º, §§ 5º e 5º-A. Contratos assinados entre 19/05/2026 e 31/08/2026 seguiram um limite total de 40%, que vigorou nesse período.',
        msg: 'Olá, equipe IVO. Usei a ferramenta de limite de descontos no benefício do INSS no site.\n\nBenefício' + (bpc ? ' (BPC/LOAS)' : '') + ' de ' + moeda.format(B) + '. Descontos por mês: ' + moeda.format(E) + ' de empréstimos' + (R1 ? ', ' + moeda.format(R1) + ' de cartão de crédito (RMC)' : '') + (R2 ? ', ' + moeda.format(R2) + ' de cartão de benefício (RCC)' : '') + '. Total: ' + moeda.format(T) + ' (' + pct(T / B * 100, 1) + ' do benefício).' + (excessos.length ? ' Passa do limite da lei.' : '') + '\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // ------------------------------------------------------ juros × média BCB --
  var bcb = null;
  function carregarBcb() {
    if (bcb) return Promise.resolve(bcb);
    return fetch('/site-ivo-demo/assets/dados/bcb-taxas.json').then(function (r) { return r.json(); }).then(function (j) { return (bcb = j); });
  }
  var nomesCredito = { pessoal: 'crédito pessoal não consignado', inss: 'consignado do INSS', publico: 'consignado de servidor público', privado: 'consignado de empresa privada', veiculo: 'financiamento de veículo', parcelado: 'parcelamento da fatura do cartão', cheque: 'cheque especial' };
  // Teto de juros do empréstimo consignado do INSS, % ao mês, por data de início (resoluções do CNPS).
  var tetosInss = [['2022-12-13', 2.14], ['2023-03-15', 1.70], ['2023-03-30', 1.97], ['2023-08-21', 1.91], ['2023-10-23', 1.84], ['2023-12-13', 1.80], ['2024-01-24', 1.76], ['2024-03-11', 1.72], ['2024-05-08', 1.68], ['2024-06-05', 1.66], ['2025-01-17', 1.80], ['2025-04-04', 1.85]];
  // Maior teto que valeu em algum dia do mês (a ferramenta não pergunta o dia da contratação).
  function tetoInssDoMes(mes) {
    if (mes < '2023-01') return null;
    var maior = null;
    tetosInss.forEach(function (t, k) {
      var ini = t[0], fim = tetosInss[k + 1] ? tetosInss[k + 1][0] : '9999-12-31';
      if (ini <= mes + '-31' && fim > mes + '-01') maior = maior == null ? t[1] : Math.max(maior, t[1]);
    });
    return maior;
  }
  var TETO_CHEQUE = 8; // % ao mês, desde 06/01/2020 (Resolução CMN 4.765/2019)
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
      var V = num(form.valor.value), P = num(form.parcela.value), n = Math.round(num(form.n.value)), mes = lerMes(form, 'mes'), tipo = form.tipo.value;
      if (!validar(form, [['valor', V > 0], ['parcela', P > 0 && P < V], ['n', n > 0 && n <= 420], ['mes_m', !!mes && mes <= HOJE_MES]])) return;
      var i = taxaPrice(V, P, n), ia = Math.pow(1 + i, 12) - 1;
      var base = linha('Equivalente ao ano', pct(ia * 100)) + linha('Total a pagar', moeda.format(P * n)) + linha('Juros totais', moeda.format(Math.max(0, P * n - V)));
      var teto = tipo === 'inss' ? tetoInssDoMes(mes) : tipo === 'cheque' && mes >= '2020-02' ? TETO_CHEQUE : null, sTeto = '', resumoTeto = '';
      if (teto != null) {
        base += linha(tipo === 'inss' ? 'Teto do consignado do INSS em ' + mesBR(mes) : 'Teto do cheque especial', pct(teto) + ' ao mês');
        if (i * 100 > teto + 0.02) { sTeto = selo('atencao', 'Taxa acima do teto oficial') + ' '; resumoTeto = '\nTeto oficial no período: ' + pct(teto) + ' a.m. A taxa calculada está acima.'; }
      }
      var cab = 'Olá, equipe IVO. Usei a calculadora de juros no site.\n\nEmpréstimo (' + (tipo === 'ns' ? 'tipo que não sei' : nomesCredito[tipo]) + ') de ' + moeda.format(V) + ' em ' + n + ' parcelas de ' + moeda.format(P) + ', contratado em ' + mesBR(mes) + '.\nTaxa calculada: ' + pct(i * 100) + ' a.m. (' + pct(ia * 100) + ' a.a.).' + resumoTeto;
      function fim(html, s, resumoRef) { publicar(form, { numero: pct(i * 100) + ' ao mês', linhas: html, selo: sTeto + s, msg: cab + resumoRef + '\n\nGostaria que analisassem o contrato.' }); }
      carregarBcb().then(function (todas) {
        var chave = tipo === 'ns' ? 'pessoal' : tipo, serie = todas[chave] || {};
        var meses = Object.keys(serie).sort(), mesRef = serie[mes] != null ? mes : (mes > meses[meses.length - 1] ? meses[meses.length - 1] : null);
        var ref = mesRef ? serie[mesRef] / 100 : null, html = base, s = '', resumoRef = '';
        if (ref) {
          var fonte = nomesCredito[chave] + ', ' + mesBR(mesRef);
          var pRef = V * ref / (1 - Math.pow(1 + ref, -n)), razao = i / ref, vezes = razao.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
          html += linha('Média do Banco Central (' + fonte + ')', pct(ref * 100) + ' ao mês') +
            linha('Parcela se fosse a taxa média', moeda.format(pRef)) +
            linha('Diferença no total pago', moeda.format(Math.max(0, (P - pRef) * n))) +
            linha('Relação com a média', vezes + (razao >= 2 ? ' vezes' : ' vez') + ' a média');
          s = razao > 1.5 ? selo('atencao', 'Taxa acima de 1,5 vez a média de mercado') : razao > 1 ? selo('neutro', 'Taxa acima da média, em menos de 1,5 vez') : selo('ok', 'Taxa igual ou abaixo da média');
          if (mesRef !== mes) s += nota('O Banco Central ainda não divulgou a média de ' + mesBR(mes) + '. A comparação usa a última disponível (' + mesBR(mesRef) + ').');
          if (tipo === 'ns') s += nota('Como o tipo não foi informado, a comparação usa o crédito pessoal. Se a parcela é descontada do benefício ou do salário, o empréstimo é consignado e a média é bem menor: refaça a conta com o tipo certo.');
          resumoRef = '\nMédia do Banco Central: ' + pct(ref * 100) + ' a.m. (' + fonte + '). Relação: ' + vezes + 'x.';
        } else {
          html += linha('Média do Banco Central', 'sem dado para o mês');
        }
        fim(html, s, resumoRef);
      }, function () { fim(base + linha('Média do Banco Central', 'não foi possível carregar'), nota('Sem conexão para carregar as médias do Banco Central. A taxa do contrato acima está correta; tente de novo para ver a comparação.'), ''); });
    });
  }

  // =========================================================== CONSUMIDOR ==
  // ------------------------------------------------------- conta de luz --
  function luz(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var atual = num(form.atual.value), valor = num(form.valor.value);
      var ant = Array.prototype.map.call(form.querySelectorAll('[data-mes]'), function (i) { return num(i.value); }).filter(function (x) { return x > 0; });
      if (!validar(form, [['atual', atual > 0], ['m1', ant.length > 0]])) return;
      var media = ant.reduce(function (a, b) { return a + b; }, 0) / ant.length, dif = (atual / media - 1) * 100;
      var html = linha('Consumo da conta contestada', Math.round(atual) + ' kWh') + linha(ant.length === 1 ? 'Consumo do mês anterior' : 'Média dos ' + ant.length + ' meses anteriores', Math.round(media) + ' kWh') + linha('Diferença', Math.round(atual - media) + ' kWh');
      if (valor > 0) html += linha('Valor da conta contestada', moeda.format(valor)) + linha('Valor proporcional à sua média', moeda.format(valor * media / atual));
      var s = dif >= 50 ? selo('atencao', 'Consumo muito acima da sua média') : dif >= 20 ? selo('neutro', 'Consumo acima da sua média') : selo('ok', 'Consumo próximo da sua média');
      var txt = 'Mudanças na casa (novo morador, ar-condicionado, chuveiro elétrico) explicam parte das variações. Guarde as faturas e registre reclamação na distribuidora, com protocolo.';
      if (form.recuperacao.checked) txt += ' Cobrança de recuperação de consumo: a distribuidora deve seguir o procedimento da ANEEL, com termo de ocorrência e direito de contestação. Você tem 15 dias, contados do recebimento do termo, para pedir perícia no medidor. Peça cópia de todos os documentos da inspeção.';
      if (form.corte.checked) s += ' ' + selo('atencao', 'Aviso de corte') + nota('Confira os prazos na ferramenta <a href="/site-ivo-demo/ferramentas/corte-de-energia/">Corte de energia por conta atrasada</a>.');
      publicar(form, {
        numero: (dif >= 0 ? '+' : '') + pct(dif, 0), linhas: html, selo: s, nota: txt,
        msg: (form.corte.checked ? 'URGENTE · ' : '') + 'Olá, equipe IVO. Usei a ferramenta da conta de luz no site.\n\nA conta contestada marcou ' + Math.round(atual) + ' kWh' + (valor > 0 ? ' (' + moeda.format(valor) + ')' : '') + '. A média dos meses anteriores é ' + Math.round(media) + ' kWh (' + (dif >= 0 ? '+' : '') + pct(dif, 0) + ').' + (form.recuperacao.checked ? ' A conta cobra recuperação de consumo.' : '') + (form.corte.checked ? ' Recebi aviso de corte.' : '') + '\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // --------------------------------------------------- corte de energia --
  var DIAS_AVISO = 15, DIAS_LIMITE_CORTE = 90; // REN ANEEL 1.000/2021, arts. 360 e 357
  var semana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function diaProibido(d) { // REN 1.000/2021, art. 359, e Lei 14.015/2020
    var w = d.getUTCDay();
    if (w === 5 || w === 6 || w === 0) return semana[w];
    if (feriado(d)) return 'feriado';
    if (feriado(maisDias(d, 1))) return 'véspera de feriado';
    return '';
  }
  function corte(form) {
    var cxAviso = form.querySelector('[data-aviso]'), cxCorte = form.querySelector('[data-cortou]');
    form.addEventListener('change', function (e) {
      if (e.target.name === 'aviso') cxAviso.hidden = e.target.value !== 'sim';
      if (e.target.name === 'cortou') cxCorte.hidden = e.target.value !== 'sim';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var venc = lerData(form.venc.value), aviso = marcado(form, 'aviso'), dAviso = aviso === 'sim' ? lerData(form.dataaviso.value) : null;
      var cortou = marcado(form, 'cortou') === 'sim', dCorte = cortou ? lerData(form.datacorte.value) : null, h = hojeUTC();
      if (!validar(form, [['venc', !!venc && venc <= h], ['dataaviso', aviso !== 'sim' || !dAviso || dAviso <= h], ['datacorte', !cortou || !dCorte || (dCorte >= venc && dCorte <= h)]])) return;
      var limite = maisDias(venc, DIAS_LIMITE_CORTE), minimo = dAviso ? maisDias(dAviso, DIAS_AVISO) : null, passou = h > limite;
      var html = linha('Vencimento da conta', dataCurta(venc)) + linha('Dias de atraso', String(dias(venc, h)));
      if (minimo) html += linha('Aviso recebido em', dataCurta(dAviso)) + linha('Corte não pode ocorrer antes de', dataCurta(minimo));
      var problemas = [], s = '';
      if (cortou) {
        if (dCorte) {
          html += linha('Corte feito em', dataCurta(dCorte) + ' (' + semana[dCorte.getUTCDay()] + ')');
          var dp = diaProibido(dCorte);
          if (dp) problemas.push('o corte foi feito em dia proibido (' + dp + ')');
          if (dCorte > limite) problemas.push('o corte foi feito mais de 90 dias depois do vencimento');
          if (minimo && dCorte < minimo) problemas.push('o corte foi feito menos de 15 dias depois do aviso');
        }
        if (aviso === 'nao') problemas.push('não houve aviso prévio');
        s = problemas.length ? selo('atencao', 'Há sinais de corte irregular') + nota('Pelo que você informou, ' + problemas.join('; ') + '. Guarde a fatura, o aviso (se houver) e o protocolo da reclamação.' + (aviso === 'nao' ? ' Sem aviso prévio, a taxa de religação não é devida.' : '')) : selo('neutro', 'Os prazos informados foram respeitados');
      } else {
        if (passou) s = selo('ok', 'Passaram 90 dias do vencimento: o corte por essa conta não é mais permitido');
        else if (aviso === 'nao') s = selo('neutro', 'Sem aviso prévio, o corte não pode ser feito');
        else if (minimo && h < minimo) s = selo('neutro', 'O corte ainda não pode ser feito');
        else s = selo('atencao', 'O corte por essa conta ainda é permitido');
        s += nota('O corte só pode ser feito das 8h às 18h e não pode começar na sexta-feira, no sábado, no domingo, em feriado ou na véspera de feriado.');
      }
      if (passou) s += nota('A dívida continua existindo e pode ser cobrada por outros meios, mas não justifica mais a suspensão do fornecimento.');
      if (form.recuperacao.checked) s += nota('Dívida de recuperação de consumo: o STJ só admite o corte quando a irregularidade foi apurada com direito de defesa do consumidor, e apenas pelo consumo dos 90 dias anteriores à constatação (Tema 699).');
      publicar(form, {
        numero: dataLonga(limite), linhas: html, selo: s, nota: 'Resolução Normativa ANEEL 1.000/2021, arts. 357, 359 e 360, e Lei 14.015/2020. Cada conta em atraso tem o seu próprio prazo.',
        msg: (cortou || (!passou && aviso === 'sim') ? 'URGENTE · ' : '') + 'Olá, equipe IVO. Usei a ferramenta de corte de energia no site.\n\nConta vencida em ' + dataCurta(venc) + '. Aviso de corte: ' + ({ sim: 'sim' + (dAviso ? ', em ' + dataCurta(dAviso) : ''), nao: 'não recebi', ns: 'não sei' })[aviso] + '.' + (cortou ? ' A energia foi cortada' + (dCorte ? ' em ' + dataCurta(dCorte) : '') + '.' : ' A energia ainda não foi cortada.') + (form.recuperacao.checked ? ' A dívida é de recuperação de consumo.' : '') + (problemas.length ? '\nPontos apontados pela ferramenta: ' + problemas.join('; ') + '.' : '') + '\n\nGostaria de conversar sobre o caso.',
      });
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
        '<div class="campo"><label for="rd-v' + cont + '">Valor pago (R$)</label><input id="rd-v' + cont + '" inputmode="decimal" autocomplete="off" placeholder="Ex.: 89,90" data-v></div>';
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
      var html = linha('Cobranças lançadas', String(qtd)) +
        linha('Pagas a partir de 30/03/2021', moeda.format(depois)) +
        linha('Referência em dobro para esse período', moeda.format(depois * 2)) +
        linha('Pagas antes de 30/03/2021', moeda.format(antes));
      if (semData) html += linha('Sem data informada', moeda.format(semData));
      publicar(form, {
        numero: moeda.format(total), linhas: html,
        nota: 'Referência aritmética do art. 42, parágrafo único, do CDC, sem correção monetária e juros. ' + NOTA_DOBRO,
        msg: 'Olá, equipe IVO. Usei a ferramenta de cobranças indevidas no site.\n\nContesto ' + qtd + ' cobrança(s) já paga(s), somando ' + moeda.format(total) + ':\n' + lista.join('\n') + '\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // ------------------------------------------------- baixa da negativação --
  function baixa(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = lerData(form.data.value), h = hojeUTC();
      if (!validar(form, [['data', !!d && d <= h]])) return;
      var lim = somarUteis(d, 5), passou = h > lim, n = dias(lim, h);
      publicar(form, {
        numero: dataLonga(lim), linhas: linha('Pagamento feito em', dataCurta(d)) + linha('Prazo do credor', '5 dias úteis'),
        selo: passou
          ? selo('atencao', 'O prazo terminou há ' + plural(n, 'dia', 'dias')) + nota('Se o nome continua no cadastro, consulte o CPF no Serasa, no SPC e na Boa Vista e salve a consulta com a data.')
          : selo('ok', 'Ainda dentro do prazo'),
        msg: 'Olá, equipe IVO. Usei a ferramenta de prazo da baixa no site.\n\nPaguei a dívida em ' + dataCurta(d) + '. O prazo de 5 dias úteis (Súmula 548 do STJ) ' + (passou ? 'terminou' : 'termina') + ' em ' + dataCurta(lim) + '.' + (passou ? ' Meu nome continua negativado.' : '') + '\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // --------------------------------------------- prazo máximo da negativação --
  function dividaAntiga(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = lerData(form.data.value), h = hojeUTC(), neg = marcado(form, 'negativado');
      if (!validar(form, [['data', !!d && d <= h]])) return;
      var lim = maisMeses(d, 60), passou = h > lim, s;
      var html = linha('Vencimento da dívida', dataCurta(d)) + linha('Prazo máximo do registro', '5 anos') + (passou ? linha('Tempo além do prazo', plural(dias(lim, h), 'dia', 'dias')) : linha('Tempo até o fim do prazo', plural(dias(h, lim), 'dia', 'dias')));
      if (passou) s = neg === 'nao' ? selo('ok', 'O prazo de cinco anos já terminou') : selo('atencao', 'O prazo de cinco anos já terminou') + nota('Se o nome ainda aparece negativado por essa dívida, salve a consulta ao CPF com a data e peça a exclusão ao cadastro (Serasa, SPC ou Boa Vista) e ao credor, por canal que gere protocolo.');
      else s = selo('neutro', 'O prazo de cinco anos ainda não terminou');
      publicar(form, {
        numero: dataLonga(lim), linhas: html, selo: s,
        msg: 'Olá, equipe IVO. Usei a ferramenta de prazo máximo da negativação no site.\n\nDívida vencida em ' + dataCurta(d) + '. O prazo de cinco anos do registro ' + (passou ? 'terminou' : 'termina') + ' em ' + dataCurta(lim) + '. Nome negativado hoje por essa dívida: ' + ({ sim: 'sim', nao: 'não', ns: 'não sei' })[neg] + '.\n\nGostaria de conversar sobre o caso.',
      });
    });
  }

  // ========================================================== IMOBILIÁRIO ==
  // ------------------------------------------------- entrega do imóvel --
  function imovel(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = lerData(form.data.value), pago = num(form.pago.value), tol = marcado(form, 'tol');
      if (!validar(form, [['data', !!d]])) return;
      var lim = tol !== 'nao' ? maisDias(d, 180) : new Date(d);
      var h = hojeUTC(), atraso = dias(lim, h);
      var meses = 0;
      if (atraso > 0) { while (maisMeses(lim, meses + 1) <= h) meses++; }
      var html = linha('Data prevista no contrato', dataCurta(d)) + linha('Tolerância considerada', tol === 'nao' ? 'nenhuma' : '180 dias corridos');
      var s;
      if (atraso > 0) {
        html += linha('Dias de atraso após o limite', String(atraso)) + linha('Meses completos de atraso', String(meses));
        if (pago > 0) html += linha('Referência do art. 43-A, § 2º (1% do valor pago por mês)', moeda.format(pago * 0.01 * meses));
        s = selo('atencao', 'Prazo de entrega ultrapassado') + nota('Quem prefere desfazer o contrato por causa do atraso tem direito, pela lei, à devolução integral do que pagou. Veja a ferramenta <a href="/site-ivo-demo/ferramentas/distrato-do-imovel/">Distrato do imóvel na planta</a>.');
      } else {
        html += linha('Dias até o limite', String(-atraso));
        s = selo('ok', 'Ainda dentro do prazo');
      }
      if (tol === 'ns') s += nota('Como a tolerância não foi informada, a conta considera os 180 dias, que é o cenário menos favorável ao comprador. Sem previsão clara no contrato, não há tolerância e o atraso conta desde a data prevista.');
      publicar(form, {
        numero: dataLonga(lim), linhas: html, selo: s,
        msg: 'Olá, equipe IVO. Usei a ferramenta de prazo de entrega do imóvel no site.\n\nEntrega prevista: ' + dataCurta(d) + '. Tolerância de 180 dias no contrato: ' + ({ sim: 'sim', nao: 'não', ns: 'não sei' })[tol] + '. Data limite: ' + dataCurta(lim) + '.' + (atraso > 0 ? ' Atraso de ' + atraso + ' dias até hoje.' : '') + (pago > 0 ? ' Já paguei ' + moeda.format(pago) + '.' : '') + '\n\nGostaria de conversar sobre o contrato.',
      });
    });
  }

  // ------------------------------------------------ distrato do imóvel --
  function distrato(form) {
    var caixaAf = form.querySelector('[data-afetacao]');
    form.addEventListener('change', function (e) { if (e.target.name === 'motivo') caixaAf.hidden = e.target.value === 'atraso'; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var P = num(form.pago.value), C = num(form.corretagem.value) || 0, d = form.data.value, motivo = marcado(form, 'motivo'), af = marcado(form, 'afetacao');
      if (!validar(form, [['pago', P > 0], ['corretagem', C >= 0 && C < P], ['data', !!lerData(d)]])) return;
      var html = linha('Total pago', moeda.format(P)), s = '', txt = '', rot = 'Mínimo que a lei manda devolver', valor, resumo;
      var leiNova = d >= '2018-12-28';
      if (motivo === 'atraso') {
        rot = 'Devolução prevista em lei';
        valor = moeda.format(P);
        html += linha('Retenção permitida', 'nenhuma') + linha('Prazo para devolver', 'até 60 dias corridos');
        s = selo('ok', 'Atraso da construtora: devolução integral');
        txt = 'Lei 4.591/1964, art. 43-A, § 1º: passado o prazo de entrega com a tolerância, o comprador pode desfazer o contrato e receber tudo o que pagou, corrigido, com a multa prevista no contrato, em até 60 dias. Confira o atraso na ferramenta Prazo de entrega do imóvel na planta.';
        resumo = 'Quero desfazer o contrato por atraso na entrega. Paguei ' + moeda.format(P) + '.';
      } else if (!leiNova) {
        valor = moeda.format(P * 0.75) + ' a ' + moeda.format(P * 0.9);
        rot = 'Faixa de devolução que o STJ costuma admitir';
        html += linha('Contrato assinado em', mesBR(d)) + linha('Retenção que o STJ costuma admitir', '10% a 25% do valor pago');
        s = selo('neutro', 'Contrato anterior à Lei 13.786/2018');
        txt = 'A Lei 13.786/2018 vale para contratos assinados a partir de 28/12/2018. Para contratos anteriores, a retenção é fixada pelo Judiciário, em geral entre 10% e 25% do valor pago, e a devolução deve ser imediata (Súmula 543 do STJ).';
        resumo = 'Quero desistir do imóvel. Contrato de ' + mesBR(d) + ' (antes da Lei 13.786/2018). Paguei ' + moeda.format(P) + '.';
      } else {
        var cenarios = af === 'sim' ? [50] : af === 'nao' ? [25] : [25, 50];
        if (C) html += linha('Corretagem (pode ser descontada)', moeda.format(C));
        cenarios.forEach(function (c) {
          html += linha('Multa máxima de ' + c + '%' + (c === 50 ? ' (com patrimônio de afetação)' : ' (sem patrimônio de afetação)'), moeda.format(P * c / 100)) +
            linha('Mínimo a devolver nesse cenário', moeda.format(Math.max(0, P - C - P * c / 100)));
        });
        var piorCaso = Math.max(0, P - C - P * Math.max.apply(null, cenarios) / 100);
        valor = moeda.format(piorCaso);
        if (cenarios.length > 1) rot = 'Mínimo a devolver no cenário menos favorável';
        html += linha('Prazo para devolver', af === 'sim' ? 'até 30 dias após o habite-se' : af === 'nao' ? '180 dias após o distrato' : '30 dias após o habite-se (com afetação) ou 180 dias após o distrato (sem)');
        s = selo('neutro', 'Esses percentuais são o máximo que a lei permite');
        txt = 'Lei 4.591/1964, art. 67-A (incluído pela Lei 13.786/2018). O contrato pode prever retenção menor, e o Judiciário pode reduzir a multa conforme o caso. Se você já morou no imóvel, a construtora pode cobrar também taxa de fruição, impostos e condomínio do período. Compra feita em estande de vendas ou fora da sede da construtora pode ser desfeita em sete dias, com devolução de tudo.';
        resumo = 'Quero desistir do imóvel. Contrato de ' + mesBR(d) + '. Paguei ' + moeda.format(P) + (C ? ', sendo ' + moeda.format(C) + ' de corretagem' : '') + '. Patrimônio de afetação: ' + ({ sim: 'sim', nao: 'não', ns: 'não sei' })[af] + '.';
      }
      publicar(form, { rotulo: rot, numero: valor, linhas: html, selo: s, nota: txt, msg: 'Olá, equipe IVO. Usei a calculadora de distrato do imóvel no site.\n\n' + resumo + '\n\nGostaria de conversar sobre o contrato.' });
    });
  }

  // ================================================================ GERAL ==
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
      form.querySelector('[data-docs]').innerHTML = docs.map(function (d) { return '<label class="opcao"><input type="checkbox" name="doc" value="' + d.replace(/"/g, '&quot;') + '"><span>' + d + '</span></label>'; }).join('');
    }
    // Página de área ou anúncio pode pré-escolher a área: ?area=direito-a-saude
    var pre = new URLSearchParams(location.search).get('area');
    form.addEventListener('click', function (e) {
      if (e.target.closest('[data-voltar]')) { ir(Math.max(pre && atual === 1 ? 1 : 0, atual - 1)); }
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
        sai(form, 'resumo').textContent = txt;
        prepararEnvio(form, txt);
        ir(passos.length - 1);
        evento('ferramenta_resultado', { ferramenta: 'organize-seu-caso' });
      }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    if (pre && (IVO.areas || {})[pre]) { r.area = pre; montarArea(pre); ir(1); } else ir(0);
  }

  var mapa = {
    'reajuste-do-plano': reajuste, 'prazo-do-plano': prazoPlano, 'carencia-do-plano': carencia,
    'descontos-nao-autorizados': descontos, 'margem-consignavel': margem, 'juros-do-emprestimo': juros,
    'conta-de-luz': luz, 'corte-de-energia': corte, 'restituicao-em-dobro': restituicao, 'baixa-da-negativacao': baixa, 'divida-antiga': dividaAntiga,
    'entrega-do-imovel': imovel, 'distrato-do-imovel': distrato, 'organize-seu-caso': diagnostico,
  };
  document.querySelectorAll('[data-ferramenta]').forEach(function (f) { var fn = mapa[f.getAttribute('data-ferramenta')]; if (fn) fn(f); });
})();
