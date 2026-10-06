# Roadmap de backend — módulos futuros

**Atualização:** o modelo de Produto + Variações + SKU + Código de barras +
Estoque por variação, que antes estava listado aqui como trabalho futuro,
**já foi implementado** (tabelas `produto_variantes`, `contadores` e
`movimentacoes_estoque`). As seções abaixo foram atualizadas para refletir isso.

Este documento existe porque a interface do Sempre Fashion já tem espaço reservado
(sidebar, em "Em breve") para módulos que ainda **não têm backend implementado**.
Em vez de simular uma funcionalidade que não existe de verdade, cada módulo abaixo
foi deixado documentado — assim, quando for a hora de construir, o trabalho de
banco de dados e API já está desenhado.

Nenhuma tabela existente (`produtos`, `produto_variantes`, `vendas`, `venda_itens`,
`caixa_atual`, `caixa_movimentos`, `caixa_historico`, `movimentacoes_estoque`)
precisa mudar para nenhum destes módulos.

---

## Clientes

**Tabela nova:** `clientes`
```sql
CREATE TABLE clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  data_cadastro TEXT NOT NULL
);
```
**Alteração aditiva em `vendas`:** coluna `cliente_id TEXT` (nullable — venda sem
cliente identificado continua válida).

**Endpoints:** `GET/POST/PUT/DELETE /api/clientes`. Histórico de compras, total
comprado e ticket médio do cliente são calculados a partir de `vendas` filtradas
por `cliente_id`, sem precisar duplicar dado.

---

## Fornecedores e Compras

**Tabelas novas:**
```sql
CREATE TABLE fornecedores (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT, cnpj TEXT, data_cadastro TEXT NOT NULL
);

CREATE TABLE compras (
  id TEXT PRIMARY KEY, fornecedor_id TEXT NOT NULL REFERENCES fornecedores(id),
  data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente' -- pendente | recebida
);

CREATE TABLE compra_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT, compra_id TEXT NOT NULL REFERENCES compras(id),
  produto_id TEXT, quantidade INTEGER NOT NULL, custo_unitario REAL NOT NULL
);
```
**Regra de negócio:** ao marcar uma compra como "recebida" (`POST /api/compras/:id/receber`),
o backend soma `compra_itens.quantidade` ao `produtos.quantidade` de cada item — numa
transação, igual ao que `POST /api/vendas` já faz hoje (só que somando em vez de
subtraindo). É a mesma técnica já usada no sistema, ao contrário.

**Já pronto de base:** o modelo de variações (`produto_variantes`) já existe — uma
compra recebida dá entrada diretamente no estoque da variação certa (por SKU ou
código de barras bipado), e cada entrada já pode ser registrada em
`movimentacoes_estoque` (tabela que já existe, tipo `entrada_compra`).

---

## Trocas e Devoluções

**Tabela nova:**
```sql
CREATE TABLE trocas (
  id TEXT PRIMARY KEY, venda_id TEXT NOT NULL REFERENCES vendas(id),
  produto_id TEXT NOT NULL, quantidade INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- 'troca' | 'devolucao'
  motivo TEXT, data TEXT NOT NULL,
  valor_estornado REAL NOT NULL DEFAULT 0
);
```
**Fluxo:** localizar venda (já existe `GET /api/vendas`) → selecionar item → escolher
tipo e motivo → `POST /api/trocas`, que numa transação: (1) devolve a quantidade ao
estoque do produto original; (2) se for troca por outro produto, dá baixa no novo
item; (3) se envolver dinheiro de volta, registra um movimento de `saida` no caixa
do dia (reaproveitando `caixa_movimentos`, categoria "Devolução ao cliente").

---

## Relatórios

Não precisa de tabela nova — é leitura combinada do que já existe. Vale a pena um
endpoint dedicado (`GET /api/relatorios/vendas?de=...&ate=...&agruparPor=categoria|forma_pagamento|dia`)
para não obrigar o frontend a baixar todas as vendas e agregar no navegador
conforme a base crescer.

---

## Usuários e permissões

**Tabela nova:** `usuarios` (id, nome, email, senha_hash, papel). Autenticação real
(sessão ou JWT) precisa ser implementada com uma biblioteca testada (ex: `bcrypt`
para hash de senha) — propositalmente **não foi simulada** uma autenticação falsa
no frontend, conforme pedido.

---

## Backup

Arquitetura já favorece isso: todo o estado da loja mora em um único arquivo
(`backend/data/sempre-fashion.db`). Backup automático pode ser um job simples que
copia esse arquivo (SQLite permite cópia a quente com `VACUUM INTO`) para uma pasta
local ou, futuramente, para Google Drive/OneDrive via API deles. Não requer
mudança de schema.

---

## Sobre o app desktop (Electron) futuro

O banco já é um arquivo SQLite local — é exatamente o formato que o Electron
precisa. Quando for empacotar: o `backend/data/` deve morar na pasta de dados do
usuário do sistema operacional (`app.getPath('userData')` no Electron), não dentro
da pasta de instalação do programa — assim o banco sobrevive a atualizações do
aplicativo, como já era a preocupação original.
