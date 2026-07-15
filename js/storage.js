function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function mesKey(ano, mes) {
  return ano + '-' + String(mes + 1).padStart(2, '0');
}

function mesKeyAtual() {
  return mesKey(anoAtual, mesAtual);
}

function extrairDiaDeDataISO(iso) {
  const m = String(iso || '').match(/-(\d{1,2})$/);
  if (!m) return null;
  const d = Number(m[1]);
  return (d >= 1 && d <= 31) ? d : null;
}

function normalizarEntrada(e) {
  const valor = e.valor != null
    ? Number(e.valor) || 0
    : (Number(e.cenarioAtual) || 0);
  const valoresMes = e.valoresMes && typeof e.valoresMes === 'object' ? { ...e.valoresMes } : {};
  let diaRecebimento = e.diaRecebimento != null && e.diaRecebimento !== ''
    ? (Number(e.diaRecebimento) || null)
    : null;
  if (diaRecebimento != null) {
    diaRecebimento = Math.max(1, Math.min(31, Math.floor(diaRecebimento)));
  }
  // Migração: entradas antigas tinham data completa por mês
  if (!diaRecebimento && e.datasRecebimentoMes && typeof e.datasRecebimentoMes === 'object') {
    const vals = Object.values(e.datasRecebimentoMes);
    for (let i = 0; i < vals.length; i++) {
      const d = extrairDiaDeDataISO(vals[i]);
      if (d) { diaRecebimento = d; break; }
    }
  }
  return {
    id: e.id || uid(),
    classe: e.classe || 'Entrada',
    valor,
    valoresMes,
    diaRecebimento
  };
}

function dadosIniciais() {
  return {
    contas: [],
    entradas: [],
    categorias: CATEGORIAS_PADRAO.slice(),
    pagosPorMes: {},
    mesRef: mesKey(hoje.getFullYear(), hoje.getMonth())
  };
}

function dadosFicticios() {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const ref = mesKey(ano, mes);
  const mesAnt = mes === 0 ? mesKey(ano - 1, 11) : mesKey(ano, mes - 1);
  const mesAnt2 = mes <= 1
    ? mesKey(ano - 1, mes + 10)
    : mesKey(ano, mes - 2);
  const ids = {
    aluguel: 'demo-aluguel',
    luz: 'demo-luz',
    agua: 'demo-agua',
    internet: 'demo-internet',
    mercado: 'demo-mercado',
    academia: 'demo-academia',
    uber: 'demo-uber',
    streaming: 'demo-streaming',
    notebook: 'demo-notebook',
    sofa: 'demo-sofa'
  };
  return {
    categorias: CATEGORIAS_PADRAO.slice(),
    mesRef: ref,
    entradas: [
      {
        id: 'demo-ent-pagamento',
        classe: 'Pagamento',
        valor: 5200,
        valoresMes: { [mesAnt2]: 5000, [mesAnt]: 5100, [ref]: 5200 },
        diaRecebimento: 5
      },
      {
        id: 'demo-ent-vale',
        classe: 'Vale',
        valor: 900,
        valoresMes: { [mesAnt2]: 850, [mesAnt]: 900, [ref]: 900 },
        diaRecebimento: 15
      },
      {
        id: 'demo-ent-va',
        classe: 'VA',
        valor: 450,
        valoresMes: { [mesAnt2]: 450, [mesAnt]: 450, [ref]: 450 },
        diaRecebimento: 1
      }
    ],
    contas: [
      {
        id: ids.aluguel, tipo: 'recorrente', descricao: 'Aluguel', obs: 'Apt 302',
        responsavel: 'João', categoria: 'Moradia', valor: 1850, diaVencimento: 10,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.luz, tipo: 'recorrente', descricao: 'Luz (Enel)', obs: '',
        responsavel: 'João', categoria: 'Moradia', valor: 240, diaVencimento: 12,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.agua, tipo: 'recorrente', descricao: 'Água', obs: '',
        responsavel: 'Maria', categoria: 'Moradia', valor: 95, diaVencimento: 15,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.internet, tipo: 'recorrente', descricao: 'Internet fibra', obs: '600 Mega',
        responsavel: 'João', categoria: 'Moradia', valor: 129.9, diaVencimento: 8,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.mercado, tipo: 'recorrente', descricao: 'Mercado / feira', obs: 'Estimativa mensal',
        responsavel: 'Maria', categoria: 'Alimentação', valor: 900, diaVencimento: 5,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.academia, tipo: 'recorrente', descricao: 'Academia', obs: '',
        responsavel: 'João', categoria: 'Bem Estar', valor: 149.9, diaVencimento: 7,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.uber, tipo: 'recorrente', descricao: 'Transporte / apps', obs: '',
        responsavel: 'Maria', categoria: 'Transporte', valor: 350, diaVencimento: 28,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.streaming, tipo: 'recorrente', descricao: 'Streaming', obs: 'Netflix + Spotify',
        responsavel: 'João', categoria: 'Lazer', valor: 74.9, diaVencimento: 20,
        dataInicio: '', totalParcelas: 0, parcelasPagas: 0, totalDivida: null, faltaQuitar: null
      },
      {
        id: ids.notebook, tipo: 'parcelada', descricao: 'Notebook', obs: 'Parcelado no cartão',
        responsavel: 'João', categoria: 'Dívidas', valor: 349.9, diaVencimento: 10,
        dataInicio: ano + '-02-10', totalParcelas: 12, parcelasPagas: 5,
        totalDivida: 4198.8, faltaQuitar: 2449.3,
        pagamentos: [
          { mes: mesAnt2, valorPago: 349.9, economia: 0, data: new Date(ano, mes - 2, 10).toISOString() },
          { mes: mesAnt, valorPago: 349.9, economia: 0, data: new Date(ano, mes - 1, 10).toISOString() }
        ]
      },
      {
        id: ids.sofa, tipo: 'parcelada', descricao: 'Sofá sala', obs: '',
        responsavel: 'Maria', categoria: 'Dívidas', valor: 219.9, diaVencimento: 18,
        dataInicio: ano + '-04-18', totalParcelas: 10, parcelasPagas: 2,
        totalDivida: 2199, faltaQuitar: 1759.2,
        pagamentos: [
          { mes: mesAnt, valorPago: 219.9, economia: 0, data: new Date(ano, mes - 1, 18).toISOString() }
        ]
      }
    ],
    pagosPorMes: {
      [mesAnt]: Object.fromEntries(
        [ids.aluguel, ids.luz, ids.agua, ids.internet, ids.mercado, ids.academia, ids.streaming, ids.notebook, ids.sofa]
          .map(function(id) { return [id, true]; })
      ),
      [ref]: Object.fromEntries(
        [ids.aluguel, ids.internet, ids.mercado, ids.academia]
          .map(function(id) { return [id, true]; })
      )
    }
  };
}

function carregarDadosFicticios() {
  mostrarConfirmacao('Isso APAGA os dados atuais e carrega apenas exemplos fictícios para testar. Continuar?', function() {
    state = dadosFicticios();
    try { localStorage.setItem(DEMO_SEED_KEY, '1'); } catch (e) {}
    anoAtual = hoje.getFullYear();
    mesAtual = hoje.getMonth();
    anoResumo = anoAtual;
    salvar();
    atualizarLabelMes();
    renderTudo();
    mostrarAlerta('Exemplos carregados. Apague ou edite quando quiser usar seus dados reais.');
  });
}

function normalizarEstado(data) {
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.contas)) data.contas = [];
  else {
    data.contas = data.contas.map(function(c) {
      if (!c.tipo) {
        c.tipo = (Number(c.totalParcelas) || 0) > 0 ? 'parcelada' : 'recorrente';
      }
      if (c.tipo === 'parcelada' && !Array.isArray(c.pagamentos)) c.pagamentos = [];
      if ((c.tipo === 'cartao' || c.tipo === 'variavel') && (!c.valoresMes || typeof c.valoresMes !== 'object')) c.valoresMes = {};
      if (c.responsavel == null) c.responsavel = '';
      if (c.tipo === 'cartao') {
        if (c.diaFechamento != null && c.diaFechamento !== '') {
          const df = Number(c.diaFechamento);
          c.diaFechamento = (df >= 1 && df <= 31) ? Math.floor(df) : null;
        } else c.diaFechamento = null;
        c.limite = c.limite != null && c.limite !== '' ? (Number(c.limite) || 0) : null;
      }
      delete c.prioridade;
      return c;
    });
  }
  if (!Array.isArray(data.entradas)) data.entradas = [];
  else data.entradas = data.entradas.map(normalizarEntrada);
  if (!Array.isArray(data.categorias) || !data.categorias.length) data.categorias = CATEGORIAS_PADRAO.slice();
  if (!data.pagosPorMes || typeof data.pagosPorMes !== 'object') data.pagosPorMes = {};
  return data;
}

function lerStorageJson(chave) {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function estadoTemRegistros(data) {
  if (!data) return false;
  return (Array.isArray(data.contas) && data.contas.length > 0) ||
    (Array.isArray(data.entradas) && data.entradas.length > 0);
}

function gravarBackup(snapshot) {
  try {
    const texto = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
    localStorage.setItem(BACKUP_KEY, texto);
  } catch (err) {
    console.warn('Não foi possível gravar backup:', err);
  }
}

function carregar() {
  try {
    let data = lerStorageJson(STORAGE_KEY);
    if (!data) {
      const backup = lerStorageJson(BACKUP_KEY);
      if (backup) {
        data = backup;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(backup)); } catch (e) {}
      } else {
        localStorage.setItem(MIGRACAO_ENTRADAS_KEY, '1');
        localStorage.setItem(DEMO_SEED_KEY, '1');
        return dadosIniciais();
      }
    }

    data = normalizarEstado(data);
    if (!data) {
      const backup = normalizarEstado(lerStorageJson(BACKUP_KEY));
      if (backup) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(backup)); } catch (e) {}
        return backup;
      }
      localStorage.setItem(DEMO_SEED_KEY, '1');
      return dadosIniciais();
    }

    // v13: zera entradas uma única vez (já aplicado na maioria dos aparelhos)
    if (!localStorage.getItem(MIGRACAO_ENTRADAS_KEY)) {
      data.entradas = [];
      localStorage.setItem(MIGRACAO_ENTRADAS_KEY, '1');
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }

    // Só marca a flag — não força mais dados de exemplo sobre storage vazio
    if (!localStorage.getItem(DEMO_SEED_KEY)) {
      localStorage.setItem(DEMO_SEED_KEY, '1');
    }

    gravarBackup(data);
    return data;
  } catch (err) {
    const backup = normalizarEstado(lerStorageJson(BACKUP_KEY));
    if (backup) return backup;
    return dadosIniciais();
  }
}

function salvar() {
  try {
    state.mesRef = mesKeyAtual();
    const texto = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, texto);
    gravarBackup(texto);
    return true;
  } catch (err) {
    console.error('Erro ao salvar dados:', err);
    try { gravarBackup(state); } catch (e) {}
    return false;
  }
}

/** Garante persistência antes de recarregar o app (atualização). */
function preservarDadosAntesDeAtualizar() {
  const ok = salvar();
  const principal = localStorage.getItem(STORAGE_KEY);
  const backup = localStorage.getItem(BACKUP_KEY);
  if (!principal && backup) {
    try { localStorage.setItem(STORAGE_KEY, backup); } catch (e) {}
  }
  if (!localStorage.getItem(STORAGE_KEY) && estadoTemRegistros(state)) {
    mostrarAlerta('Não foi possível gravar seus dados neste aparelho. Libere espaço e tente atualizar de novo.');
    return false;
  }
  return ok || !!localStorage.getItem(STORAGE_KEY) || !!localStorage.getItem(BACKUP_KEY);
}

state = carregar();
anoAtual = state.mesRef ? Number(state.mesRef.split('-')[0]) : hoje.getFullYear();
mesAtual = state.mesRef ? Number(state.mesRef.split('-')[1]) - 1 : hoje.getMonth();
anoResumo = anoAtual;

