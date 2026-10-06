const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { uid, proximoContador, garantirContadorMinimo, gerarCodigoBarras } = require('./utils');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'sempre-fashion.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    tamanho TEXT,
    cor TEXT,
    custo_compra REAL NOT NULL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    desconto_padrao REAL NOT NULL DEFAULT 0,
    quantidade INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 3,
    foto TEXT,
    data_cadastro TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    hora TEXT,
    total REAL NOT NULL,
    forma_pagamento TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS venda_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id TEXT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id TEXT,
    nome TEXT NOT NULL,
    sku TEXT,
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    custo_unitario REAL NOT NULL DEFAULT 0,
    desconto REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS caixa_atual (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    aberto INTEGER NOT NULL DEFAULT 0,
    data TEXT,
    hora_abertura TEXT,
    valor_abertura REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS caixa_movimentos (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    categoria TEXT,
    descricao TEXT,
    valor REAL NOT NULL,
    forma_pagamento TEXT,
    hora TEXT,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS caixa_historico (
    data TEXT PRIMARY KEY,
    valor_abertura REAL,
    total_vendas_dinheiro REAL,
    total_vendas_outros REAL,
    total_entradas REAL,
    total_saidas REAL,
    valor_esperado REAL,
    valor_contado REAL,
    diferenca REAL,
    num_vendas INTEGER
  );
`);

const existeCaixaAtual = db.prepare('SELECT 1 FROM caixa_atual WHERE id = 1').get();
if (!existeCaixaAtual) {
  db.prepare('INSERT INTO caixa_atual (id, aberto, data, hora_abertura, valor_abertura) VALUES (1, 0, NULL, NULL, 0)').run();
}

// --- Migrações aditivas e seguras -------------------------------------
// Nunca removem coluna, nunca apagam dado existente. Cada uma checa se já
// foi aplicada antes de rodar, então é seguro reiniciar o servidor quantas
// vezes quiser.
function colunaExiste(tabela, coluna) {
  return db.prepare(`PRAGMA table_info(${tabela})`).all().some(c => c.name === coluna);
}

// Migração 1 — campo "marca" no produto
if (!colunaExiste('produtos', 'marca')) {
  db.exec('ALTER TABLE produtos ADD COLUMN marca TEXT');
  console.log('Migração: coluna "marca" adicionada a produtos (dados existentes preservados).');
}

// Migração 2 — produto + variações + código de barras + contadores
db.exec(`
  CREATE TABLE IF NOT EXISTS contadores (
    chave TEXT PRIMARY KEY,
    valor INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS produto_variantes (
    id TEXT PRIMARY KEY,
    produto_id TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tamanho TEXT NOT NULL DEFAULT '',
    cor TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL UNIQUE,
    codigo_barras TEXT NOT NULL UNIQUE,
    custo_compra REAL NOT NULL DEFAULT 0,
    preco_venda REAL NOT NULL DEFAULT 0,
    quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    estoque_minimo INTEGER NOT NULL DEFAULT 3,
    data_cadastro TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_variantes_produto ON produto_variantes(produto_id);
`);

if (!colunaExiste('produtos', 'codigo_base')) {
  db.exec('ALTER TABLE produtos ADD COLUMN codigo_base TEXT');
}
if (!colunaExiste('venda_itens', 'variante_id')) {
  db.exec('ALTER TABLE venda_itens ADD COLUMN variante_id TEXT');
}

// Backfill: só roda se ainda não existe NENHUMA variação e há produtos antigos.
// Cada produto antigo vira exatamente 1 variação, reaproveitando o SKU que já
// existia (não gera um novo, para não mexer em identificador já em uso).
// Só o código de barras é novo, pois isso nunca existiu antes.
const totalVariantes = db.prepare('SELECT COUNT(*) AS c FROM produto_variantes').get().c;
const produtosAntigos = db.prepare('SELECT * FROM produtos').all();
if (totalVariantes === 0 && produtosAntigos.length > 0) {
  console.log(`Migração: convertendo ${produtosAntigos.length} produto(s) existente(s) para o modelo de variações...`);
  const inserirVariante = db.prepare(`INSERT INTO produto_variantes
    (id, produto_id, tamanho, cor, sku, codigo_barras, custo_compra, preco_venda, quantidade, estoque_minimo, data_cadastro)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const definirCodigoBase = db.prepare('UPDATE produtos SET codigo_base = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const p of produtosAntigos) {
      inserirVariante.run(
        uid(), p.id, p.tamanho || '', p.cor || '', p.sku, gerarCodigoBarras(db),
        p.custo_compra, p.preco_venda, p.quantidade, p.estoque_minimo, p.data_cadastro
      );
      definirCodigoBase.run(p.sku, p.id);
      // mantém o contador de SKU-base à frente dos números já usados
      const [prefixo, numero] = String(p.sku).split('-');
      const n = parseInt(numero, 10);
      if (prefixo && !Number.isNaN(n)) garantirContadorMinimo(db, `sku_${prefixo.toUpperCase()}`, n);
    }
  });
  tx();
  console.log('Migração de variações concluída (produtos, SKUs e vendas antigas preservados).');
}

// Migração 3 — histórico de movimentação de estoque + snapshot de variação nas vendas
// (a tela de histórico fica para uma etapa futura; aqui só a base de dados,
// já sendo alimentada por vendas e ajustes, para o histórico não ter "buracos")
db.exec(`
  CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variante_id TEXT NOT NULL,
    produto_id TEXT NOT NULL,
    tipo TEXT NOT NULL,          -- estoque_inicial | entrada_compra | venda | devolucao | troca | ajuste
    quantidade INTEGER NOT NULL, -- positivo = entra, negativo = sai
    saldo_apos INTEGER,
    origem TEXT,                 -- ex: 'venda', 'compra', 'ajuste_manual'
    origem_id TEXT,
    usuario TEXT,                -- nulo até existir autenticação
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_mov_variante ON movimentacoes_estoque(variante_id);
`);
if (!colunaExiste('venda_itens', 'tamanho')) db.exec('ALTER TABLE venda_itens ADD COLUMN tamanho TEXT');
if (!colunaExiste('venda_itens', 'cor')) db.exec('ALTER TABLE venda_itens ADD COLUMN cor TEXT');

// Produtos que já têm variação mas ficaram sem codigo_base (proteção extra)
db.prepare("UPDATE produtos SET codigo_base = sku WHERE codigo_base IS NULL OR codigo_base = ''").run();

module.exports = db;
