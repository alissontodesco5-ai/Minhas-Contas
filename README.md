# Minhas Contas

Controle de despesas pessoais, entradas e resumo mensal/anual. PWA estático (HTML/CSS/JS), no mesmo modelo da Lista de compras: funciona no celular e no PC, offline, sem login.

## Como usar pelo GitHub Pages

1. No repositório no GitHub: **Settings → Pages**
2. Em **Source**, escolha a branch `main` e a pasta `/` (root)
3. Salve e aguarde alguns minutos
4. Abra: `https://<seu-usuario>.github.io/Minhas-Contas/`

Também funciona abrindo o `index.html` localmente no navegador (o service worker exige HTTPS ou `localhost`).

## Recursos

- **Contas:** vencimento, descrição, obs, categoria, parcelas, valor e checkbox **Pago** por mês
- **Entradas:** classes de receita com valor do mês e data de recebimento
- **Resumo:** KPIs, gráficos e diagnóstico do mês + tabela anual
- **Ajustes:** tema, fonte, categorias, backup JSON, instalar app, notificações

Os dados ficam no **localStorage** do navegador. Use **Exportar JSON** para backup ou para levar os dados a outro aparelho.

## Estrutura

```text
index.html          # markup das telas e modais
css/app.css         # visual (temas, componentes, layout)
js/
  constants.js      # versão, chaves e constantes
  format.js         # moeda, datas e totais
  storage.js        # carregar/salvar/backup
  ui.js             # tema, selects custom, alertas, backup
  state-contas.js   # contas, variáveis/cartões e pagamentos
  state-entradas.js # entradas
  resumo.js         # gráficos e resumo
  pwa.js            # instalação, atualização, notificações
  app.js            # navegação e init
manifest.json
service-worker.js
novidades.json
icons/
```

**Contas** = recorrentes e parceladas. **Variáveis** = valores mensais (luz/água) e cartões.