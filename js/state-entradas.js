function renderEntradas() {
  const list = document.getElementById('entradasList');
  const empty = document.getElementById('entradasEmpty');
  if (!state.entradas.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    atualizarTotais();
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = state.entradas.map(e => {
    const val = entradaValorMes(e, anoAtual, mesAtual);
    const diaRec = entradaDiaRecebimento(e);
    return `<div class="entrada-row">
      <div><span class="chip chip-entrada">${esc(e.classe)}</span></div>
      <div>
        <div class="input-prefix">
          <span>R$</span>
          <input type="text" inputmode="numeric" value="${formatarMoedaInput(val)}" oninput="onInputMoeda(this)" onchange="atualizarValorEntrada('${e.id}', this.value)" aria-label="Valor" autocomplete="off">
        </div>
      </div>
      <div class="entrada-data">${diaRec != null ? 'Dia ' + diaRec : '—'}</div>
      <div class="conta-actions">
        <button class="btn btn-secondary btn-icon" type="button" onclick="abrirModalEntrada('${e.id}')" aria-label="Editar">✎</button>
        <button class="btn btn-danger btn-icon" type="button" onclick="excluirEntrada('${e.id}')" aria-label="Excluir">✕</button>
      </div>
    </div>`;
  }).join('');
  atualizarTotais();
}

function atualizarValorEntrada(id, valor) {
  const e = state.entradas.find(x => x.id === id);
  if (!e) return;
  const n = parseMoeda(valor);
  e.valor = n;
  if (!e.valoresMes) e.valoresMes = {};
  e.valoresMes[mesKeyAtual()] = n;
  salvar();
  renderEntradas();
  if (viewAtual === 'contas') renderContas();
}

function abrirModalEntrada(id) {
  document.getElementById('modalEntradaTitulo').textContent = id ? 'Editar entrada' : 'Nova entrada';
  document.getElementById('entradaId').value = id || '';
  if (id) {
    const e = state.entradas.find(x => x.id === id);
    if (!e) return;
    document.getElementById('eClasse').value = e.classe || '';
    setMoedaInput('eValor', entradaValorMes(e, anoAtual, mesAtual));
    document.getElementById('eDiaRecebimento').value = entradaDiaRecebimento(e) || '';
  } else {
    document.getElementById('eClasse').value = '';
    setMoedaInput('eValor', 0);
    document.getElementById('eDiaRecebimento').value = '';
  }
  sincronizarTodosSelects();
  document.getElementById('modalEntrada').classList.add('open');
}

function fecharModalEntrada() {
  document.getElementById('modalEntrada').classList.remove('open');
}

function salvarEntrada() {
  const classe = document.getElementById('eClasse').value.trim();
  if (!classe) {
    mostrarAlerta('Informe a classe da entrada.');
    return;
  }
  const id = document.getElementById('entradaId').value;
  const valor = getMoedaInput('eValor');
  let diaRecebimento = getInteiroInput('eDiaRecebimento', 0) || null;
  if (diaRecebimento != null) {
    if (diaRecebimento < 1 || diaRecebimento > 31) {
      mostrarAlerta('Informe um dia entre 1 e 31.');
      return;
    }
  }
  const key = mesKeyAtual();
  if (id) {
    const i = state.entradas.findIndex(e => e.id === id);
    if (i >= 0) {
      state.entradas[i].classe = classe;
      state.entradas[i].valor = valor;
      state.entradas[i].diaRecebimento = diaRecebimento;
      if (!state.entradas[i].valoresMes) state.entradas[i].valoresMes = {};
      state.entradas[i].valoresMes[key] = valor;
      delete state.entradas[i].datasRecebimentoMes;
    }
  } else {
    const valoresMes = {};
    valoresMes[key] = valor;
    state.entradas.push({ id: uid(), classe, valor, valoresMes, diaRecebimento });
  }
  salvar();
  fecharModalEntrada();
  renderEntradas();
}

function excluirEntrada(id) {
  mostrarConfirmacao('Excluir esta entrada?', () => {
    state.entradas = state.entradas.filter(e => e.id !== id);
    salvar();
    renderEntradas();
  });
}

