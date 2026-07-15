function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function lerNotifHist() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_HIST_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function salvarNotifHist(hist) {
  try {
    localStorage.setItem(NOTIF_HIST_KEY, JSON.stringify(hist));
  } catch (e) {}
}

function chaveNotif(contaId, tipo) {
  return contaId + ':' + tipo + ':' + hojeISO();
}

function jaNotificouHoje(hist, contaId, tipo) {
  return !!hist[chaveNotif(contaId, tipo)];
}

function marcarNotificado(hist, contaId, tipo) {
  hist[chaveNotif(contaId, tipo)] = 1;
}

function limparNotifHistAntigo(hist) {
  const hoje = hojeISO();
  Object.keys(hist).forEach(function(k) {
    if (!k.endsWith(':' + hoje)) delete hist[k];
  });
}

function notifPermitidas() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function atualizarStatusNotificacoes() {
  const el = document.getElementById('statusNotif');
  const btn = document.getElementById('btnAtivarNotif');
  if (!el || !btn) return;
  if (typeof Notification === 'undefined') {
    el.textContent = 'Este navegador não suporta notificações.';
    btn.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    el.textContent = 'Notificações ativas. O app verifica vencimentos ao abrir e a cada hora com ele em uso — avisos não disparam com o app totalmente fechado.';
    btn.style.display = 'none';
  } else if (Notification.permission === 'denied') {
    el.textContent = 'Permissão bloqueada. Ative nas configurações do aparelho/navegador.';
    btn.textContent = 'Permissão bloqueada';
    btn.disabled = true;
  } else {
    el.textContent = 'Toque em Ativar para permitir avisos no aparelho. Funcionam melhor com o app aberto ou em segundo plano recente.';
    btn.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Ativar notificações';
  }
}

function ativarNotificacoes() {
  if (typeof Notification === 'undefined') {
    mostrarAlerta('Notificações não são suportadas neste navegador.');
    return;
  }
  if (ehIOS() && !appJaInstalado()) {
    mostrarAlerta('No iPhone, instale o app na Tela de Início e abra pelo ícone antes de ativar as notificações.');
    return;
  }
  Notification.requestPermission().then(function(perm) {
    atualizarStatusNotificacoes();
    if (perm === 'granted') {
      verificarNotificacoesVencimento(true);
      mostrarAlerta('Notificações ativadas. O app avisa contas perto do vencimento ou atrasadas ao abrir e enquanto estiver em uso. Com o app fechado, o celular pode não disparar o aviso.');
    } else if (perm === 'denied') {
      mostrarAlerta('Permissão negada. Você pode liberar depois nas configurações do aparelho.');
    }
  }).catch(function() {
    mostrarAlerta('Não foi possível pedir permissão de notificação.');
  });
}

function urlAbsolutaApp(caminho) {
  try {
    return new URL(caminho, window.location.href).href;
  } catch (e) {
    return caminho;
  }
}

function enviarNotificacaoDispositivo(titulo, corpo, tag) {
  if (!notifPermitidas()) return Promise.resolve();
  const opts = {
    body: corpo,
    icon: urlAbsolutaApp('icons/icon-192.png'),
    badge: urlAbsolutaApp('icons/badge-96.png'),
    tag: tag || ('mc-' + Date.now()),
    renotify: true,
    data: { url: urlAbsolutaApp('index.html') }
  };
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg && reg.showNotification) return reg.showNotification(titulo, opts);
      return new Notification(titulo, opts);
    }).catch(function() {
      try { new Notification(titulo, opts); } catch (e) {}
    });
  }
  try { new Notification(titulo, opts); } catch (e) {}
  return Promise.resolve();
}

function verificarNotificacoesVencimento(forcarResumo) {
  if (!notifPermitidas()) return;
  const lista = contasAlertaVencimento();
  if (!lista.length) return;

  const hist = lerNotifHist();
  limparNotifHistAntigo(hist);
  let enviou = false;
  const atrasadas = [];
  const proximas = [];

  lista.forEach(function(c) {
    const d = diasAteVencimento(c);
    if (d === null) return;
    const tipo = d < 0 ? 'atrasada' : 'proxima';
    if (jaNotificouHoje(hist, c.id, tipo)) return;
    marcarNotificado(hist, c.id, tipo);
    enviou = true;
    if (tipo === 'atrasada') atrasadas.push(c);
    else proximas.push(c);
  });

  if (!enviou && !forcarResumo) {
    salvarNotifHist(hist);
    return;
  }

  const promessas = [];
  atrasadas.forEach(function(c) {
    const d = Math.abs(diasAteVencimento(c));
    promessas.push(enviarNotificacaoDispositivo(
      'Conta atrasada',
      c.descricao + ' · ' + formatarMoeda(contaValorMes(c, anoAtual, mesAtual)) + ' · atrasada há ' + d + ' dia(s)',
      'atrasada-' + c.id
    ));
  });
  proximas.forEach(function(c) {
    const d = diasAteVencimento(c);
    let quando = d === 0 ? 'vence hoje' : 'vence em ' + d + ' dia(s)';
    promessas.push(enviarNotificacaoDispositivo(
      'Conta perto do vencimento',
      c.descricao + ' · ' + formatarMoeda(contaValorMes(c, anoAtual, mesAtual)) + ' · ' + quando,
      'proxima-' + c.id
    ));
  });

  if (forcarResumo && !enviou && lista.length) {
    const nAtr = lista.filter(function(c) { return diasAteVencimento(c) < 0; }).length;
    const nProx = lista.length - nAtr;
    let corpo = [];
    if (nAtr) corpo.push(nAtr + ' atrasada(s)');
    if (nProx) corpo.push(nProx + ' perto do vencimento');
    promessas.push(enviarNotificacaoDispositivo(
      'Minhas Contas',
      corpo.join(' · ') || 'Há contas para atenção',
      'resumo-' + hojeISO()
    ));
  }

  salvarNotifHist(hist);
  return Promise.all(promessas);
}


let atualizacaoDisponivel = false;
let atualizacaoSolicitadaPeloUsuario = false;
let modalAtualizacaoJaMostrado = false;
let modalAtualizacaoModo = 'atualizar'; // 'atualizar' | 'novidades'
let novidadesEmCache = null;

function marcarAtualizacaoDisponivel(abrirAviso) {
  atualizacaoDisponivel = true;
  if (typeof atualizarNavAvisos === 'function') atualizarNavAvisos();
  if (abrirAviso !== false && !modalAtualizacaoJaMostrado) {
    modalAtualizacaoJaMostrado = true;
    abrirModalAtualizacao();
  }
}

function aplicarAtualizacaoAgora() {
  if (!preservarDadosAntesDeAtualizar()) return;
  atualizacaoSolicitadaPeloUsuario = true;
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.getRegistration().then(function(reg) {
    if (reg && reg.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
    } else {
      window.location.reload();
    }
  }).catch(function() {
    window.location.reload();
  });
}

function carregarNovidades(forcar) {
  if (!forcar && novidadesEmCache) return Promise.resolve(novidadesEmCache);
  return fetch('novidades.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function(r) {
      if (!r.ok) throw new Error('fail');
      return r.json();
    })
    .then(function(data) {
      if (!data || !Array.isArray(data.itens)) throw new Error('invalid');
      novidadesEmCache = data;
      return data;
    })
    .catch(function() {
      return novidadesEmCache || NOVIDADES_LOCAL;
    });
}

function preencherListaNovidades(data) {
  const ul = document.getElementById('listaNovidades');
  const titulo = document.getElementById('atualizacaoTitulo');
  const versaoEl = document.getElementById('atualizacaoVersao');
  const btnOk = document.getElementById('btnConfirmarAtualizacao');
  const btnCancel = document.querySelector('#modalAtualizacao .btn-secondary');
  const avisoDados = document.getElementById('atualizacaoAvisoDados');

  titulo.textContent = data.titulo || (modalAtualizacaoModo === 'novidades' ? 'O que há de novo' : 'Nova atualização');
  versaoEl.textContent = data.versao ? ('Versão ' + data.versao) : '';
  ul.innerHTML = (data.itens || []).map(function(item) {
    return '<li>' + esc(item) + '</li>';
  }).join('') || '<li>Correções e melhorias.</li>';

  if (modalAtualizacaoModo === 'novidades') {
    btnOk.textContent = 'Entendi';
    if (btnCancel) btnCancel.style.display = 'none';
    if (avisoDados) avisoDados.style.display = 'none';
  } else {
    btnOk.textContent = 'Atualizar agora';
    if (btnCancel) btnCancel.style.display = '';
    if (avisoDados) avisoDados.style.display = '';
  }
}

function abrirModalAtualizacao() {
  modalAtualizacaoModo = 'atualizar';
  carregarNovidades(true).then(function(data) {
    preencherListaNovidades(data);
    document.getElementById('modalAtualizacao').classList.add('open');
  });
}

function mostrarNovidadesAposAtualizar() {
  let vista = null;
  try { vista = localStorage.getItem(VERSAO_VISTA_KEY); } catch (e) {}
  if (vista === APP_VERSION) return;
  try { localStorage.setItem(VERSAO_VISTA_KEY, APP_VERSION); } catch (e) {}
  if (!vista) return; // primeira instalação: não interrompe

  modalAtualizacaoModo = 'novidades';
  carregarNovidades().then(function(data) {
    // Prefere as notas da versão atual do app
    const notas = (data.versao === APP_VERSION) ? data : NOVIDADES_LOCAL;
    preencherListaNovidades(notas);
    document.getElementById('modalAtualizacao').classList.add('open');
  });
}

function fecharModalAtualizacao() {
  document.getElementById('modalAtualizacao').classList.remove('open');
}

function confirmarAtualizacaoDoModal() {
  if (modalAtualizacaoModo === 'novidades') {
    fecharModalAtualizacao();
    return;
  }
  fecharModalAtualizacao();
  aplicarAtualizacaoAgora();
}

function clicarSinoAtualizacao() {
  abrirModalAtualizacao();
}

function atualizarSistema() {
  if (!preservarDadosAntesDeAtualizar()) return;
  if (!('serviceWorker' in navigator)) {
    atualizacaoSolicitadaPeloUsuario = true;
    window.location.reload();
    return;
  }
  navigator.serviceWorker.getRegistration().then(function(reg) {
    if (!reg) {
      atualizacaoSolicitadaPeloUsuario = true;
      window.location.reload();
      return;
    }
    reg.update().finally(function() {
      if (reg.waiting) {
        marcarAtualizacaoDisponivel(false);
        abrirModalAtualizacao();
      } else {
        atualizacaoSolicitadaPeloUsuario = true;
        window.location.reload();
      }
    });
  });
}

function observarAtualizacaoSW(reg) {
  if (!reg) return;

  // Só avisa com o sininho + novidades — não atualiza sozinho
  if (reg.waiting && navigator.serviceWorker.controller) {
    marcarAtualizacaoDisponivel(true);
  }

  reg.addEventListener('updatefound', function() {
    const novoWorker = reg.installing;
    if (!novoWorker) return;
    novoWorker.addEventListener('statechange', function() {
      if (novoWorker.state === 'installed' && navigator.serviceWorker.controller) {
        marcarAtualizacaoDisponivel(true);
      }
    });
  });

  setInterval(function() {
    reg.update().catch(function() {});
  }, 30 * 60 * 1000);
}

function exibirVersaoApp() {
  const el = document.getElementById('appVersao');
  el.textContent = 'Versão: ' + APP_VERSION;
  if (!('caches' in window)) return;
  caches.keys().then(function(chaves) {
    const nomeCache = chaves.find(function(k) { return k.startsWith('minhas-contas-'); });
    if (nomeCache) el.textContent = 'Versão: ' + nomeCache.replace('minhas-contas-', '');
  }).catch(function() {});
}

function appJaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function atualizarBotaoInstalar() {
  const btn = document.getElementById('btnInstalar');
  if (!btn) return;
  if (appJaInstalado()) {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'block';
    btn.textContent = ehIOS() ? 'Instalar no iPhone' : 'Instalar app';
  }
}

function instalarApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function() {
      deferredPrompt = null;
      atualizarBotaoInstalar();
    });
  } else if (ehIOS()) {
    document.getElementById('modalInstalarIOS').classList.add('open');
  } else {
    mostrarAlerta('Use o menu do navegador e escolha "Instalar app" ou "Adicionar à tela de início".');
  }
}

function fecharModalInstalarIOS() {
  document.getElementById('modalInstalarIOS').classList.remove('open');
}

try {
  window.addEventListener('pagehide', function() { salvar(); });
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) salvar();
  });
} catch (e) {}

try {
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    atualizarBotaoInstalar();
  });
  window.addEventListener('appinstalled', function() {
    deferredPrompt = null;
    atualizarBotaoInstalar();
  });
} catch (e) {}

if (window.matchMedia) {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = function() {
      if ((localStorage.getItem('mc-tema') || 'sistema') === 'sistema') aplicarTemaResolvido();
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {}
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    // Só recarrega se o usuário pediu a instalação da atualização
    if (!atualizacaoSolicitadaPeloUsuario) return;
    window.location.reload();
  });

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js').then(function(reg) {
      observarAtualizacaoSW(reg);
      reg.update().catch(function() {});
    }).catch(function() {});
  });

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    verificarNotificacoesVencimento();
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (!reg) return;
      reg.update().then(function() {
        if (reg.waiting && navigator.serviceWorker.controller) {
          marcarAtualizacaoDisponivel(true);
        }
      }).catch(function() {});
    });
  });
}

