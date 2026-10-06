const express = require('express');
const db = require('../db');

const router = express.Router();

// DELETE /api/dados -> apaga produtos, variações, vendas e histórico de caixa (reinício total).
// Só é chamado quando o usuário confirma explicitamente no app.
router.delete('/', (req, res) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM venda_itens').run();
    db.prepare('DELETE FROM vendas').run();
    db.prepare('DELETE FROM movimentacoes_estoque').run();
    db.prepare('DELETE FROM produto_variantes').run();
    db.prepare('DELETE FROM produtos').run();
    db.prepare('DELETE FROM contadores').run();
    db.prepare('DELETE FROM caixa_movimentos').run();
    db.prepare('DELETE FROM caixa_historico').run();
    db.prepare('UPDATE caixa_atual SET aberto = 0, data = NULL, hora_abertura = NULL, valor_abertura = 0 WHERE id = 1').run();
  });
  tx();
  res.status(204).end();
});

module.exports = router;
