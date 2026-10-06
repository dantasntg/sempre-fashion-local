const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { gerarCodigoBaseProduto, gerarCodigoBarras, gerarSkuVariante } = require('../utils');
const { registrarMovimentacao, ErroNegocio, responderErro } = require('../estoque');

const router = express.Router();

// ---------- conversão linha do banco -> formato da API ----------
function varianteParaApi(v) {
  return {
    id: v.id,
    produtoId: v.produto_id,
    tamanho: v.tamanho || '',
    cor: v.cor || '',
    sku: v.sku,
    codigoBarras: v.codigo_barras,
    custoCompra: v.custo_compra,
    precoVenda: v.preco_venda,
    quantidade: v.quantidade,
    estoqueMinimo: v.estoque_minimo,
  };
}

function produtoParaApi(p, variantes) {
  return {
    id: p.id,
    codigoBase: p.codigo_base || p.sku,
    nome: p.nome,
    categoria: p.categoria,
    marca: p.marca || '',
    foto: p.foto || '',
    descontoPadrao: p.desconto_padrao,
    dataCadastro: p.data_cadastro,
    variantes: variantes.map(varianteParaApi),
  };
}

function listarProdutos(idProduto) {
  const produtos = idProduto
    ? db.prepare('SELECT * FROM produtos WHERE id = ?').all(idProduto)
    : db.prepare('SELECT * FROM produtos ORDER BY data_cadastro DESC').all();
  const variantes = idProduto
    ? db.prepare('SELECT * FROM produto_variantes WHERE produto_id = ? ORDER BY rowid').all(idProduto)
    : db.prepare('SELECT * FROM produto_variantes ORDER BY rowid').all();
  const porProduto = new Map();
  for (const v of variantes) {
    if (!porProduto.has(v.produto_id)) porProduto.set(v.produto_id, []);
    porProduto.get(v.produto_id).push(v);
  }
  return produtos.map(p => produtoParaApi(p, porProduto.get(p.id) || []));
}

// ---------- validação ----------
function lerVariante(v, posicao) {
  const custo = Number(v.custoCompra);
  const preco = Number(v.precoVenda);
  const quantidade = parseInt(v.quantidade, 10);
  const estoqueMinimo = v.estoqueMinimo === '' || v.estoqueMinimo == null ? 3 : parseInt(v.estoqueMinimo, 10);
  if (!(custo >= 0)) throw new ErroNegocio(`Variação ${posicao}: custo inválido.`);
  if (!(preco >= 0)) throw new ErroNegocio(`Variação ${posicao}: preço inválido.`);
  if (!(quantidade >= 0)) throw new ErroNegocio(`Variação ${posicao}: estoque não pode ser negativo.`);
  if (!(estoqueMinimo >= 0)) throw new ErroNegocio(`Variação ${posicao}: estoque mínimo inválido.`);
  return {
    tamanho: String(v.tamanho ?? '').trim(),
    cor: String(v.cor ?? '').trim(),
    custo, preco, quantidade, estoqueMinimo,
  };
}

function inserirVariante(produto, dados) {
  const id = randomUUID();
  const sku = gerarSkuVariante(db, produto.codigo_base, dados.tamanho, dados.cor);
  const codigoBarras = gerarCodigoBarras(db);
  db.prepare(`INSERT INTO produto_variantes
    (id, produto_id, tamanho, cor, sku, codigo_barras, custo_compra, preco_venda, quantidade, estoque_minimo, data_cadastro)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, produto.id, dados.tamanho, dados.cor, sku, codigoBarras,
    dados.custo, dados.preco, dados.quantidade, dados.estoqueMinimo, new Date().toISOString()
  );
  if (dados.quantidade > 0) {
    registrarMovimentacao(db, {
      varianteId: id, produtoId: produto.id, tipo: 'estoque_inicial',
      quantidade: dados.quantidade, saldoApos: dados.quantidade, origem: 'cadastro',
    });
  }
  return id;
}

// ---------- rotas ----------

// GET /api/produtos  -> produtos com suas variações aninhadas
router.get('/', (req, res) => {
  res.json(listarProdutos());
});

// GET /api/produtos/variantes/barcode/:codigo -> localiza uma variação pelo código lido
router.get('/variantes/barcode/:codigo', (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  if (!codigo) return res.status(400).json({ error: 'código vazio' });
  const consulta = `SELECT v.*, p.nome, p.categoria, p.marca, p.foto, p.desconto_padrao
                    FROM produto_variantes v JOIN produtos p ON p.id = v.produto_id`;
  const v = db.prepare(`${consulta} WHERE UPPER(v.codigo_barras) = UPPER(?)`).get(codigo)
         || db.prepare(`${consulta} WHERE UPPER(v.sku) = UPPER(?)`).get(codigo);
  if (!v) return res.status(404).json({ error: 'Código não encontrado.' });
  res.json({
    varianteId: v.id, produtoId: v.produto_id, nome: v.nome, categoria: v.categoria, marca: v.marca || '',
    foto: v.foto || '', descontoPadrao: v.desconto_padrao,
    tamanho: v.tamanho, cor: v.cor, sku: v.sku, codigoBarras: v.codigo_barras,
    custoCompra: v.custo_compra, precoVenda: v.preco_venda, quantidade: v.quantidade, estoqueMinimo: v.estoque_minimo,
  });
});

// POST /api/produtos  -> cria produto + variações numa única transação
router.post('/', (req, res) => {
  try {
    const d = req.body || {};
    const nome = String(d.nome ?? '').trim();
    const categoria = String(d.categoria ?? '').trim();
    if (!nome || !categoria) throw new ErroNegocio('nome e categoria são obrigatórios');
    if (!Array.isArray(d.variantes) || d.variantes.length === 0) throw new ErroNegocio('Cadastre pelo menos uma variação.');
    const variantes = d.variantes.map((v, i) => lerVariante(v, i + 1));

    const id = randomUUID();
    const tx = db.transaction(() => {
      const codigoBase = gerarCodigoBaseProduto(db, categoria);
      db.prepare(`INSERT INTO produtos (id, sku, codigo_base, nome, categoria, marca, desconto_padrao, foto, data_cadastro)
                  VALUES (?,?,?,?,?,?,?,?,?)`).run(
        id, codigoBase, codigoBase, nome, categoria, String(d.marca ?? '').trim(),
        Number(d.descontoPadrao) || 0, d.foto || '', new Date().toISOString()
      );
      const produto = { id, codigo_base: codigoBase };
      for (const v of variantes) inserirVariante(produto, v);
    });
    tx();
    res.status(201).json(listarProdutos(id)[0]);
  } catch (e) { responderErro(res, e); }
});

// PUT /api/produtos/:id  -> atualiza o produto e sincroniza as variações
//   variantes com "id"  -> atualiza custo/preço/estoque/mínimo (tamanho, cor, SKU e código de barras não mudam)
//   variantes sem "id"  -> são criadas (SKU e código de barras gerados)
//   removerVariantes    -> lista explícita de ids a excluir (nunca exclui por omissão)
router.put('/:id', (req, res) => {
  try {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    if (!produto) throw new ErroNegocio('produto não encontrado', 404);
    const d = req.body || {};
    const enviadas = Array.isArray(d.variantes) ? d.variantes : [];
    const remover = Array.isArray(d.removerVariantes) ? d.removerVariantes : [];

    const tx = db.transaction(() => {
      const existentes = db.prepare('SELECT * FROM produto_variantes WHERE produto_id = ?').all(produto.id);
      const mapa = new Map(existentes.map(v => [v.id, v]));

      for (const vid of remover) {
        if (!mapa.has(vid)) throw new ErroNegocio('Variação a remover não pertence a este produto.');
      }
      const novas = enviadas.filter(v => !v.id);
      if (existentes.length - remover.length + novas.length < 1) {
        throw new ErroNegocio('O produto precisa ter pelo menos uma variação.');
      }

      const nome = String(d.nome ?? produto.nome).trim();
      const categoria = String(d.categoria ?? produto.categoria).trim();
      if (!nome || !categoria) throw new ErroNegocio('nome e categoria são obrigatórios');
      db.prepare(`UPDATE produtos SET nome = ?, categoria = ?, marca = ?, desconto_padrao = ?, foto = ? WHERE id = ?`).run(
        nome, categoria,
        d.marca != null ? String(d.marca).trim() : produto.marca,
        d.descontoPadrao != null ? (Number(d.descontoPadrao) || 0) : produto.desconto_padrao,
        d.foto != null ? d.foto : produto.foto,
        produto.id
      );

      for (const vid of remover) db.prepare('DELETE FROM produto_variantes WHERE id = ?').run(vid);

      enviadas.forEach((v, i) => {
        if (!v.id) return;
        const atual = mapa.get(v.id);
        if (!atual) throw new ErroNegocio('Variação não pertence a este produto.');
        if (remover.includes(v.id)) return;
        const dados = lerVariante({ ...v, tamanho: atual.tamanho, cor: atual.cor }, i + 1);
        db.prepare(`UPDATE produto_variantes SET custo_compra = ?, preco_venda = ?, quantidade = ?, estoque_minimo = ? WHERE id = ?`)
          .run(dados.custo, dados.preco, dados.quantidade, dados.estoqueMinimo, atual.id);
        const delta = dados.quantidade - atual.quantidade;
        if (delta !== 0) {
          registrarMovimentacao(db, {
            varianteId: atual.id, produtoId: produto.id, tipo: 'ajuste',
            quantidade: delta, saldoApos: dados.quantidade, origem: 'ajuste_manual',
          });
        }
      });

      const produtoAtual = { id: produto.id, codigo_base: produto.codigo_base || produto.sku };
      enviadas.forEach((v, i) => { if (!v.id) inserirVariante(produtoAtual, lerVariante(v, i + 1)); });
    });
    tx();
    res.json(listarProdutos(produto.id)[0]);
  } catch (e) { responderErro(res, e); }
});

// DELETE /api/produtos/:id  -> remove o produto e todas as suas variações
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'produto não encontrado' });
  res.status(204).end();
});

module.exports = router;
