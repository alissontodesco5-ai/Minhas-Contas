# Minhas Contas

Controle de despesas pessoais, entradas e resumo mensal/anual. PWA estático (HTML/CSS/JS), no mesmo modelo da Lista de compras: funciona no celular e no PC, offline, sem login.

## Como usar pelo GitHub Pages

1. No repositório no GitHub: **Settings → Pages**
2. Em **Source**, escolha a branch `main` e a pasta `/` (root)
3. Salve e aguarde alguns minutos
4. Abra: `https://<seu-usuario>.github.io/Minhas-Contas/`

Também funciona abrindo o `index.html` localmente no navegador (o service worker exige HTTPS ou `localhost`).

## Recursos

- **Contas:** vencimento, descrição, obs, categoria, natureza, parcelas, valor, dívida, prioridade e checkbox **Pago** por mês
- **Entradas:** classes de receita com Cenário atual, Cenário 2 e diferença
- **Resumo:** diagnóstico do mês + tabela anual
- **Ajustes:** tema claro/escuro, cor, fonte, categorias, exportar/importar JSON, instalar app

Os dados ficam no **localStorage** do navegador. Use **Exportar JSON** para backup ou para levar os dados a outro aparelho.

## Estrutura

- `index.html` — interface e lógica
- `manifest.json` — PWA instalável
- `service-worker.js` — cache offline
- `icons/` — ícones do app
