function ehParcelada(c) {
  if (!c) return false;
  if (c.tipo === 'parcelada') return true;
  if (c.tipo === 'recorrente' || c.tipo === 'cartao' || c.tipo === 'variavel') return false;
  return (Number(c.totalParcelas) || 0) > 0;
}

function ehVariavel(c) {
  return !!(c && (c.tipo === 'variavel' || c.tipo === 'cartao'));
}
function ehCartao(c) {
  return !!(c && c.tipo === 'cartao');
}

function contaValorMes(c, ano, mes) {
  if (!c) return 0;
  if (ehVariavel(c)) {
    const key = mesKey(ano, mes);
    if (c.valoresMes && c.valoresMes[key] != null && c.valoresMes[key] !== '') {
      return Number(c.valoresMes[key]) || 0;
    }
    // Cartão: fatura só conta se cadastrada naquele mês (não herda o valor anterior)
    if (ehCartao(c)) return 0;
    if (key === mesKeyAtual()) return Number(c.valor) || 0;
    return 0;
  }
  return Number(c.valor) || 0;
}

function variavelTemValorNoMes(c, ano, mes) {
  if (!ehVariavel(c)) return false;
  const key = mesKey(ano, mes);
  if (c.valoresMes && Object.prototype.hasOwnProperty.call(c.valoresMes, key)) return true;
  // Conta fixa pode usar o último valor no mês atual; cartão não
  if (ehCartao(c)) return false;
  return key === mesKeyAtual() && (Number(c.valor) || 0) > 0;
}

function faltaParcelas(c) {
  if (!ehParcelada(c)) return 0;
  const total = Number(c.totalParcelas) || 0;
  const pagas = Number(c.parcelasPagas) || 0;
  return Math.max(0, total - pagas);
}

function totalDividaCalc(c) {
  if (!ehParcelada(c)) return 0;
  if (c.totalDivida != null && c.totalDivida !== '' && !isNaN(Number(c.totalDivida))) return Number(c.totalDivida);
  const total = Number(c.totalParcelas) || 0;
  const valor = Number(c.valor) || 0;
  return total > 0 ? total * valor : 0;
}

function faltaQuitarCalc(c) {
  if (!ehParcelada(c)) return 0;
  if (c.faltaQuitar != null && c.faltaQuitar !== '' && !isNaN(Number(c.faltaQuitar))) {
    return Math.max(0, Number(c.faltaQuitar));
  }
  return faltaParcelas(c) * (Number(c.valor) || 0);
}

function economiaTotal(c) {
  if (!c || !Array.isArray(c.pagamentos)) return 0;
  return c.pagamentos.reduce(function(s, p) { return s + (Number(p.economia) || 0); }, 0);
}

/** Converte YYYY-MM-DD (ou YYYY-MM) em { ano, mes } (mês 0–11). */
function mesDeDataISO(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]) - 1 };
}

function deslocarMes(ano, mes, delta) {
  const d = new Date(ano, mes + delta, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

/**
 * Parcelada só aparece entre o mês de dataInicio e
 * (dataInicio + totalParcelas − 1). Ex.: início jan + 6x → some em jul.
 * Recorrente sempre ativa. Sem dataInicio: some quando quitar todas.
 */
function contaAtivaNoMes(c, ano, mes) {
  if (!c) return false;
  if (ehVariavel(c)) return variavelTemValorNoMes(c, ano, mes);
  if (!ehParcelada(c)) return true;
  const total = Math.max(1, Number(c.totalParcelas) || 1);
  const ini = mesDeDataISO(c.dataInicio);
  if (!ini) return faltaParcelas(c) > 0;
  const fim = deslocarMes(ini.ano, ini.mes, total - 1);
  const key = mesKey(ano, mes);
  return key >= mesKey(ini.ano, ini.mes) && key <= mesKey(fim.ano, fim.mes);
}

function isPago(contaId) {
  const mapa = state.pagosPorMes[mesKeyAtual()] || {};
  return !!mapa[contaId];
}

function marcarPagoMes(contaId, pago) {
  const key = mesKeyAtual();
  if (!state.pagosPorMes[key]) state.pagosPorMes[key] = {};
  if (pago) state.pagosPorMes[key][contaId] = true;
  else delete state.pagosPorMes[key][contaId];
}

function setPago(contaId, pago) {
  const c = state.contas.find(function(x) { return x.id === contaId; });
  if (!c) return;
  if (pago) {
    if (ehParcelada(c)) {
      // reverte o check visual até confirmar no modal
      renderContas();
      abrirModalPagamento(contaId, 'parcela');
      return;
    }
    marcarPagoMes(contaId, true);
    salvar();
    renderTudo();
    return;
  }
  if (ehParcelada(c)) {
    mostrarConfirmacao('Desmarcar remove o pagamento deste mês e devolve as parcelas quitadas nele. Continuar?', function() {
      desfazerPagamentosDoMes(c);
      marcarPagoMes(contaId, false);
      salvar();
      renderTudo();
    });
    renderContas(); // mantém check até confirmar
    return;
  }
  marcarPagoMes(contaId, false);
  salvar();
  renderTudo();
}

/** Desfaz lançamentos de pagamento da conta no mês atual (parcelada). */
function desfazerPagamentosDoMes(c) {
  if (!c || !ehParcelada(c) || !Array.isArray(c.pagamentos)) return;
  const key = mesKeyAtual();
  const doMes = c.pagamentos.filter(function(p) { return p.mes === key; });
  if (!doMes.length) return;
  let parcelas = 0;
  let valorPago = 0;
  doMes.forEach(function(p) {
    parcelas += Number(p.parcelas) || 0;
    valorPago += Number(p.valorPago) || 0;
  });
  c.pagamentos = c.pagamentos.filter(function(p) { return p.mes !== key; });
  c.parcelasPagas = Math.max(0, (Number(c.parcelasPagas) || 0) - parcelas);
  const total = Number(c.totalParcelas) || 0;
  if (c.parcelasPagas > total) c.parcelasPagas = total;
  const saldoAtual = (c.faltaQuitar != null && c.faltaQuitar !== '' && !isNaN(Number(c.faltaQuitar)))
    ? Number(c.faltaQuitar)
    : faltaParcelas(c) * (Number(c.valor) || 0);
  c.faltaQuitar = Math.max(0, saldoAtual + valorPago);
}

function alternarCamposTipoConta() {
  const tipo = document.getElementById('cTipo').value;
  document.getElementById('camposParcelada').style.display = tipo === 'parcelada' ? 'grid' : 'none';
  atualizarPreviewDivida();
}

function atualizarPreviewDivida() {
  const box = document.getElementById('previewDivida');
  if (!box) return;
  if (document.getElementById('cTipo').value !== 'parcelada') {
    box.textContent = '';
    return;
  }
  const valor = getMoedaInput('cValor');
  const totalP = getInteiroInput('cTotalParcelas', 0);
  const pagas = getInteiroInput('cParcelasPagas', 0);
  const falta = Math.max(0, totalP - pagas);
  const totalD = totalP * valor;
  const faltaQ = falta * valor;
  box.innerHTML = 'Total da dívida (automático): <strong>' + formatarMoeda(totalD) + '</strong><br>' +
    'Falta <strong>' + falta + '</strong> parcela(s) · Falta quitar ~ <strong>' + formatarMoeda(faltaQ) + '</strong>';
}

function abrirModalPagamento(contaId, tipoPadrao) {
  const c = state.contas.find(function(x) { return x.id === contaId; });
  if (!c || !ehParcelada(c)) return;
  document.getElementById('pagContaId').value = contaId;
  document.getElementById('pagContaNome').textContent =
    (c.descricao || 'Conta') + ' · ' + faltaParcelas(c) + ' parcela(s) em aberto · falta ' + formatarMoeda(faltaQuitarCalc(c));
  document.getElementById('pagTipo').value = tipoPadrao || 'parcela';
  setMoedaInput('pagValorPago', Number(c.valor) || 0);
  aoMudarTipoPagamento();
  sincronizarTodosSelects();
  document.getElementById('modalPagamento').classList.add('open');
}

function fecharModalPagamento() {
  document.getElementById('modalPagamento').classList.remove('open');
}

function aoMudarTipoPagamento() {
  const tipo = document.getElementById('pagTipo').value;
  const listaWrap = document.getElementById('pagListaWrap');
  const simples = document.getElementById('pagValorSimplesWrap');
  if (tipo === 'amortizacao') {
    listaWrap.style.display = 'block';
    simples.style.display = 'none';
    renderListaParcelasPendentes();
  } else {
    listaWrap.style.display = 'none';
    simples.style.display = 'block';
    document.getElementById('pagListaParcelas').innerHTML = '';
  }
  atualizarPreviewPagamento();
}

function renderListaParcelasPendentes() {
  const id = document.getElementById('pagContaId').value;
  const c = state.contas.find(function(x) { return x.id === id; });
  const box = document.getElementById('pagListaParcelas');
  if (!c || !box) return;
  const total = Number(c.totalParcelas) || 0;
  const pagas = Number(c.parcelasPagas) || 0;
  const valorPadrao = Number(c.valor) || 0;
  if (pagas >= total) {
    box.innerHTML = '<p class="empty" style="padding:12px">Não há parcelas pendentes.</p>';
    return;
  }
  let html = '';
  for (let n = pagas + 1; n <= total; n++) {
    html += '<div class="parcela-item" data-numero="' + n + '">' +
      '<div class="parcela-nome">Parcela ' + n + '<small>de ' + total + '</small></div>' +
      '<div class="input-prefix">' +
        '<span>R$</span>' +
        '<input type="text" class="pag-parcela-valor" inputmode="numeric" autocomplete="off" value="' + formatarMoedaInput(valorPadrao) + '" oninput="onInputMoeda(this); atualizarPreviewPagamento()">' +
      '</div>' +
      '<input class="check-pago pag-parcela-check" type="checkbox" aria-label="Pagar parcela ' + n + '" onchange="atualizarPreviewPagamento()">' +
    '</div>';
  }
  box.innerHTML = html;
}

function coletarParcelasSelecionadas() {
  const itens = [];
  const rows = document.querySelectorAll('#pagListaParcelas .parcela-item');
  rows.forEach(function(row) {
    const check = row.querySelector('.pag-parcela-check');
    const input = row.querySelector('.pag-parcela-valor');
    if (!check || !check.checked) return;
    const numero = Number(row.getAttribute('data-numero'));
    const valorPago = parseMoeda(input ? input.value : 0);
    itens.push({
      numero: numero,
      valorEsperado: null,
      valorPago: valorPago
    });
  });
  return itens;
}

function calcPreviewPagamento() {
  const id = document.getElementById('pagContaId').value;
  const c = state.contas.find(function(x) { return x.id === id; });
  if (!c) return null;
  const tipo = document.getElementById('pagTipo').value;
  const valorParcela = Number(c.valor) || 0;
  const falta = faltaParcelas(c);

  if (tipo === 'amortizacao') {
    const itens = coletarParcelasSelecionadas().map(function(it) {
      return {
        numero: it.numero,
        valorEsperado: valorParcela,
        valorPago: it.valorPago
      };
    });
    const qtd = itens.length;
    const esperado = qtd * valorParcela;
    const pago = itens.reduce(function(s, it) { return s + (Number(it.valorPago) || 0); }, 0);
    const economia = Math.max(0, esperado - pago);
    return { c: c, tipo: tipo, qtd: qtd, esperado: esperado, pago: pago, economia: economia, valorParcela: valorParcela, itens: itens };
  }

  let qtd = isPago(c.id) ? 0 : 1;
  if (qtd > falta) qtd = falta;
  const esperado = qtd * valorParcela;
  let pago = getMoedaInput('pagValorPago');
  if (!isFinite(pago)) pago = esperado;
  const economia = Math.max(0, esperado - pago);
  return {
    c: c,
    tipo: tipo,
    qtd: qtd,
    esperado: esperado,
    pago: pago,
    economia: economia,
    valorParcela: valorParcela,
    itens: qtd ? [{ numero: (Number(c.parcelasPagas) || 0) + 1, valorEsperado: valorParcela, valorPago: pago }] : []
  };
}

function atualizarPreviewPagamento() {
  const p = calcPreviewPagamento();
  if (!p) return;
  const box = document.getElementById('pagEconomiaBox');
  if (p.qtd <= 0) {
    box.innerHTML = p.tipo === 'amortizacao'
      ? 'Selecione ao menos uma parcela na lista.'
      : 'Nenhuma parcela pendente para registrar neste mês.';
    return;
  }
  box.innerHTML = 'Quitando <strong>' + p.qtd + '</strong> parcela(s) · Total pago <strong>' + formatarMoeda(p.pago) + '</strong>. ' +
    (p.economia > 0
      ? 'Economia: <strong class="diff-pos">' + formatarMoeda(p.economia) + '</strong>'
      : (p.pago > p.esperado
        ? 'Pago a mais: <strong class="diff-neg">' + formatarMoeda(p.pago - p.esperado) + '</strong>'
        : 'Sem economia nesta quitação.'));
}

function confirmarPagamento() {
  const p = calcPreviewPagamento();
  if (!p || p.qtd <= 0) {
    mostrarAlerta(p && p.tipo === 'amortizacao'
      ? 'Selecione ao menos uma parcela para pagar.'
      : 'Não há parcelas para quitar com essa configuração.');
    return;
  }
  const c = p.c;
  if (!Array.isArray(c.pagamentos)) c.pagamentos = [];
  c.pagamentos.push({
    id: uid(),
    mes: mesKeyAtual(),
    tipo: p.tipo,
    parcelas: p.qtd,
    valorEsperado: p.esperado,
    valorPago: p.pago,
    economia: p.economia,
    itens: p.itens || [],
    data: new Date().toISOString()
  });
  const saldoAntes = faltaQuitarCalc(c);
  c.parcelasPagas = (Number(c.parcelasPagas) || 0) + p.qtd;
  if (c.totalDivida == null || c.totalDivida === '') c.totalDivida = totalDividaCalc(c);
  c.faltaQuitar = Math.max(0, saldoAntes - p.pago);
  marcarPagoMes(c.id, true);
  salvar();
  fecharModalPagamento();
  renderTudo();
  if (p.economia > 0) {
    mostrarAlerta('Pagamento registrado. Você economizou ' + formatarMoeda(p.economia) + ' nesta amortização.');
  }
}
function diasNoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Dias até o vencimento no mês visualizado (negativo = atrasada). null se sem dia. */
function diasAteVencimento(c) {
  const dia = Number(c.diaVencimento);
  if (!dia || dia < 1) return null;
  const ultimo = diasNoMes(anoAtual, mesAtual);
  const diaEfetivo = Math.min(dia, ultimo);
  const hojeLocal = new Date();
  hojeLocal.setHours(0, 0, 0, 0);
  const venc = new Date(anoAtual, mesAtual, diaEfetivo);
  venc.setHours(0, 0, 0, 0);
  return Math.round((venc - hojeLocal) / 86400000);
}

function estaPertoVencimento(c) {
  if (isPago(c.id)) return false;
  const d = diasAteVencimento(c);
  if (d === null) return false;
  return d <= DIAS_ALERTA;
}

function contasAlertaVencimento() {
  return state.contas
    .filter(function(c) { return contaAtivaNoMes(c, anoAtual, mesAtual) && estaPertoVencimento(c); })
    .sort((a, b) => (diasAteVencimento(a) ?? 99) - (diasAteVencimento(b) ?? 99));
}

function atualizarSinoVencimento() {
  atualizarNavAvisos();
}

function atualizarNavAvisos() {
  const btn = document.getElementById('navBtnAvisos');
  if (!btn) return;
  const temVenc = contasAlertaVencimento().length > 0;
  const temUpdate = !!atualizacaoDisponivel;
  if (!temVenc && !temUpdate) {
    btn.style.display = 'none';
    btn.classList.remove('tem-vencimento', 'tem-atualizacao');
    return;
  }
  btn.style.display = '';
  btn.classList.toggle('tem-vencimento', temVenc);
  btn.classList.toggle('tem-atualizacao', temUpdate);
  const label = btn.querySelector('.nav-avisos-label');
  if (label) {
    if (temVenc && temUpdate) label.textContent = 'Avisos';
    else if (temUpdate) label.textContent = 'Atualizar';
    else label.textContent = 'Vencendo';
  }
}

function abrirAlertasVencimento() {
  abrirModalAvisos();
}

function abrirModalAvisos() {
  const lista = contasAlertaVencimento();
  const ul = document.getElementById('listaVencimentos');
  const updateBox = document.getElementById('avisosAtualizacaoBox');
  const titulo = document.getElementById('modalAvisosTitulo');
  if (titulo) titulo.textContent = 'Avisos';

  if (updateBox) {
    if (atualizacaoDisponivel) {
      updateBox.style.display = 'block';
      updateBox.innerHTML =
        '<p style="margin:0 0 10px"><strong>Nova versão disponível</strong></p>' +
        '<button class="btn btn-primary" type="button" onclick="fecharVencimentos(); clicarSinoAtualizacao()" style="width:100%">Ver novidades e atualizar</button>';
    } else {
      updateBox.style.display = 'none';
      updateBox.innerHTML = '';
    }
  }

  if (!lista.length) {
    ul.innerHTML = atualizacaoDisponivel
      ? '<li style="color:var(--muted)">Nenhuma conta perto do vencimento agora.</li>'
      : '<li>Nenhuma conta alerta no momento.</li>';
  } else {
    ul.innerHTML = lista.map(c => {
      const d = diasAteVencimento(c);
      let txt;
      if (d < 0) txt = 'atrasada há ' + Math.abs(d) + ' dia(s)';
      else if (d === 0) txt = 'vence hoje';
      else txt = 'vence em ' + d + ' dia(s)';
      return '<li><strong>' + esc(c.descricao) + '</strong> — dia ' + (c.diaVencimento || '—') +
        ' · ' + formatarMoeda(contaValorMes(c, anoAtual, mesAtual)) + '<br><span style="color:var(--muted)">' + txt + '</span></li>';
    }).join('');
  }
  document.getElementById('modalVencimentos').classList.add('open');
}

function fecharVencimentos() {
  document.getElementById('modalVencimentos').classList.remove('open');
}


function renderFiltroCategorias() {
  const sel = document.getElementById('filtroCategoria');
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todas categorias</option>' +
    state.categorias.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  sel.value = atual;
  sincronizarTodosSelects();
}

function contasFiltradas() {
  const q = (document.getElementById('filtroContas').value || '').trim().toLowerCase();
  const cat = document.getElementById('filtroCategoria').value;
  const st = document.getElementById('filtroStatus').value;
  return state.contas
    .filter(c => {
      // Variáveis/cartões ficam só na aba Variáveis
      if (ehVariavel(c)) return false;
      if (!contaAtivaNoMes(c, anoAtual, mesAtual)) return false;
      if (q && !(c.descricao || '').toLowerCase().includes(q) && !(c.obs || '').toLowerCase().includes(q) && !(c.responsavel || '').toLowerCase().includes(q)) return false;
      if (cat && c.categoria !== cat) return false;
      if (st === 'pago' && !isPago(c.id)) return false;
      if (st === 'aberto' && isPago(c.id)) return false;
      if (st === 'vencendo' && !estaPertoVencimento(c)) return false;
      return true;
    })
    .sort((a, b) => (Number(a.diaVencimento) || 99) - (Number(b.diaVencimento) || 99));
}

function renderContas() {
  renderFiltroCategorias();
  const lista = contasFiltradas();
  const totalDesp = totalDespesas();
  const totalEnt = totalEntradasMes(anoAtual, mesAtual);
  const cards = document.getElementById('contasCards');
  const tbody = document.getElementById('contasTableBody');
  const empty = document.getElementById('contasEmpty');

  if (!lista.length) {
    cards.innerHTML = '';
    tbody.innerHTML = '';
    empty.style.display = 'block';
    empty.textContent = state.contas.some(function(c) { return !ehVariavel(c); })
      ? 'Nenhuma conta neste mês (ou com esses filtros).'
      : 'Nenhuma conta recorrente/parcelada. Toque em + Conta. Variáveis e cartões ficam na aba Variáveis.';
    atualizarTotais();
    atualizarSinoVencimento();
    return;
  }
  empty.style.display = 'none';

  cards.innerHTML = lista.map(function(c) {
    const pago = isPago(c.id);
    const alerta = estaPertoVencimento(c);
    const parcelada = ehParcelada(c);
    const variavel = ehVariavel(c);
    const valMes = contaValorMes(c, anoAtual, mesAtual);
    const pctContas = totalDesp ? valMes / totalDesp : 0;
    const pctEnt = totalEnt ? valMes / totalEnt : 0;
    const d = diasAteVencimento(c);
    const chipAlerta = alerta
      ? '<span class="chip chip-alerta">' + (d < 0 ? 'Atrasada' : (d === 0 ? 'Vence hoje' : d + ' dia(s)')) + '</span>'
      : '';
    const chipTipo = c.tipo === 'cartao'
      ? '<span class="chip chip-cartao">Cartão</span>'
      : (variavel
        ? '<span class="chip chip-fixa">Fixa</span>'
        : (parcelada
          ? '<span class="chip chip-dividas">Parcelada</span>'
          : '<span class="chip">Recorrente</span>'));
    const econ = economiaTotal(c);
    const detalhes = parcelada
      ? ('<div class="detail-item"><span>Início</span><strong>' + formatarDataBR(c.dataInicio) + '</strong></div>' +
         '<div class="detail-item"><span>Parcelas</span><strong>' + (c.parcelasPagas || 0) + ' / ' + (c.totalParcelas || 0) + ' (falta ' + faltaParcelas(c) + ')</strong></div>' +
         '<div class="detail-item"><span>Falta quitar</span><strong>' + formatarMoeda(faltaQuitarCalc(c)) + '</strong></div>' +
         '<div class="detail-item"><span>Total dívida</span><strong>' + formatarMoeda(totalDividaCalc(c)) + '</strong></div>' +
         '<div class="detail-item"><span>Economia acumulada</span><strong class="diff-pos">' + formatarMoeda(econ) + '</strong></div>')
      : (c.tipo === 'cartao'
        ? ('<div class="detail-item"><span>Tipo</span><strong>Cartão de crédito</strong></div>' +
           '<div class="detail-item"><span>Fechamento</span><strong>Dia ' + (c.diaFechamento || '—') + '</strong></div>' +
           '<div class="detail-item"><span>Vencimento</span><strong>Dia ' + (c.diaVencimento || '—') + '</strong></div>' +
           '<div class="detail-item"><span>Limite</span><strong>' + (c.limite != null ? formatarMoeda(c.limite) : '—') + '</strong></div>')
        : (variavel
          ? '<div class="detail-item"><span>Tipo</span><strong>Conta fixa (valor variável por mês)</strong></div>'
          : '<div class="detail-item"><span>Tipo</span><strong>Conta recorrente (sem parcelas)</strong></div>'));
    const btnAmort = parcelada
      ? '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalPagamento(\'' + c.id + '\',\'amortizacao\')" aria-label="Amortizar" title="Amortizar">$</button>'
      : '';
    const btnEditar = variavel
      ? '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalFixa(\'' + c.id + '\')" aria-label="Editar">✎</button>'
      : '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalConta(\'' + c.id + '\')" aria-label="Editar">✎</button>';
    return '<article class="conta-card ' + (pago ? 'pago' : '') + ' ' + (alerta ? 'alerta-vencimento' : '') + '" id="card-' + c.id + '">' +
      '<div class="conta-card-top">' +
        '<input class="check-pago" type="checkbox" ' + (pago ? 'checked' : '') + ' onchange="setPago(\'' + c.id + '\', this.checked)" aria-label="Pago">' +
        '<div class="conta-main" onclick="toggleExpand(\'' + c.id + '\')">' +
          '<div class="conta-titulo">' + esc(c.descricao || 'Sem descrição') + '</div>' +
          (function() {
            const parts = [];
            if (c.responsavel) parts.push(esc(c.responsavel));
            if (c.obs) parts.push(esc(c.obs));
            return parts.length ? '<div class="cartao-meta">' + parts.join(' · ') + '</div>' : '';
          })() +
          '<div class="conta-meta">' +
            (c.tipo === 'cartao' && c.diaFechamento
              ? '<span class="chip">Fecha ' + c.diaFechamento + '</span>'
              : '') +
            '<span class="chip">Dia ' + (c.diaVencimento || '—') + '</span>' +
            '<span class="chip ' + chipCategoriaClass(c.categoria) + '">' + esc(c.categoria || '—') + '</span>' +
            (c.responsavel ? '<span class="chip">' + esc(c.responsavel) + '</span>' : '') +
            chipTipo + chipAlerta +
          '</div>' +
        '</div>' +
        '<div class="conta-valor">' + formatarMoeda(valMes) + '</div>' +
        '<div class="conta-actions">' +
          btnAmort +
          btnEditar +
          '<button class="btn btn-danger btn-icon" type="button" onclick="excluirConta(\'' + c.id + '\')" aria-label="Excluir">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="conta-details">' +
        '<div class="detail-item"><span>Responsável</span><strong>' + esc(c.responsavel || '—') + '</strong></div>' +
        '<div class="detail-item"><span>Obs</span><strong>' + esc(c.obs || '—') + '</strong></div>' +
        detalhes +
        '<div class="detail-item"><span>% contas / % entrada</span><strong>' + formatarPct(pctContas) + ' / ' + formatarPct(pctEnt) + '</strong></div>' +
      '</div>' +
    '</article>';
  }).join('');

  tbody.innerHTML = lista.map(function(c) {
    const pago = isPago(c.id);
    const alerta = estaPertoVencimento(c);
    const parcelada = ehParcelada(c);
    const variavel = ehVariavel(c);
    const valMes = contaValorMes(c, anoAtual, mesAtual);
    const pctContas = totalDesp ? valMes / totalDesp : 0;
    const pctEnt = totalEnt ? valMes / totalEnt : 0;
    const btnAmort = parcelada
      ? '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalPagamento(\'' + c.id + '\',\'amortizacao\')" title="Amortizar">$</button>'
      : '';
    const btnEditar = variavel
      ? '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalFixa(\'' + c.id + '\')">✎</button>'
      : '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalConta(\'' + c.id + '\')">✎</button>';
    return '<tr class="' + (pago ? 'pago' : '') + ' ' + (alerta ? 'alerta-vencimento' : '') + '">' +
      '<td class="center"><input type="checkbox" class="check-pago" ' + (pago ? 'checked' : '') + ' onchange="setPago(\'' + c.id + '\', this.checked)"></td>' +
      '<td class="center">' + (c.diaVencimento || '—') + '</td>' +
      '<td>' + esc(c.descricao || '') + '</td>' +
      '<td>' + esc(c.responsavel || '—') + '</td>' +
      '<td>' + esc(c.obs || '') + '</td>' +
      '<td><span class="chip ' + chipCategoriaClass(c.categoria) + '">' + esc(c.categoria || '—') + '</span></td>' +
      '<td>' + (parcelada ? formatarDataBR(c.dataInicio) : '—') + '</td>' +
      '<td class="center">' + (parcelada ? (c.parcelasPagas || 0) : '—') + '</td>' +
      '<td class="center">' + (parcelada ? faltaParcelas(c) : '—') + '</td>' +
      '<td class="center">' + (parcelada ? (c.totalParcelas || 0) : '—') + '</td>' +
      '<td class="num">' + formatarMoeda(valMes) + '</td>' +
      '<td class="num">' + (parcelada ? formatarMoeda(faltaQuitarCalc(c)) : '—') + '</td>' +
      '<td class="num">' + (parcelada ? formatarMoeda(totalDividaCalc(c)) : '—') + '</td>' +
      '<td class="num">' + formatarPct(pctContas) + '</td>' +
      '<td class="num">' + formatarPct(pctEnt) + '</td>' +
      '<td>' + btnAmort + btnEditar +
        '<button class="btn btn-danger btn-icon" type="button" onclick="excluirConta(\'' + c.id + '\')">✕</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  atualizarTotais();
  atualizarSinoVencimento();
}
function toggleExpand(id) {
  const el = document.getElementById('card-' + id);
  if (el) el.classList.toggle('expanded');
}

function preencherSelectCategorias(selected) {
  const sel = document.getElementById('cCategoria');
  sel.innerHTML = state.categorias.map(c =>
    `<option value="${esc(c)}" ${c === selected ? 'selected' : ''}>${esc(c)}</option>`
  ).join('');
  sincronizarTodosSelects();
}

function abrirModalConta(id) {
  if (id) {
    const existente = state.contas.find(function(x) { return x.id === id; });
    if (existente && ehVariavel(existente)) {
      abrirModalFixa(id);
      return;
    }
  }
  preencherSelectCategorias();
  document.getElementById('modalContaTitulo').textContent = id ? 'Editar conta' : 'Nova conta';
  document.getElementById('contaId').value = id || '';
  if (id) {
    const c = state.contas.find(function(x) { return x.id === id; });
    if (!c) return;
    document.getElementById('cTipo').value = ehParcelada(c) ? 'parcelada' : 'recorrente';
    document.getElementById('cDia').value = c.diaVencimento || '';
    document.getElementById('cDescricao').value = c.descricao || '';
    document.getElementById('cObs').value = c.obs || '';
    document.getElementById('cResponsavel').value = c.responsavel || '';
    document.getElementById('cCategoria').value = c.categoria || state.categorias[0];
    setMoedaInput('cValor', c.valor != null ? c.valor : 0);
    document.getElementById('cDataInicio').value = c.dataInicio || '';
    document.getElementById('cParcelasPagas').value = String(c.parcelasPagas || 0);
    document.getElementById('cTotalParcelas').value = String(c.totalParcelas || 1);
  } else {
    document.getElementById('cTipo').value = 'recorrente';
    document.getElementById('cDia').value = '';
    document.getElementById('cDescricao').value = '';
    document.getElementById('cObs').value = '';
    document.getElementById('cResponsavel').value = '';
    document.getElementById('cCategoria').value = state.categorias[0] || '';
    setMoedaInput('cValor', 0);
    document.getElementById('cDataInicio').value = '';
    document.getElementById('cParcelasPagas').value = '0';
    document.getElementById('cTotalParcelas').value = '1';
  }
  alternarCamposTipoConta();
  sincronizarTodosSelects();
  document.getElementById('modalConta').classList.add('open');
}

function fecharModalConta() {
  document.getElementById('modalConta').classList.remove('open');
}

function salvarConta() {
  const descricao = document.getElementById('cDescricao').value.trim();
  if (!descricao) {
    mostrarAlerta('Informe a descrição da conta.');
    return;
  }
  const id = document.getElementById('contaId').value;
  const tipo = document.getElementById('cTipo').value;
  const valor = getMoedaInput('cValor');
  const dados = {
    tipo: tipo,
    diaVencimento: getInteiroInput('cDia', 0) || null,
    descricao: descricao,
    obs: document.getElementById('cObs').value.trim(),
    responsavel: document.getElementById('cResponsavel').value.trim(),
    categoria: document.getElementById('cCategoria').value,
    valor: valor
  };
  if (tipo === 'parcelada') {
    const totalParcelas = Math.max(1, getInteiroInput('cTotalParcelas', 1));
    const parcelasPagas = Math.max(0, getInteiroInput('cParcelasPagas', 0));
    const totalDivida = totalParcelas * valor;
    const falta = Math.max(0, totalParcelas - parcelasPagas);
    dados.dataInicio = document.getElementById('cDataInicio').value || '';
    dados.totalParcelas = totalParcelas;
    dados.parcelasPagas = Math.min(parcelasPagas, totalParcelas);
    dados.totalDivida = totalDivida;
    dados.faltaQuitar = falta * valor;
    if (!id) dados.pagamentos = [];
  } else {
    dados.dataInicio = '';
    dados.totalParcelas = 0;
    dados.parcelasPagas = 0;
    dados.totalDivida = null;
    dados.faltaQuitar = null;
  }
  if (id) {
    const i = state.contas.findIndex(function(c) { return c.id === id; });
    if (i >= 0) {
      const prev = state.contas[i];
      state.contas[i] = Object.assign({}, prev, dados);
      if (tipo === 'parcelada' && !Array.isArray(state.contas[i].pagamentos)) {
        state.contas[i].pagamentos = prev.pagamentos || [];
      }
      if (tipo === 'recorrente') {
        delete state.contas[i].pagamentos;
      }
    }
  } else {
    state.contas.push(Object.assign({ id: uid() }, dados));
  }
  salvar();
  fecharModalConta();
  renderContas();
}
function excluirConta(id) {
  mostrarConfirmacao('Excluir esta conta?', () => {
    state.contas = state.contas.filter(c => c.id !== id);
    Object.keys(state.pagosPorMes).forEach(k => {
      if (state.pagosPorMes[k]) delete state.pagosPorMes[k][id];
    });
    salvar();
    renderContas();
    if (viewAtual === 'fixas') renderFixas();
  });
}

function listaFixas() {
  return state.contas.filter(ehVariavel).sort(function(a, b) {
    return (Number(a.diaVencimento) || 99) - (Number(b.diaVencimento) || 99);
  });
}

function renderFixas() {
  const list = document.getElementById('fixasList');
  const empty = document.getElementById('fixasEmpty');
  const fixas = listaFixas();
  if (!fixas.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    atualizarTotais();
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = fixas.map(function(c) {
    const valorMes = contaValorMes(c, anoAtual, mesAtual);
    const temValor = variavelTemValorNoMes(c, anoAtual, mesAtual);
    const ehCartaoTipo = ehCartao(c);
    const tipoLabel = ehCartaoTipo ? 'Cartão' : 'Mensal';
    const metaExtra = [];
    if (c.responsavel) metaExtra.push(esc(c.responsavel));
    if (c.categoria) metaExtra.push(esc(c.categoria));
    if (ehCartaoTipo && c.diaFechamento) metaExtra.push('fecha dia ' + c.diaFechamento);
    if (ehCartaoTipo && c.limite != null) metaExtra.push('limite ' + formatarMoeda(c.limite));
    if (!temValor) metaExtra.push(ehCartaoTipo ? 'sem fatura neste mês' : 'sem valor neste mês');
    return '<div class="fixa-row">' +
      '<div>' +
        '<div class="fixa-nome">' + esc(c.descricao || 'Conta') + '</div>' +
        '<div class="fixa-meta">' +
          tipoLabel +
          (metaExtra.length ? ' · ' + metaExtra.join(' · ') : '') +
        '</div>' +
      '</div>' +
      '<div>Dia ' + (c.diaVencimento || '—') + '</div>' +
      '<div>' +
        '<div class="input-prefix">' +
          '<span>R$</span>' +
          '<input type="text" inputmode="numeric" value="' + formatarMoedaInput(valorMes) + '" oninput="onInputMoeda(this)" onchange="atualizarValorFixa(\'' + c.id + '\', this.value)" aria-label="Valor do mês" autocomplete="off">' +
        '</div>' +
      '</div>' +
      '<div class="conta-actions">' +
        '<button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalFixa(\'' + c.id + '\')" aria-label="Editar">✎</button>' +
        '<button class="btn btn-danger btn-icon" type="button" onclick="excluirConta(\'' + c.id + '\')" aria-label="Excluir">✕</button>' +
      '</div>' +
    '</div>';
  }).join('');
  atualizarTotais();
}

function atualizarValorFixa(id, valor) {
  const c = state.contas.find(function(x) { return x.id === id; });
  if (!c || !ehVariavel(c)) return;
  const n = parseMoeda(valor);
  const key = mesKeyAtual();
  if (!c.valoresMes) c.valoresMes = {};
  c.valoresMes[key] = n;
  c.valor = n;
  salvar();
  renderFixas();
  atualizarTotais();
}

function preencherSelectCategoriasFixa(selected) {
  const sel = document.getElementById('fixaCategoria');
  const preferido = selected || state.categorias[0];
  sel.innerHTML = state.categorias.map(function(c) {
    return '<option value="' + esc(c) + '"' + (c === preferido ? ' selected' : '') + '>' + esc(c) + '</option>';
  }).join('');
  sincronizarTodosSelects();
}

function alternarCamposModalFixa(ehCartaoTipo) {
  document.getElementById('fixaCampoFechamento').style.display = ehCartaoTipo ? '' : 'none';
  document.getElementById('fixaCampoLimite').style.display = ehCartaoTipo ? '' : 'none';
  document.getElementById('fixaDicaCartao').style.display = ehCartaoTipo ? '' : 'none';
  document.getElementById('fixaValorLabel').textContent = ehCartaoTipo ? 'Fatura deste mês' : 'Valor deste mês';
}

function abrirModalFixa(id, tipoNovo) {
  const isEdit = !!id;
  let c = null;
  if (isEdit) {
    c = state.contas.find(function(x) { return x.id === id; });
    if (!c || !ehVariavel(c)) return;
  }
  const tipo = (c && c.tipo) || (tipoNovo === 'cartao' ? 'cartao' : 'variavel');
  const ehCartaoTipo = tipo === 'cartao';
  const catPadrao = ehCartaoTipo
    ? (state.categorias.indexOf('Dívidas') >= 0 ? 'Dívidas' : state.categorias[0])
    : (state.categorias.indexOf('Moradia') >= 0 ? 'Moradia' : state.categorias[0]);

  preencherSelectCategoriasFixa(c ? c.categoria : catPadrao);
  document.getElementById('fixaTipo').value = tipo;
  document.getElementById('modalFixaTitulo').textContent = isEdit
    ? (ehCartaoTipo ? 'Editar cartão' : 'Editar conta fixa')
    : (ehCartaoTipo ? 'Novo cartão' : 'Nova conta fixa');
  document.getElementById('fixaNomeLabel').textContent = ehCartaoTipo ? 'Nome do cartão' : 'Nome da conta';
  document.getElementById('fixaNome').placeholder = ehCartaoTipo
    ? 'Ex: Nubank, Inter, Itaú…'
    : 'Ex: Luz, Água, Gás…';
  document.getElementById('fixaId').value = id || '';
  alternarCamposModalFixa(ehCartaoTipo);

  if (c) {
    document.getElementById('fixaNome').value = c.descricao || '';
    document.getElementById('fixaDia').value = c.diaVencimento || '';
    document.getElementById('fixaDiaFechamento').value = c.diaFechamento || '';
    setMoedaInput('fixaLimite', c.limite != null ? c.limite : 0);
    setMoedaInput('fixaValor', contaValorMes(c, anoAtual, mesAtual));
    document.getElementById('fixaResponsavel').value = c.responsavel || '';
    document.getElementById('fixaCategoria').value = c.categoria || catPadrao;
    document.getElementById('fixaObs').value = c.obs || '';
  } else {
    document.getElementById('fixaNome').value = '';
    document.getElementById('fixaDia').value = '';
    document.getElementById('fixaDiaFechamento').value = '';
    setMoedaInput('fixaLimite', 0);
    setMoedaInput('fixaValor', 0);
    document.getElementById('fixaResponsavel').value = '';
    document.getElementById('fixaCategoria').value = catPadrao || '';
    document.getElementById('fixaObs').value = '';
  }
  sincronizarTodosSelects();
  document.getElementById('modalFixa').classList.add('open');
}

function fecharModalFixa() {
  document.getElementById('modalFixa').classList.remove('open');
}

function salvarFixa() {
  const tipo = document.getElementById('fixaTipo').value === 'cartao' ? 'cartao' : 'variavel';
  const nome = document.getElementById('fixaNome').value.trim();
  if (!nome) {
    mostrarAlerta(tipo === 'cartao' ? 'Informe o nome do cartão.' : 'Informe o nome da conta.');
    return;
  }
  const dia = getInteiroInput('fixaDia', 0) || null;
  if (!dia || dia < 1 || dia > 31) {
    mostrarAlerta('Informe o dia de vencimento (1–31).');
    return;
  }
  let diaFechamento = null;
  let limite = null;
  if (tipo === 'cartao') {
    diaFechamento = getInteiroInput('fixaDiaFechamento', 0) || null;
    if (!diaFechamento || diaFechamento < 1 || diaFechamento > 31) {
      mostrarAlerta('Informe o dia de fechamento (1–31).');
      return;
    }
    limite = getMoedaInput('fixaLimite');
    if (limite < 0) {
      mostrarAlerta('Informe um limite válido.');
      return;
    }
  }
  const valorMes = getMoedaInput('fixaValor');
  const id = document.getElementById('fixaId').value;
  const key = mesKeyAtual();
  const catPadrao = tipo === 'cartao' ? 'Dívidas' : 'Moradia';
  const dados = {
    tipo: tipo,
    descricao: nome,
    diaVencimento: dia,
    diaFechamento: tipo === 'cartao' ? diaFechamento : null,
    limite: tipo === 'cartao' ? limite : null,
    valor: valorMes,
    responsavel: document.getElementById('fixaResponsavel').value.trim(),
    categoria: document.getElementById('fixaCategoria').value || catPadrao,
    obs: document.getElementById('fixaObs').value.trim(),
    dataInicio: '',
    totalParcelas: 0,
    parcelasPagas: 0,
    totalDivida: null,
    faltaQuitar: null
  };
  if (id) {
    const i = state.contas.findIndex(function(c) { return c.id === id; });
    if (i >= 0) {
      const prev = state.contas[i];
      const valoresMes = (prev.valoresMes && typeof prev.valoresMes === 'object') ? { ...prev.valoresMes } : {};
      // Cartão: só grava fatura do mês se > 0 ou se já existia valor nesse mês
      if (tipo === 'cartao') {
        if (valorMes > 0 || Object.prototype.hasOwnProperty.call(valoresMes, key)) {
          valoresMes[key] = valorMes;
        }
      } else {
        valoresMes[key] = valorMes;
      }
      state.contas[i] = Object.assign({}, prev, dados, { valoresMes: valoresMes });
      delete state.contas[i].pagamentos;
    }
  } else {
    const valoresMes = {};
    // Cartão novo com fatura R$ 0: não marca o mês (evita herdar/aparecer sem fatura)
    if (tipo !== 'cartao' || valorMes > 0) {
      valoresMes[key] = valorMes;
    }
    state.contas.push(Object.assign({ id: uid(), valoresMes: valoresMes }, dados));
  }
  salvar();
  fecharModalFixa();
  renderFixas();
  atualizarTotais();
}

