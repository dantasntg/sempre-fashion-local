// Registro de movimentação de estoque (base para o histórico futuro).
// Positivo = entrada, negativo = saída. Chamar SEMPRE dentro da mesma
// transação que altera a quantidade da variação.
function registrarMovimentacao(db, { varianteId, produtoId, tipo, quantidade, saldoApos, origem, origemId }) {
  db.prepare(`INSERT INTO movimentacoes_estoque
    (variante_id, produto_id, tipo, quantidade, saldo_apos, origem, origem_id)
    VALUES (?,?,?,?,?,?,?)`).run(varianteId, produtoId, tipo, quantidade, saldoApos ?? null, origem || null, origemId || null);
}

class ErroNegocio extends Error {
  constructor(mensagem, status = 400, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

function responderErro(res, e) {
  if (e instanceof ErroNegocio) return res.status(e.status).json({ error: e.message, ...e.extra });
  console.error(e);
  return res.status(500).json({ error: 'erro interno do servidor' });
}

module.exports = { registrarMovimentacao, ErroNegocio, responderErro };
