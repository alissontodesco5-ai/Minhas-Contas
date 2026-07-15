const APP_VERSION = 'v22'; // manter igual ao CACHE_NAME em service-worker.js (minhas-contas-v22)
const STORAGE_KEY = 'minhas-contas-v1';
const BACKUP_KEY = 'minhas-contas-backup';
const MIGRACAO_ENTRADAS_KEY = 'mc-migracao-entradas-v13';
const DEMO_SEED_KEY = 'mc-demo-seed-v1';
const NOTIF_HIST_KEY = 'mc-notif-hist';
const VERSAO_VISTA_KEY = 'mc-versao-vista';
const EXPORT_LEMBRETE_KEY = 'mc-ultimo-export';
const NOVIDADES_LOCAL = {
  versao: 'v22',
  titulo: 'Novidades da v22',
  itens: [
    'Desmarcar pago em parcelada desfaz o pagamento do mês',
    'Contas e Variáveis separados (sem duplicar na lista)',
    'Um único botão de Avisos na barra (vencimento + atualização)',
    'Lembrete para exportar backup; importação mais segura',
    'Início sem dados de exemplo automáticos'
  ]
};
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CATEGORIAS_PADRAO = ['Dívidas', 'Alimentação', 'Educação', 'Bem Estar', 'Moradia', 'Transporte', 'Lazer', 'Outros'];
const ENTRADAS_PADRAO = []; // cada usuário cadastra as próprias entradas
const TAMANHOS_FONTE = { pequeno: '87.5%', medio: '100%', grande: '112.5%' };
const DIAS_ALERTA = 3;

let state;
let viewAtual = 'resumo';
let deferredPrompt = null;
let confirmacaoCallback = null;
let anoAtual;
let mesAtual;
let anoResumo;
const hoje = new Date();

