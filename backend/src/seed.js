const { randomUUID } = require('crypto');
const db = require('./db');
const { dataParaChave, gerarCodigoBaseProduto, gerarCodigoBarras, gerarSkuVariante } = require('./utils');
const { registrarMovimentacao } = require('./estoque');

const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Pix'];

// variantes: [tamanho, cor, quantidade]
const BASE_PRODUTOS = [
  { nome: 'Camiseta Básica', categoria: 'Camisetas', marca: 'Basiq', custo: 18, preco: 39.9, desconto: 0, diasCadastro: 180, vendavel: true,
    variantes: [['P', 'Preto', 3], ['M', 'Preto', 5], ['G', 'Preto', 2], ['P', 'Branco', 4], ['M', 'Branco', 6], ['G', 'Branco', 3]] },
  { nome: 'Camiseta Estampada Floral', categoria: 'Camisetas', marca: 'Basiq', custo: 22, preco: 49.9, desconto: 10, diasCadastro: 120, vendavel: true,
    variantes: [['M', 'Estampado', 6], ['G', 'Estampado', 4]] },
  { nome: 'Calça Jeans Skinny', categoria: 'Calças', marca: 'Denim Co.', custo: 45, preco: 129.9, desconto: 0, diasCadastro: 160, vendavel: true,
    variantes: [['38', 'Azul', 12], ['40', 'Azul', 8], ['42', 'Azul', 5]] },
  { nome: 'Calça Jeans Reta', categoria: 'Calças', marca: 'Denim Co.', custo: 48, preco: 139.9, desconto: 0, diasCadastro: 95, vendavel: false,
    variantes: [['40', 'Azul Escuro', 2]] },
  { nome: 'Vestido Midi Floral', categoria: 'Vestidos', marca: 'Atelier Bela', custo: 55, preco: 159.9, desconto: 0, diasCadastro: 140, vendavel: true,
    variantes: [['P', 'Estampado', 3], ['M', 'Estampado', 8], ['G', 'Estampado', 4]] },
  { nome: 'Vestido Longo de Festa', categoria: 'Vestidos', marca: 'Atelier Bela', custo: 70, preco: 219.9, desconto: 15, diasCadastro: 70, vendavel: true,
    variantes: [['P', 'Preto', 3]] },
  { nome: 'Jaqueta Jeans', categoria: 'Jaquetas', marca: '', custo: 60, preco: 179.9, desconto: 0, diasCadastro: 150, vendavel: true,
    variantes: [['M', 'Azul', 6], ['G', 'Azul', 4]] },
  { nome: 'Jaqueta Corta-Vento', categoria: 'Jaquetas', marca: '', custo: 40, preco: 149.9, desconto: 0, diasCadastro: 65, vendavel: false,
    variantes: [['G', 'Preto', 5]] },
  { nome: 'Saia Plissada', categoria: 'Saias', marca: '', custo: 30, preco: 89.9, desconto: 0, diasCadastro: 110, vendavel: true,
    variantes: [['P', 'Bege', 3], ['M', 'Bege', 7]] },
  { nome: 'Blusa de Tricô', categoria: 'Blusas', marca: '', custo: 35, preco: 99.9, desconto: 0, diasCadastro: 200, vendavel: true,
    variantes: [['M', 'Vinho', 10], ['G', 'Vinho', 15]] },
  { nome: 'Short Jeans', categoria: 'Shorts', marca: '', custo: 25, preco: 69.9, desconto: 0, diasCadastro: 100, vendavel: true,
    variantes: [['38', 'Azul', 9], ['40', 'Azul', 6]] },
  { nome: 'Conjunto Moletom', categoria: 'Blusas', marca: '', custo: 50, preco: 149.9, desconto: 0, diasCadastro: 50, vendavel: true,
    variantes: [['M', 'Cinza', 5]] },
  { nome: 'Cinto de Couro', categoria: 'Acessórios', marca: '', custo: 15, preco: 49.9, desconto: 0, diasCadastro: 220, vendavel: true,
    variantes: [['Único', 'Marrom', 20]] },
  { nome: 'Bolsa Transversal', categoria: 'Acessórios', marca: '', custo: 40, preco: 119.9, desconto: 0, diasCadastro: 80, vendavel: false,
    variantes: [['Único', 'Preto', 0]] },
];

function seedIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM produtos').get();
  if (c > 0) return; // nunca sobrescreve nem duplica dados existentes

  console.log('Banco vazio: gerando dados de demonstração...');
  const hoje = new Date();
  const variantesVendaveis = [];

  const inserirProduto = db.prepare(`INSERT INTO produtos
    (id, sku, codigo_base, nome, categoria, marca, desconto_padrao, foto, data_cadastro)
    VALUES (?,?,?,?,?,?,?,'',?)`);
  const inserirVariante = db.prepare(`INSERT INTO produto_variantes
    (id, produto_id, tamanho, cor, sku, codigo_barras, custo_compra, preco_venda, quantidade, estoque_minimo, data_cadastro)
    VALUES (?,?,?,?,?,?,?,?,?,3,?)`);

  const tx1 = db.transaction(() => {
    for (const item of BASE_PRODUTOS) {
      const produtoId = randomUUID();
      const dataCadastro = new Date(hoje);
      dataCadastro.setDate(dataCadastro.getDate() - item.diasCadastro);
      const codigoBase = gerarCodigoBaseProduto(db, item.categoria);
      inserirProduto.run(produtoId, codigoBase, codigoBase, item.nome, item.categoria, item.marca, item.desconto, dataCadastro.toISOString());
      for (const [tamanho, cor, quantidade] of item.variantes) {
        const varianteId = randomUUID();
        const sku = gerarSkuVariante(db, codigoBase, tamanho, cor);
        inserirVariante.run(varianteId, produtoId, tamanho, cor, sku, gerarCodigoBarras(db), item.custo, item.preco, quantidade, dataCadastro.toISOString());
        if (quantidade > 0) {
          registrarMovimentacao(db, { varianteId, produtoId, tipo: 'estoque_inicial', quantidade, saldoApos: quantidade, origem: 'seed' });
        }
        if (item.vendavel) {
          variantesVendaveis.push({ varianteId, produtoId, nome: item.nome, tamanho, cor, sku, custo: item.custo, preco: item.preco });
        }
      }
    }
  });
  tx1();

  // vendas históricas (últimos 150 dias) usando apenas variações de produtos "vendáveis"
  const inserirVenda = db.prepare('INSERT INTO vendas (id, data, hora, total, forma_pagamento) VALUES (?,?,?,?,?)');
  const inserirItem = db.prepare(`INSERT INTO venda_itens
    (venda_id, produto_id, variante_id, nome, tamanho, cor, sku, quantidade, preco_unitario, custo_unitario, desconto)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);

  const vendasGeradas = [];
  const tx2 = db.transaction(() => {
    for (let diasAtras = 150; diasAtras >= 1; diasAtras--) {
      if (Math.random() < 0.2) continue;
      const data = new Date(hoje);
      data.setDate(data.getDate() - diasAtras);
      const numVendas = 1 + Math.floor(Math.random() * 3);
      for (let v = 0; v < numVendas; v++) {
        const numItens = 1 + (Math.random() < 0.3 ? 1 : 0);
        const itens = [];
        for (let i = 0; i < numItens; i++) {
          const p = variantesVendaveis[Math.floor(Math.random() * variantesVendaveis.length)];
          const quantidade = 1 + (Math.random() < 0.15 ? 1 : 0);
          const desconto = Math.random() < 0.25 ? [5, 10, 15][Math.floor(Math.random() * 3)] : 0;
          itens.push({ ...p, quantidade, desconto });
        }
        const total = itens.reduce((a, it) => a + it.quantidade * it.preco * (1 - it.desconto / 100), 0);
        const hora = `${String(9 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        const formaPagamento = FORMAS_PAGAMENTO[Math.floor(Math.random() * FORMAS_PAGAMENTO.length)];
        const id = randomUUID();
        inserirVenda.run(id, data.toISOString(), hora, Number(total.toFixed(2)), formaPagamento);
        for (const it of itens) {
          inserirItem.run(id, it.produtoId, it.varianteId, it.nome, it.tamanho, it.cor, it.sku, it.quantidade, it.preco, it.custo, it.desconto);
        }
        vendasGeradas.push({ data, formaPagamento, total });
      }
    }
  });
  tx2();

  // histórico de caixa (últimos 14 dias)
  const inserirHistorico = db.prepare(`INSERT INTO caixa_historico
    (data, valor_abertura, total_vendas_dinheiro, total_vendas_outros, total_entradas, total_saidas, valor_esperado, valor_contado, diferenca, num_vendas)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const tx3 = db.transaction(() => {
    for (let diasAtras = 14; diasAtras >= 1; diasAtras--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - diasAtras);
      const chave = dataParaChave(data);
      const doDia = vendasGeradas.filter(v => dataParaChave(v.data) === chave);
      if (doDia.length === 0) continue;
      const totalDinheiro = doDia.filter(v => v.formaPagamento === 'Dinheiro').reduce((a, v) => a + v.total, 0);
      const totalOutros = doDia.filter(v => v.formaPagamento !== 'Dinheiro').reduce((a, v) => a + v.total, 0);
      const valorAbertura = 100;
      const valorEsperado = valorAbertura + totalDinheiro;
      const diferenca = Math.random() < 0.25 ? Number((Math.random() * 10 - 5).toFixed(2)) : 0;
      inserirHistorico.run(chave, valorAbertura, Number(totalDinheiro.toFixed(2)), Number(totalOutros.toFixed(2)), 0, 0,
        Number(valorEsperado.toFixed(2)), Number((valorEsperado + diferenca).toFixed(2)), diferenca, doDia.length);
    }
  });
  tx3();

  const nVar = db.prepare('SELECT COUNT(*) AS c FROM produto_variantes').get().c;
  console.log(`Seed concluído: ${BASE_PRODUTOS.length} produtos, ${nVar} variações, ${vendasGeradas.length} vendas históricas.`);
}

module.exports = { seedIfEmpty };
