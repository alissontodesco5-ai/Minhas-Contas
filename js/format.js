function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarMoedaInput(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte texto tipo "1.234,56" ou digitos mascarados em número. */
function parseMoeda(str) {
  if (str == null || str === '') return 0;
  if (typeof str === 'number') return isFinite(str) ? str : 0;
  const s = String(str).trim();
  if (!s) return 0;
  // Se tem vírgula, trata como formato BR completo
  if (s.indexOf(',') >= 0) {
    const n = Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  // Só dígitos: máscara centavos (18281 -> 182,81)
  const digits = s.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

function onInputMoeda(el) {
  if (!el) return;
  const digits = String(el.value).replace(/\D/g, '');
  const n = digits ? Number(digits) / 100 : 0;
  el.value = formatarMoedaInput(n);
}

/** Inteiro só com dígitos, sem inverter a ordem no celular. */
function onInputInteiro(el) {
  if (!el) return;
  const pos = el.selectionStart;
  const antes = String(el.value);
  const digits = antes.replace(/\D/g, '');
  if (antes === digits) return;
  el.value = digits;
  const diff = antes.length - digits.length;
  const novoPos = Math.max(0, (pos == null ? digits.length : pos) - diff);
  try { el.setSelectionRange(novoPos, novoPos); } catch (e) {}
}

function getInteiroInput(id, padrao) {
  const el = document.getElementById(id);
  if (!el) return padrao || 0;
  const n = parseInt(String(el.value).replace(/\D/g, ''), 10);
  return isFinite(n) ? n : (padrao || 0);
}

function setMoedaInput(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = formatarMoedaInput(valor);
}

function getMoedaInput(id) {
  const el = document.getElementById(id);
  return el ? parseMoeda(el.value) : 0;
}

function formatarPct(valor) {
  if (!isFinite(valor)) return '—';
  return (valor * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function formatarDataBR(iso) {
  if (!iso) return '—';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return p[2] + '/' + p[1] + '/' + p[0];
}

function chipCategoriaClass(cat) {
  const map = {
    'Dívidas': 'chip-dividas',
    'Alimentação': 'chip-alimentacao',
    'Educação': 'chip-educacao',
    'Bem Estar': 'chip-bem-estar',
    'Moradia': 'chip-moradia'
  };
  return map[cat] || '';
}


function totalEntradasMes(ano, mes) {
  return state.entradas.reduce((s, e) => s + entradaValorMes(e, ano, mes), 0);
}

function totalDespesas(ano, mes) {
  if (ano == null) ano = anoAtual;
  if (mes == null) mes = mesAtual;
  return state.contas.reduce(function(s, c) {
    if (!contaAtivaNoMes(c, ano, mes)) return s;
    return s + contaValorMes(c, ano, mes);
  }, 0);
}

function totalPagoMes() {
  return state.contas.reduce(function(s, c) {
    if (!contaAtivaNoMes(c, anoAtual, mesAtual)) return s;
    if (!isPago(c.id)) return s;
    const key = mesKeyAtual();
    if (ehParcelada(c) && Array.isArray(c.pagamentos)) {
      const doMes = c.pagamentos.filter(function(p) { return p.mes === key; });
      if (doMes.length) {
        return s + doMes.reduce(function(a, p) { return a + (Number(p.valorPago) || 0); }, 0);
      }
    }
    return s + contaValorMes(c, anoAtual, mesAtual);
  }, 0);
}

function entradaValorMes(e, ano, mes) {
  const key = mesKey(ano, mes);
  if (e.valoresMes && e.valoresMes[key] != null && e.valoresMes[key] !== '') {
    return Number(e.valoresMes[key]) || 0;
  }
  if (key === mesKeyAtual()) return Number(e.valor) || 0;
  return 0;
}

function entradaDiaRecebimento(e) {
  const d = e && e.diaRecebimento != null ? Number(e.diaRecebimento) : NaN;
  return (d >= 1 && d <= 31) ? d : null;
}

function despesasDoMesResumo(ano, mes) {
  const key = mesKey(ano, mes);
  const temPagos = state.pagosPorMes[key] && Object.keys(state.pagosPorMes[key]).length > 0;
  const isPassadoOuAtual = (ano < anoAtual) || (ano === anoAtual && mes <= mesAtual);
  if (temPagos || isPassadoOuAtual) return totalDespesas(ano, mes);
  return 0;
}

