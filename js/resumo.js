function coresCategoria(nome) {
  const map = {
    'Dívidas': '#ef4444',
    'Alimentação': '#0ea5e9',
    'Educação': '#22c55e',
    'Bem Estar': '#84cc16',
    'Moradia': '#3b82f6',
    'Transporte': '#a855f7',
    'Lazer': '#f59e0b',
    'Outros': '#94a3b8'
  };
  return map[nome] || '#2EC4B6';
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcoDonut(cx, cy, r, rInner, startAngle, endAngle) {
  if (endAngle - startAngle >= 359.99) {
    const mid = startAngle + 180;
    return arcoDonut(cx, cy, r, rInner, startAngle, mid) + ' ' + arcoDonut(cx, cy, r, rInner, mid, endAngle);
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    'M', start.x, start.y,
    'A', r, r, 0, large, 0, end.x, end.y,
    'L', endInner.x, endInner.y,
    'A', rInner, rInner, 0, large, 1, startInner.x, startInner.y,
    'Z'
  ].join(' ');
}

function renderDonut(containerId, segmentos, centroLabel, centroValor) {
  const el = document.getElementById(containerId);
  const total = segmentos.reduce(function(s, p) { return s + p.valor; }, 0);
  if (!total) {
    el.innerHTML = '<p class="empty" style="padding:16px">Sem dados neste mês.</p>';
    return;
  }
  const cx = 100, cy = 100, r = 78, rInner = 48;
  let ang = 0;
  const paths = segmentos.filter(function(p) { return p.valor > 0; }).map(function(p) {
    const fatia = (p.valor / total) * 360;
    const d = arcoDonut(cx, cy, r, rInner, ang, ang + fatia);
    ang += fatia;
    return '<path d="' + d + '" fill="' + p.cor + '"></path>';
  }).join('');
  const legend = segmentos.filter(function(p) { return p.valor > 0; }).map(function(p) {
    const pct = ((p.valor / total) * 100).toFixed(0);
    return '<span class="legend-item"><span class="legend-dot" style="background:' + p.cor + '"></span>' +
      esc(p.label) + ' · ' + formatarMoeda(p.valor) + ' (' + pct + '%)</span>';
  }).join('');
  el.innerHTML =
    '<svg class="chart-svg" viewBox="0 0 200 200" role="img" aria-label="' + esc(centroLabel) + '">' +
    paths +
    '<text x="100" y="94" text-anchor="middle" fill="currentColor" font-size="11" font-weight="600" opacity="0.7">' + esc(centroLabel) + '</text>' +
    '<text x="100" y="114" text-anchor="middle" fill="currentColor" font-size="13" font-weight="800">' + esc(centroValor) + '</text>' +
    '</svg>' +
    '<div class="chart-legend">' + legend + '</div>';
}

function renderBarrasAno(containerId, entradas, despesas) {
  const el = document.getElementById(containerId);
  const max = Math.max.apply(null, entradas.concat(despesas).concat([1]));
  const w = 360, h = 180, padL = 28, padR = 8, padT = 16, padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const groupW = chartW / 12;
  const barW = Math.max(3, groupW * 0.32);
  let bars = '';
  for (let i = 0; i < 12; i++) {
    const x0 = padL + i * groupW + groupW * 0.15;
    const hEnt = (entradas[i] / max) * chartH;
    const hDes = (despesas[i] / max) * chartH;
    const yEnt = padT + chartH - hEnt;
    const yDes = padT + chartH - hDes;
    bars += '<rect x="' + x0 + '" y="' + yEnt + '" width="' + barW + '" height="' + Math.max(hEnt, 0) + '" rx="2" fill="#16a34a"></rect>';
    bars += '<rect x="' + (x0 + barW + 2) + '" y="' + yDes + '" width="' + barW + '" height="' + Math.max(hDes, 0) + '" rx="2" fill="#ef4444"></rect>';
    bars += '<text x="' + (x0 + barW) + '" y="' + (h - 8) + '" text-anchor="middle" fill="currentColor" font-size="9" opacity="0.7">' + MESES_CURTO[i] + '</text>';
  }
  const linha = '<line x1="' + padL + '" y1="' + (padT + chartH) + '" x2="' + (w - padR) + '" y2="' + (padT + chartH) + '" stroke="currentColor" opacity="0.2"/>';
  el.innerHTML =
    '<svg class="chart-svg barras" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Entrada versus despesa no ano">' +
    linha + bars +
    '</svg>' +
    '<div class="chart-legend">' +
    '<span class="legend-item"><span class="legend-dot" style="background:#16a34a"></span>Entradas</span>' +
    '<span class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>Despesas</span>' +
    '</div>';
}

function despesasPorCategoria() {
  const mapa = {};
  state.contas.forEach(function(c) {
    if (!contaAtivaNoMes(c, anoAtual, mesAtual)) return;
    const cat = c.categoria || 'Outros';
    mapa[cat] = (mapa[cat] || 0) + contaValorMes(c, anoAtual, mesAtual);
  });
  return Object.keys(mapa).map(function(k) {
    return { label: k, valor: mapa[k], cor: coresCategoria(k) };
  }).sort(function(a, b) { return b.valor - a.valor; });
}

function renderResumo() {
  document.getElementById('anoResumoLabel').textContent = anoResumo;
  const labelTabela = document.getElementById('anoResumoLabelTabela');
  if (labelTabela) labelTabela.textContent = anoResumo;

  const totalEnt = totalEntradasMes(anoAtual, mesAtual);
  const totalDesp = totalDespesas();
  const saldo = totalEnt - totalDesp;
  const pago = totalPagoMes();
  const aPagar = Math.max(0, totalDesp - pago);

  document.getElementById('kpiEntradas').textContent = formatarMoeda(totalEnt);
  document.getElementById('kpiDespesas').textContent = formatarMoeda(totalDesp);
  const kpiSaldo = document.getElementById('kpiSaldo');
  kpiSaldo.textContent = formatarMoeda(saldo);
  kpiSaldo.style.color = saldo >= 0 ? 'var(--tipo-entrada)' : 'var(--tipo-saida)';

  renderDonut('chartPagoWrap', [
    { label: 'Pago', valor: pago, cor: '#2EC4B6' },
    { label: 'A pagar', valor: aPagar, cor: '#ef4444' }
  ], 'Despesas', formatarMoeda(totalDesp));

  renderDonut('chartCategoriaWrap', despesasPorCategoria(), 'Total', formatarMoeda(totalDesp));

  const ents = [];
  const desps = [];
  for (let m = 0; m < 12; m++) {
    ents.push(state.entradas.reduce(function(s, e) { return s + entradaValorMes(e, anoResumo, m); }, 0));
    desps.push(despesasDoMesResumo(anoResumo, m));
  }
  renderBarrasAno('chartBarrasWrap', ents, desps);

  const diag = document.getElementById('diagnosticoMes');
  let html = '';
  state.entradas.forEach(function(e) {
    const v = entradaValorMes(e, anoAtual, mesAtual);
    html += '<div class="diag-row">' +
      '<div class="diag-left"><span class="chip chip-entrada">' + esc(e.classe) + '</span><span class="chip">Entrada</span></div>' +
      '<strong>' + formatarMoeda(v) + '</strong></div>';
  });
  html += '<div class="diag-row">' +
    '<div class="diag-left"><span class="chip chip-saida">Despesas</span><span class="chip">Saída</span></div>' +
    '<strong>' + formatarMoeda(totalDesp) + '</strong></div>';
  html += '<div class="diag-row">' +
    '<div class="diag-left"><span class="chip chip-saldo">Receita</span><span class="chip">Saldo</span></div>' +
    '<strong class="' + (saldo >= 0 ? 'diff-pos' : 'diff-neg') + '">' + formatarMoeda(saldo) + '</strong></div>';
  diag.innerHTML = html;

  const head = document.getElementById('resumoAnoHead');
  const body = document.getElementById('resumoAnoBody');
  head.innerHTML = '<tr><th>Classe</th><th>Tipo</th>' +
    MESES_CURTO.map(function(m) { return '<th class="num">' + m + '</th>'; }).join('') +
    '<th class="num">Total</th></tr>';

  const linhas = [];
  state.entradas.forEach(function(e) {
    const vals = [];
    let tot = 0;
    for (let m = 0; m < 12; m++) {
      const v = entradaValorMes(e, anoResumo, m);
      vals.push(v);
      tot += v;
    }
    linhas.push({ classe: e.classe, tipo: 'Entrada', chip: 'chip-entrada', vals: vals, tot: tot });
  });

  const despVals = [];
  let despTot = 0;
  for (let m = 0; m < 12; m++) {
    const v = despesasDoMesResumo(anoResumo, m);
    despVals.push(v);
    despTot += v;
  }
  linhas.push({ classe: 'Despesas', tipo: 'Saída', chip: 'chip-saida', vals: despVals, tot: despTot });

  const recVals = [];
  let recTot = 0;
  for (let m = 0; m < 12; m++) {
    const entMes = state.entradas.reduce(function(s, e) { return s + entradaValorMes(e, anoResumo, m); }, 0);
    const r = entMes - despVals[m];
    const show = entMes !== 0 || despVals[m] !== 0;
    recVals.push(show ? r : null);
    if (show) recTot += r;
  }
  linhas.push({ classe: 'Receita', tipo: 'Saldo', chip: 'chip-saldo', vals: recVals, tot: recTot, isSaldo: true });

  body.innerHTML = linhas.map(function(l) {
    const cells = l.vals.map(function(v) {
      if (v === null) return '<td class="num">—</td>';
      const cls = l.isSaldo ? (v >= 0 ? 'diff-pos' : 'diff-neg') : '';
      return '<td class="num ' + cls + '">' + formatarMoeda(v) + '</td>';
    }).join('');
    const totCls = l.isSaldo ? (l.tot >= 0 ? 'diff-pos' : 'diff-neg') : '';
    return '<tr>' +
      '<td><span class="chip ' + l.chip + '">' + esc(l.classe) + '</span></td>' +
      '<td>' + esc(l.tipo) + '</td>' +
      cells +
      '<td class="num ' + totCls + '"><strong>' + formatarMoeda(l.tot) + '</strong></td>' +
      '</tr>';
  }).join('');
}
function atualizarTotais() {
  const pago = totalPagoMes();
  const desp = totalDespesas();
  const aPagar = Math.max(0, desp - pago);
  const ent = totalEntradasMes(anoAtual, mesAtual);
  const saldo = ent - desp;
  document.getElementById('totPago').textContent = formatarMoeda(pago);
  document.getElementById('totAPagar').textContent = formatarMoeda(aPagar);
  document.getElementById('totSaldo').textContent = formatarMoeda(saldo);
}

function renderTudo() {
  atualizarLabelMes();
  if (viewAtual === 'contas') renderContas();
  else if (viewAtual === 'fixas') renderFixas();
  else if (viewAtual === 'entradas') renderEntradas();
  else if (viewAtual === 'resumo') renderResumo();
  else renderAjustes();
  atualizarTotais();
  atualizarSinoVencimento();
}

