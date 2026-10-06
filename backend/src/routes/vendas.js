const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { dataParaChave, horaAgora } = require('../utils');
const { registrarMovimentacao, ErroNegocio, responderErro } = require('../estoque');

const router = express.Router();

function montarVenda(v, itensRows) {
  return {
    id: v.id,
    data: v.data,
    hora: v.hora,
    total: v.total,
    formaPagamento: v.forma_pagamento,
    itens: itensRows.map(it => ({
      produtoId: it.produto_id,
      varianteId: it.variante_id || null,
      nome: it.nome,
      tamanho: it.tamanho || '',
      cor: it.cor || '',
      sku: it.sku,
      quantidade: it.quantidade,
      precoUnitario: it.preco_unitario,
      custoUnitario: it.custo_unitario,
      desconto: it.desconto,
    })),
  };
}

// GET /api/vendas
router.get('/', (req, res) => {
  const vendas = db.prepare('SELECT * FROM vendas ORDER BY data DESC').all();
  const itensStmt = db.prepare('SELECT * FROM venda_itens WHERE venda_id = ?');
  res.json(vendas.map(v => montarVenda(v, itensStmt.all(v.id))));
});

// POST /api/vendas
//   itens: [{ varianteId, quantidade, desconto }]
//   Preço e custo vêm SEMPRE do banco (o navegador só informa quantidade e desconto).
//   Tudo acontece numa transação: se qualquer item não tiver estoque, nada é gravado.
router.post('/', (req, res) => {
  try {
    const { itens, formaPagamento } = req.body || {};
    if (!Array.isArray(itens) || itens.length === 0) throw new ErroNegocio('carrinho vazio');
    if (!formaPagamento) throw new ErroNegocio('forma de pagamento é obrigatória');

    const linhas = itens.map(it => {
      const quantidade = parseInt(it.quantidade, 10);
      const desconto = Number(it.desconto) || 0;
      if (!it.varianteId) throw new ErroNegocio('item sem variação');
      if (!(quantidade > 0)) throw new ErroNegocio('quantidade inválida');
      if (desconto < 0 || desconto > 100) throw new ErroNegocio('desconto inválido');
      return { varianteId: it.varianteId, quantidade, desconto };
    });

    const agora = new Date();
    const id = randomUUID();
    const data = agora.toISOString();
    const hora = horaAgora(agora);

    const buscarVariante = db.prepare(`SELECT v.*, p.nome AS produto_nome FROM produto_variantes v
                                       JOIN produtos p ON p.id = v.produto_id WHERE v.id = ?`);
    const baixar = db.prepare('UPDATE produto_variantes SET quantidade = quantidade - ? WHERE id = ?');
    const inserirVenda = db.prepare('INSERT INTO vendas (id, data, hora, total, forma_pagamento) VALUES (?,?,?,?,?)');
    const inserirItem = db.prepare(`INSERT INTO venda_itens
      (venda_id, produto_id, variante_id, nome, tamanho, cor, sku, quantidade, preco_unitario, custo_unitario, desconto)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

    const tx = db.transaction(() => {
      // 1) valida o estoque total pedido de cada variação ANTES de gravar qualquer coisa
      const pedido = new Map();
      for (const l of linhas) pedido.set(l.varianteId, (pedido.get(l.varianteId) || 0) + l.quantidade);
      const variantes = new Map();
      for (const [vid, qtd] of pedido) {
        const v = buscarVariante.get(vid);
        if (!v) throw new ErroNegocio('Variação não encontrada.', 404);
        if (v.quantidade < qtd) {
          throw new ErroNegocio('Estoque insuficiente para esta variação.', 409, {
            varianteId: vid, disponivel: v.quantidade, solicitado: qtd,
            descricao: `${v.produto_nome} ${[v.tamanho, v.cor].filter(Boolean).join(' · ')}`.trim(),
          });
        }
        variantes.set(vid, v);
      }

      // 2) grava a venda, os itens, baixa o estoque e registra a movimentação
      let total = 0;
      const vendaItens = linhas.map(l => {
        const v = variantes.get(l.varianteId);
        total += l.quantidade * v.preco_venda * (1 - l.desconto / 100);
        return { l, v };
      });
      total = Number(total.toFixed(2));
      inserirVenda.run(id, data, hora, total, formaPagamento);

      const saldos = new Map([...variantes].map(([vid, v]) => [vid, v.quantidade]));
      for (const { l, v } of vendaItens) {
        inserirItem.run(id, v.produto_id, v.id, v.produto_nome, v.tamanho, v.cor, v.sku,
                        l.quantidade, v.preco_venda, v.custo_compra, l.desconto);
        baixar.run(l.quantidade, v.id);
        const saldo = saldos.get(v.id) - l.quantidade;
        saldos.set(v.id, saldo);
        registrarMovimentacao(db, {
          varianteId: v.id, produtoId: v.produto_id, tipo: 'venda',
          quantidade: -l.quantidade, saldoApos: saldo, origem: 'venda', origemId: id,
        });
      }

      // 3) lança no caixa, se estiver aberto hoje
      const caixaAtual = db.prepare('SELECT * FROM caixa_atual WHERE id = 1').get();
      if (caixaAtual.aberto && caixaAtual.data === dataParaChave(agora)) {
        db.prepare('INSERT INTO caixa_movimentos (id, tipo, categoria, descricao, valor, forma_pagamento, hora) VALUES (?,?,?,?,?,?,?)')
          .run(randomUUID(), 'venda', null, `Venda · ${linhas.length} peça(s)`, total, formaPagamento, hora);
      }
    });
    tx();

    const vendaRow = db.prepare('SELECT * FROM vendas WHERE id = ?').get(id);
    const itensRows = db.prepare('SELECT * FROM venda_itens WHERE venda_id = ?').all(id);
    res.status(201).json(montarVenda(vendaRow, itensRows));
  } catch (e) { responderErro(res, e); }
});

module.exports = router;
