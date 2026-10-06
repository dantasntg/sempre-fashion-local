const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { dataParaChave, horaAgora } = require('../utils');

const router = express.Router();

function montarMovimento(m) {
  return {
    id: m.id,
    tipo: m.tipo,
    categoria: m.categoria,
    descricao: m.descricao,
    valor: m.valor,
    formaPagamento: m.forma_pagamento,
    hora: m.hora,
  };
}

function montarHistorico(h) {
  return {
    data: h.data,
    valorAbertura: h.valor_abertura,
    totalVendasDinheiro: h.total_vendas_dinheiro,
    totalVendasOutros: h.total_vendas_outros,
    totalEntradas: h.total_entradas,
    totalSaidas: h.total_saidas,
    valorEsperado: h.valor_esperado,
    valorContado: h.valor_contado,
    diferenca: h.diferenca,
    numVendas: h.num_vendas,
  };
}

// GET /api/caixa -> estado atual + histórico
router.get('/', (req, res) => {
  const atualRow = db.prepare('SELECT * FROM caixa_atual WHERE id = 1').get();
  const movimentos = db.prepare('SELECT * FROM caixa_movimentos ORDER BY criado_em ASC').all().map(montarMovimento);
  const historico = db.prepare('SELECT * FROM caixa_historico ORDER BY data DESC').all().map(montarHistorico);

  res.json({
    atual: {
      aberto: !!atualRow.aberto,
      data: atualRow.data,
      horaAbertura: atualRow.hora_abertura,
      valorAbertura: atualRow.valor_abertura,
      movimentos,
    },
    historico,
  });
});

// POST /api/caixa/abrir
router.post('/abrir', (req, res) => {
  const atual = db.prepare('SELECT * FROM caixa_atual WHERE id = 1').get();
  if (atual.aberto) return res.status(409).json({ error: 'já existe um caixa aberto' });

  const valorAbertura = Number(req.body?.valorAbertura) || 0;
  const agora = new Date();
  db.prepare('UPDATE caixa_atual SET aberto = 1, data = ?, hora_abertura = ?, valor_abertura = ? WHERE id = 1')
    .run(dataParaChave(agora), horaAgora(agora), valorAbertura);
  res.status(201).json({ ok: true });
});

// POST /api/caixa/movimento  { tipo: 'entrada'|'saida', categoria, descricao, valor }
router.post('/movimento', (req, res) => {
  const { tipo, categoria, descricao, valor } = req.body || {};
  if (tipo !== 'entrada' && tipo !== 'saida') return res.status(400).json({ error: "tipo deve ser 'entrada' ou 'saida'" });
  const v = Number(valor);
  if (!v || v <= 0) return res.status(400).json({ error: 'valor inválido' });

  const atual = db.prepare('SELECT * FROM caixa_atual WHERE id = 1').get();
  if (!atual.aberto) return res.status(409).json({ error: 'caixa não está aberto' });

  const id = randomUUID();
  db.prepare('INSERT INTO caixa_movimentos (id, tipo, categoria, descricao, valor, forma_pagamento, hora) VALUES (?,?,?,?,?,NULL,?)')
    .run(id, tipo, categoria || null, descricao || '', v, horaAgora(new Date()));
  res.status(201).json({ ok: true });
});

// POST /api/caixa/fechar  { valorContado }
router.post('/fechar', (req, res) => {
  const atual = db.prepare('SELECT * FROM caixa_atual WHERE id = 1').get();
  if (!atual.aberto) return res.status(409).json({ error: 'caixa não está aberto' });

  const valorContado = Number(req.body?.valorContado);
  if (isNaN(valorContado)) return res.status(400).json({ error: 'valorContado inválido' });

  const movimentos = db.prepare('SELECT * FROM caixa_movimentos').all();
  const totalVendasDinheiro = movimentos.filter(m => m.tipo === 'venda' && m.forma_pagamento === 'Dinheiro').reduce((a, m) => a + m.valor, 0);
  const totalVendasOutros = movimentos.filter(m => m.tipo === 'venda' && m.forma_pagamento !== 'Dinheiro').reduce((a, m) => a + m.valor, 0);
  const totalEntradas = movimentos.filter(m => m.tipo === 'entrada').reduce((a, m) => a + m.valor, 0);
  const totalSaidas = movimentos.filter(m => m.tipo === 'saida').reduce((a, m) => a + m.valor, 0);
  const valorEsperado = atual.valor_abertura + totalVendasDinheiro + totalEntradas - totalSaidas;
  const numVendas = movimentos.filter(m => m.tipo === 'venda').length;
  const diferenca = Number((valorContado - valorEsperado).toFixed(2));

  const tx = db.transaction(() => {
    db.prepare(`INSERT OR REPLACE INTO caixa_historico
      (data, valor_abertura, total_vendas_dinheiro, total_vendas_outros, total_entradas, total_saidas, valor_esperado, valor_contado, diferenca, num_vendas)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      atual.data, atual.valor_abertura,
      Number(totalVendasDinheiro.toFixed(2)), Number(totalVendasOutros.toFixed(2)),
      Number(totalEntradas.toFixed(2)), Number(totalSaidas.toFixed(2)),
      Number(valorEsperado.toFixed(2)), Number(valorContado.toFixed(2)), diferenca, numVendas
    );
    db.prepare('DELETE FROM caixa_movimentos').run();
    db.prepare('UPDATE caixa_atual SET aberto = 0, data = NULL, hora_abertura = NULL, valor_abertura = 0 WHERE id = 1').run();
  });
  tx();

  res.json({ ok: true, diferenca });
});

module.exports = router;
