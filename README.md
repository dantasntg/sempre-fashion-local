# Sempre Fashion — Gestão de Vendas

Sistema completo de gestão para loja de roupas: estoque com fotos e código de barras,
vendas em formato de vitrine com carrinho, painel com comparação mensal e produtos mais
vendidos, e controle de caixa com contagem de cédulas e fechamento diário.

O projeto é dividido em duas partes independentes:

```
sempre-fashion/
├── backend/    → API em Node.js + Express, com banco de dados SQLite
└── frontend/   → Interface em React + Vite, consome a API do backend
```

## Pré-requisitos

- Node.js 18 ou mais recente (inclui o npm)

## 1. Rodando o backend (API + banco de dados)

```bash
cd backend
npm install
npm run dev
```

O servidor sobe em **http://localhost:4000**. Na primeira execução, ele cria
automaticamente o arquivo `backend/data/sempre-fashion.db` (SQLite) com as tabelas
necessárias e popula com produtos, variações e vendas de demonstração, para você
já ver o sistema funcionando. Se o banco já existir de uma versão anterior, as
migrações rodam automaticamente e nenhum dado é perdido (produtos antigos viram
1 variação cada, preservando o SKU que já tinham).

### Modelo de dados: Produto + Variações

Cada **produto** (`produtos`) é o agrupador (nome, categoria, marca, foto). O
estoque de verdade mora na **variação** (`produto_variantes`): tamanho, cor,
SKU próprio, código de barras próprio, custo, preço e estoque próprios.

- SKU da variação: `{código-base-do-produto}-{tamanho}-{cor abreviada}`, ex. `CAM-0001-M-PRE`.
- Código de barras: identificador interno da loja, formato `SFnnnnnn` (não é um
  GTIN/EAN oficial), renderizado como Code 128 via a biblioteca `jsbarcode`.
- Tamanho e cor de uma variação não podem ser alterados depois de criada (já têm
  SKU e código de barras vinculados); para corrigir, remova a variação e crie outra.

Endpoints principais:

| Método | Rota                                        | O que faz                                  |
|--------|---------------------------------------------|---------------------------------------------|
| GET    | `/api/produtos`                             | Lista produtos com suas variações aninhadas |
| POST   | `/api/produtos`                             | Cria produto + variações (SKU/barcode automáticos) |
| PUT    | `/api/produtos/:id`                         | Atualiza produto; adiciona, edita ou remove variações |
| DELETE | `/api/produtos/:id`                         | Remove o produto e todas as suas variações  |
| GET    | `/api/produtos/variantes/barcode/:codigo`   | Localiza uma variação pelo código de barras ou SKU (usado pelo leitor no PDV) |
| GET    | `/api/vendas`                               | Lista o histórico de vendas                 |
| POST   | `/api/vendas`                               | Registra uma venda por `varianteId` (baixa estoque daquela variação, valida disponibilidade numa transação e lança no caixa se estiver aberto) |
| GET    | `/api/caixa`                                | Estado atual do caixa + histórico           |
| POST   | `/api/caixa/abrir`                          | Abre o caixa do dia                         |
| POST   | `/api/caixa/movimento`                      | Registra entrada/saída manual               |
| POST   | `/api/caixa/fechar`                         | Fecha o caixa e salva no histórico          |
| DELETE | `/api/dados`                                | Apaga todos os dados (reinício total)       |

## 2. Rodando o frontend (interface)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173** no navegador.

Por padrão o frontend chama a API em `http://localhost:4000/api`. Se o backend
estiver em outro endereço, copie `frontend/.env.example` para `frontend/.env` e
ajuste `VITE_API_URL`.

## Banco de dados

SQLite (`better-sqlite3`), arquivo único em `backend/data/sempre-fashion.db` — não
precisa instalar nenhum servidor de banco separado. As tabelas são: `produtos`,
`produto_variantes`, `contadores` (geração de SKU/código de barras, persistida em
disco), `movimentacoes_estoque`, `vendas`, `venda_itens`, `caixa_atual`,
`caixa_movimentos` e `caixa_historico`.

Para começar do zero (apagar os dados de demonstração), use o botão "Limpar todos
os dados" no rodapé do app, ou:

```bash
curl -X DELETE http://localhost:4000/api/dados
```

## Build de produção do frontend

```bash
cd frontend
npm run build   # gera frontend/dist, pronto para servir como site estático
```

Nesse caso, configure `VITE_API_URL` apontando para onde o backend estiver hospedado.

## Estrutura de pastas

```
backend/
  src/
    db.js            → conexão SQLite + criação das tabelas + migrações aditivas
    seed.js           → gera os dados de demonstração (produtos com variações) na primeira execução
    utils.js           → geração de código-base/SKU/barcode (contadores persistidos), formatação de data/hora
    estoque.js          → registro de movimentação de estoque + helpers de erro de negócio
    routes/
      produtos.js        → produtos + variações aninhadas, busca por código de barras
      vendas.js           → venda por variação, validação de estoque numa transação
      caixa.js
      dados.js
    server.js          → ponto de entrada (Express)

frontend/
  src/
    api.js             → cliente HTTP que fala com o backend
    constants.js        → categorias, formas de pagamento, módulos futuros
    utils.js             → formatação, filtro por período, cálculos, achatamento produto→variações
    components/
      Sidebar.jsx        → navegação principal (substitui as antigas abas horizontais)
      BrandMark.jsx        → identidade tipográfica "Sempre Fashion"
      PageHeader.jsx        → título + subtítulo + ações de cada tela
      ComingSoon.jsx         → tela dos módulos ainda não implementados
      Dashboard.jsx           → painel com filtro de período (Hoje/7d/30d/Mês)
      vendas/           → vitrine (com leitor de código de barras), carrinho, histórico diário
      estoque/          → tabela de variações, formulário de produto+variações, impressão de etiquetas
      caixa/             → saldo, entradas/saídas separadas, fechamento
      ui/                → EmptyState, Badge, Modal, StatCard, BarcodeSVG (Code 128 via jsbarcode)
    App.jsx              → layout (sidebar + conteúdo) e estado geral

ROADMAP-BACKEND.md → o que cada módulo futuro (Clientes, Fornecedores/Compras,
                       Trocas, Relatórios, Usuários) precisa no banco e na API.
```
