function renderAjustes() {
  renderTemaButtons();
  renderFontSizeButtons();
  exibirVersaoApp();
  const lista = document.getElementById('listaCategorias');
  lista.innerHTML = state.categorias.map(c => `
    <div class="diag-row">
      <span class="chip ${chipCategoriaClass(c)}">${esc(c)}</span>
      <button class="btn btn-danger btn-icon" type="button" data-cat="${esc(c)}" onclick="removerCategoria(this.getAttribute('data-cat'))" aria-label="Remover">✕</button>
    </div>
  `).join('');
  const hint = document.getElementById('backupExportHint');
  if (hint) {
    try {
      const raw = localStorage.getItem(EXPORT_LEMBRETE_KEY);
      if (!raw) hint.textContent = 'Ainda não houve export neste aparelho.';
      else {
        const d = new Date(Number(raw));
        hint.textContent = 'Último export: ' + d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      hint.textContent = '';
    }
  }
}

function adicionarCategoria() {
  const input = document.getElementById('novaCategoria');
  const nome = input.value.trim();
  if (!nome) return;
  if (state.categorias.includes(nome)) {
    mostrarAlerta('Categoria já existe.');
    return;
  }
  state.categorias.push(nome);
  input.value = '';
  salvar();
  renderAjustes();
  renderFiltroCategorias();
}

function removerCategoria(nome) {
  if (state.categorias.length <= 1) {
    mostrarAlerta('Mantenha pelo menos uma categoria.');
    return;
  }
  mostrarConfirmacao('Remover a categoria "' + nome + '"?', () => {
    state.categorias = state.categorias.filter(c => c !== nome);
    salvar();
    renderAjustes();
    renderFiltroCategorias();
  });
}


function aplicarTemaResolvido() {
  const pref = localStorage.getItem('mc-tema') || 'sistema';
  let tema = pref;
  if (pref === 'sistema') {
    tema = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', tema);
  document.getElementById('metaThemeColor').setAttribute('content', tema === 'light' ? '#d5f7f2' : '#1FA89B');
}

function definirTema(tema) {
  localStorage.setItem('mc-tema', tema);
  aplicarTemaResolvido();
  renderTemaButtons();
}

function renderTemaButtons() {
  const atual = localStorage.getItem('mc-tema') || 'sistema';
  document.querySelectorAll('#temaOptions .btn-font-size').forEach(b => {
    b.classList.toggle('active', b.dataset.tema === atual);
  });
}

function definirTamanhoFonte(tamanho, salvarPref) {
  if (salvarPref === undefined) salvarPref = true;
  document.documentElement.style.fontSize = TAMANHOS_FONTE[tamanho] || TAMANHOS_FONTE.medio;
  if (salvarPref) localStorage.setItem('mc-fonte', tamanho);
  renderFontSizeButtons();
}

function renderFontSizeButtons() {
  const atual = localStorage.getItem('mc-fonte') || 'medio';
  document.querySelectorAll('#fontSizeOptions .btn-font-size').forEach(b => {
    b.classList.toggle('active', b.dataset.tamanho === atual);
  });
}

function exportarDados() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'minhas-contas-backup-' + mesKeyAtual() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  try { localStorage.setItem(EXPORT_LEMBRETE_KEY, String(Date.now())); } catch (e) {}
  const hint = document.getElementById('backupExportHint');
  if (hint) hint.textContent = 'Último export: agora';
}

function importarDados(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('Formato inválido');
      mostrarConfirmacao('Importar substitui todos os dados atuais. Continuar?', () => {
        const normalizado = normalizarEstado({
          contas: data.contas || [],
          entradas: data.entradas || [],
          categorias: data.categorias,
          pagosPorMes: data.pagosPorMes || {},
          mesRef: data.mesRef || mesKeyAtual()
        });
        if (!normalizado) throw new Error('Formato inválido');
        state = normalizado;
        if (state.mesRef) {
          const p = state.mesRef.split('-');
          anoAtual = Number(p[0]);
          mesAtual = Number(p[1]) - 1;
        }
        try { localStorage.setItem(DEMO_SEED_KEY, '1'); } catch (e) {}
        salvar();
        renderTudo();
        mostrarAlerta('Dados importados com sucesso.');
      });
    } catch (err) {
      mostrarAlerta('Não foi possível importar o arquivo.');
    }
  };
  reader.readAsText(file);
}

function confirmarReset() {
  mostrarConfirmacao('Apagar TODOS os dados deste aparelho?', () => {
    state = dadosIniciais();
    try { localStorage.setItem(DEMO_SEED_KEY, '1'); } catch (e) {}
    salvar();
    renderTudo();
    mostrarAlerta('Dados apagados.');
  });
}

function lembrarExportarBackup() {
  try {
    const raw = localStorage.getItem(EXPORT_LEMBRETE_KEY);
    const agora = Date.now();
    const ultimo = raw ? Number(raw) : 0;
    const dias = 14;
    if (ultimo && (agora - ultimo) < dias * 86400000) return;
    if (!estadoTemRegistros(state)) return;
    const d = new Date();
    const dia = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const avisoHoje = localStorage.getItem('mc-export-aviso-dia');
    if (avisoHoje === dia) return;
    localStorage.setItem('mc-export-aviso-dia', dia);
    mostrarConfirmacao(
      'Há mais de ' + dias + ' dias sem exportar um backup. Quer baixar o JSON agora? Seus dados ficam só neste aparelho.',
      function() { exportarDados(); }
    );
  } catch (e) {}
}


function mostrarAlerta(mensagem) {
  document.getElementById('alertaMensagem').textContent = mensagem;
  document.getElementById('modalAlerta').classList.add('open');
}
function fecharAlerta() {
  document.getElementById('modalAlerta').classList.remove('open');
}
function mostrarConfirmacao(mensagem, callback) {
  document.getElementById('confirmacaoMensagem').textContent = mensagem;
  confirmacaoCallback = callback;
  document.getElementById('modalConfirmacao').classList.add('open');
}
function fecharConfirmacao() {
  confirmacaoCallback = null;
  document.getElementById('modalConfirmacao').classList.remove('open');
}
function executarConfirmacao() {
  const cb = confirmacaoCallback;
  fecharConfirmacao();
  if (cb) cb();
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* —— Controles do sistema (select/data/modal custom) —— */
let selectPickerAlvo = null;
let datePickerAlvo = null;
let datePickerAno = hoje.getFullYear();
let datePickerMes = hoje.getMonth();
const UI_CHEVRON = '<svg class="ui-select-chevron" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';

function iniciarControlesSistema() {
  document.querySelectorAll('select').forEach(aprimorarSelect);
  document.querySelectorAll('input[type="date"]').forEach(aprimorarDate);
}

function aprimorarSelect(sel) {
  if (!sel || sel.dataset.uiReady === '1') return;
  sel.dataset.uiReady = '1';
  const wrap = document.createElement('div');
  wrap.className = 'ui-select-wrap';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-select-trigger';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="ui-select-label"></span>' + UI_CHEVRON;
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(btn);
  wrap.appendChild(sel);
  btn.addEventListener('click', function() { abrirSelectPicker(sel); });
  sel.addEventListener('change', function() { atualizarTriggerSelect(sel); });
  atualizarTriggerSelect(sel);
}

function tituloDoCampo(el, fallback) {
  const bloco = el.closest('.full, .form-grid > div, .toolbar, div');
  if (bloco) {
    const lab = bloco.querySelector('label.field');
    if (lab && lab.textContent.trim()) return lab.textContent.trim();
  }
  if (el.id === 'filtroCategoria') return 'Categoria';
  if (el.id === 'filtroStatus') return 'Status';
  return fallback || 'Selecionar';
}

function atualizarTriggerSelect(sel) {
  const wrap = sel.closest('.ui-select-wrap');
  if (!wrap) return;
  const label = wrap.querySelector('.ui-select-label');
  if (!label) return;
  const opt = sel.options[sel.selectedIndex];
  const texto = opt ? opt.textContent : '';
  label.textContent = texto || 'Selecionar';
  label.classList.toggle('is-placeholder', !sel.value && (sel.id === 'filtroCategoria' || sel.id === 'filtroStatus'));
}

function sincronizarTodosSelects() {
  document.querySelectorAll('select[data-ui-ready="1"]').forEach(atualizarTriggerSelect);
  document.querySelectorAll('input[type="date"][data-ui-ready="1"]').forEach(atualizarTriggerDate);
}

function abrirSelectPicker(sel) {
  selectPickerAlvo = sel;
  const wrap = sel.closest('.ui-select-wrap');
  const btn = wrap && wrap.querySelector('.ui-select-trigger');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  document.getElementById('selectPickerTitulo').textContent = tituloDoCampo(sel, 'Selecionar');
  const lista = document.getElementById('selectPickerLista');
  lista.innerHTML = '';
  Array.from(sel.options).forEach(function(opt, idx) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'picker-option' + (opt.selected ? ' selected' : '');
    item.setAttribute('role', 'option');
    item.innerHTML = '<span>' + esc(opt.textContent) + '</span><span class="check">✓</span>';
    item.addEventListener('click', function() {
      sel.selectedIndex = idx;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      atualizarTriggerSelect(sel);
      fecharSelectPicker();
    });
    lista.appendChild(item);
  });
  document.getElementById('modalSelectPicker').classList.add('open');
}

function fecharSelectPicker() {
  document.getElementById('modalSelectPicker').classList.remove('open');
  if (selectPickerAlvo) {
    const wrap = selectPickerAlvo.closest('.ui-select-wrap');
    const btn = wrap && wrap.querySelector('.ui-select-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  selectPickerAlvo = null;
}

function aprimorarDate(inp) {
  if (!inp || inp.dataset.uiReady === '1') return;
  inp.dataset.uiReady = '1';
  const wrap = document.createElement('div');
  wrap.className = 'ui-select-wrap';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ui-select-trigger';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="ui-select-label"></span>' + UI_CHEVRON;
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(btn);
  wrap.appendChild(inp);
  btn.addEventListener('click', function() { abrirDatePicker(inp); });
  inp.addEventListener('change', function() { atualizarTriggerDate(inp); });
  atualizarTriggerDate(inp);
}

function formatarDataExibicao(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const p = iso.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function atualizarTriggerDate(inp) {
  const wrap = inp.closest('.ui-select-wrap');
  if (!wrap) return;
  const label = wrap.querySelector('.ui-select-label');
  if (!label) return;
  const texto = formatarDataExibicao(inp.value);
  label.textContent = texto || 'Escolher data';
  label.classList.toggle('is-placeholder', !texto);
}

function abrirDatePicker(inp) {
  datePickerAlvo = inp;
  const wrap = inp.closest('.ui-select-wrap');
  const btn = wrap && wrap.querySelector('.ui-select-trigger');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  document.getElementById('datePickerTitulo').textContent = tituloDoCampo(inp, 'Data');
  if (inp.value && /^\d{4}-\d{2}-\d{2}$/.test(inp.value)) {
    const p = inp.value.split('-');
    datePickerAno = Number(p[0]);
    datePickerMes = Number(p[1]) - 1;
  } else {
    datePickerAno = hoje.getFullYear();
    datePickerMes = hoje.getMonth();
  }
  renderDatePickerGrid();
  document.getElementById('modalDatePicker').classList.add('open');
}

function fecharDatePicker() {
  document.getElementById('modalDatePicker').classList.remove('open');
  if (datePickerAlvo) {
    const wrap = datePickerAlvo.closest('.ui-select-wrap');
    const btn = wrap && wrap.querySelector('.ui-select-trigger');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  datePickerAlvo = null;
}

function limparDatePicker() {
  if (!datePickerAlvo) return;
  datePickerAlvo.value = '';
  datePickerAlvo.dispatchEvent(new Event('change', { bubbles: true }));
  atualizarTriggerDate(datePickerAlvo);
  fecharDatePicker();
}

function mudarMesDatePicker(delta) {
  datePickerMes += delta;
  if (datePickerMes > 11) { datePickerMes = 0; datePickerAno++; }
  if (datePickerMes < 0) { datePickerMes = 11; datePickerAno--; }
  renderDatePickerGrid();
}

function escolherDataPicker(iso) {
  if (!datePickerAlvo) return;
  datePickerAlvo.value = iso;
  datePickerAlvo.dispatchEvent(new Event('change', { bubbles: true }));
  atualizarTriggerDate(datePickerAlvo);
  fecharDatePicker();
}

function renderDatePickerGrid() {
  const label = MESES[datePickerMes].charAt(0).toUpperCase() + MESES[datePickerMes].slice(1) + ' ' + datePickerAno;
  document.getElementById('datePickerMesLabel').textContent = label;
  const grid = document.getElementById('datePickerGrid');
  const primeiro = new Date(datePickerAno, datePickerMes, 1);
  const inicioSemana = primeiro.getDay();
  const diasNoMes = new Date(datePickerAno, datePickerMes + 1, 0).getDate();
  const selecionado = datePickerAlvo ? datePickerAlvo.value : '';
  const hojeIso = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  let html = '';
  for (let i = 0; i < inicioSemana; i++) {
    html += '<button type="button" class="date-cell" disabled aria-hidden="true"></button>';
  }
  for (let d = 1; d <= diasNoMes; d++) {
    const iso = datePickerAno + '-' + String(datePickerMes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    let cls = 'date-cell';
    if (iso === selecionado) cls += ' selected';
    if (iso === hojeIso) cls += ' hoje';
    html += '<button type="button" class="' + cls + '" onclick="escolherDataPicker(\'' + iso + '\')">' + d + '</button>';
  }
  grid.innerHTML = html;
}

