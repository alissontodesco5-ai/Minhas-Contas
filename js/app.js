function mostrarView(nome) {
  viewAtual = nome;
  ['contas', 'fixas', 'entradas', 'resumo', 'ajustes'].forEach(function(v) {
    document.getElementById('view' + v.charAt(0).toUpperCase() + v.slice(1)).classList.toggle('active', v === nome);
    document.getElementById('nav' + v.charAt(0).toUpperCase() + v.slice(1)).classList.toggle('active', v === nome);
  });
  const titles = { contas: 'Contas', fixas: 'Variáveis', entradas: 'Entradas', resumo: 'Resumo', ajustes: 'Ajustes' };
  document.getElementById('headerTitle').textContent = titles[nome] || 'Minhas Contas';
  document.getElementById('mesNav').style.display = (nome === 'ajustes') ? 'none' : 'flex';
  document.getElementById('totalsBar').hidden = (nome === 'ajustes');
  if (nome === 'resumo') { anoResumo = anoAtual; renderResumo(); }
  if (nome === 'entradas') renderEntradas();
  if (nome === 'fixas') renderFixas();
  if (nome === 'ajustes') {
    renderAjustes();
    atualizarStatusNotificacoes();
    atualizarBotaoInstalar();
  }
  if (nome === 'contas') renderContas();
  atualizarSinoVencimento();
  verificarNotificacoesVencimento();
}

function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
  if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
  salvar();
  atualizarLabelMes();
  renderTudo();
}

function mudarAno(delta) {
  anoResumo += delta;
  renderResumo();
}

function atualizarLabelMes() {
  const label = MESES[mesAtual].charAt(0).toUpperCase() + MESES[mesAtual].slice(1) + ' ' + anoAtual;
  document.getElementById('mesLabel').textContent = label;
}


try {
  if (!localStorage.getItem('mc-tema')) localStorage.setItem('mc-tema', 'sistema');
  aplicarTemaResolvido();
  definirTamanhoFonte(localStorage.getItem('mc-fonte') || 'medio', false);
  renderTemaButtons();
  iniciarControlesSistema();
  atualizarLabelMes();
  mostrarView('resumo');
  atualizarTotais();
  atualizarSinoVencimento();
  atualizarStatusNotificacoes();
  verificarNotificacoesVencimento();
  exibirVersaoApp();
  atualizarBotaoInstalar();
  mostrarNovidadesAposAtualizar();
  setTimeout(function() { lembrarExportarBackup(); }, 2800);
  setInterval(function() { verificarNotificacoesVencimento(); }, 60 * 60 * 1000);
} catch (err) {
  console.error('Erro ao iniciar Minhas Contas:', err);
}
