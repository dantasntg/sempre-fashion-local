const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function req(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando em ' + BASE_URL);
  }
  if (!res.ok) {
    let corpo = {};
    try { corpo = await res.json(); } catch (e) {}
    const erro = new Error(corpo.error || res.statusText);
    erro.status = res.status;
    erro.detalhes = corpo;
    throw erro;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listarProdutos: () => req('/produtos'),
  criarProduto: (dados) => req('/produtos', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarProduto: (id, dados) => req(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirProduto: (id) => req(`/produtos/${id}`, { method: 'DELETE' }),
  buscarPorCodigoBarras: (codigo) => req(`/produtos/variantes/barcode/${encodeURIComponent(codigo)}`),

  listarVendas: () => req('/vendas'),
  criarVenda: (itens, formaPagamento) => req('/vendas', {
    method: 'POST',
    body: JSON.stringify({
      formaPagamento,
      itens: itens.map(i => ({ varianteId: i.varianteId, quantidade: i.quantidade, desconto: i.desconto })),
    }),
  }),

  obterCaixa: () => req('/caixa'),
  abrirCaixa: (valorAbertura) => req('/caixa/abrir', { method: 'POST', body: JSON.stringify({ valorAbertura }) }),
  adicionarMovimento: (tipo, categoria, descricao, valor) =>
    req('/caixa/movimento', { method: 'POST', body: JSON.stringify({ tipo, categoria, descricao, valor }) }),
  fecharCaixa: (valorContado) => req('/caixa/fechar', { method: 'POST', body: JSON.stringify({ valorContado }) }),

  limparDados: () => req('/dados', { method: 'DELETE' }),
};
