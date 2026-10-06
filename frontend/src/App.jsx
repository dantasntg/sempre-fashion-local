import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Vendas from './components/vendas/Vendas.jsx';
import Estoque from './components/estoque/Estoque.jsx';
import Caixa from './components/caixa/Caixa.jsx';
import ComingSoon from './components/ComingSoon.jsx';
import { ConfirmDialog } from './components/ui/Modal.jsx';
import { MODULOS_FUTUROS } from './constants.js';
import { api } from './api.js';
import { caixaVazio, hojeISO } from './utils.js';

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [caixa, setCaixa] = useState({ atual: caixaVazio(), historico: [] });
  const [carrinho, setCarrinho] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [carregando, setCarregando] = useState(true);
  const [erroConexao, setErroConexao] = useState('');
  const [filtroEstoqueId, setFiltroEstoqueId] = useState(null);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    setCarregando(true);
    setErroConexao('');
    try {
      const [prods, vends, cx] = await Promise.all([api.listarProdutos(), api.listarVendas(), api.obterCaixa()]);
      setProdutos(prods);
      setVendas(vends);
      setCaixa(cx);
    } catch (e) {
      setErroConexao(e.message || 'Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  async function salvarProduto(dados, idEditando) {
    if (idEditando) await api.atualizarProduto(idEditando, dados);
    else await api.criarProduto(dados);
    setProdutos(await api.listarProdutos());
  }

  async function excluirProduto(id) {
    await api.excluirProduto(id);
    setProdutos(prev => prev.filter(p => p.id !== id));
  }

  function acharVariante(varianteId) {
    for (const p of produtos) {
      const v = p.variantes.find(x => x.id === varianteId);
      if (v) return { produto: p, variante: v };
    }
    return null;
  }

  function adicionarAoCarrinho(produto, variante) {
    setCarrinho(prev => {
      const existente = prev.find(i => i.varianteId === variante.id);
      const qtdAtual = existente ? existente.quantidade : 0;
      if (qtdAtual >= variante.quantidade) return prev;
      if (existente) return prev.map(i => (i.varianteId === variante.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...prev, {
        varianteId: variante.id, produtoId: produto.id, nome: produto.nome,
        tamanho: variante.tamanho, cor: variante.cor, sku: variante.sku,
        precoUnitario: variante.precoVenda, custoUnitario: variante.custoCompra,
        quantidade: 1, desconto: produto.descontoPadrao || 0,
      }];
    });
  }

  async function adicionarPorCodigo(codigo) {
    const resultado = await api.buscarPorCodigoBarras(codigo);
    const produtoFalso = { id: resultado.produtoId, nome: resultado.nome, descontoPadrao: resultado.descontoPadrao };
    const varianteFalsa = {
      id: resultado.varianteId, tamanho: resultado.tamanho, cor: resultado.cor, sku: resultado.sku,
      precoVenda: resultado.precoVenda, custoCompra: resultado.custoCompra, quantidade: resultado.quantidade,
    };
    adicionarAoCarrinho(produtoFalso, varianteFalsa);
  }

  function atualizarQtdCarrinho(varianteId, novaQtd) {
    setCarrinho(prev => {
      if (novaQtd <= 0) return prev.filter(i => i.varianteId !== varianteId);
      const achado = acharVariante(varianteId);
      const max = achado ? achado.variante.quantidade : novaQtd;
      return prev.map(i => (i.varianteId === varianteId ? { ...i, quantidade: Math.min(novaQtd, max) } : i));
    });
  }
  function atualizarDescontoCarrinho(varianteId, novoDesconto) {
    setCarrinho(prev => prev.map(i => (i.varianteId === varianteId ? { ...i, desconto: novoDesconto } : i)));
  }
  function removerDoCarrinho(varianteId) {
    setCarrinho(prev => prev.filter(i => i.varianteId !== varianteId));
  }

  async function finalizarVenda(formaPagamento) {
    if (carrinho.length === 0) return;
    await api.criarVenda(carrinho, formaPagamento);
    const [prods, vends, cx] = await Promise.all([api.listarProdutos(), api.listarVendas(), api.obterCaixa()]);
    setProdutos(prods);
    setVendas(vends);
    setCaixa(cx);
    setCarrinho([]);
  }

  async function abrirCaixa(valorInicial) {
    await api.abrirCaixa(valorInicial);
    setCaixa(await api.obterCaixa());
  }
  async function adicionarMovimentoCaixa(tipo, dados) {
    await api.adicionarMovimento(tipo, dados.categoria, dados.descricao, dados.valor);
    setCaixa(await api.obterCaixa());
  }
  async function fecharCaixa(valorContado) {
    await api.fecharCaixa(valorContado);
    setCaixa(await api.obterCaixa());
  }

  async function limparDados() {
    await api.limparDados();
    setConfirmarLimpeza(false);
    setCarrinho([]);
    await carregarTudo();
  }

  function irParaEstoqueComFiltro(produtoId) {
    setFiltroEstoqueId(produtoId);
    setAbaAtiva('estoque');
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-ink-faint text-sm">Carregando sua loja...</p>
        </div>
      </div>
    );
  }

  if (erroConexao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="bg-surface rounded-xl border border-line p-6 max-w-sm text-center">
          <p className="text-sm font-medium text-ink mb-1">Não foi possível conectar</p>
          <p className="text-sm text-ink-faint mb-4">{erroConexao}</p>
          <p className="text-xs text-ink-faint mb-4">Verifique se o backend está rodando (npm run dev na pasta backend) na porta configurada em VITE_API_URL.</p>
          <button onClick={carregarTudo} className="text-white bg-accent hover:bg-accent-hover px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const moduloFuturoAtivo = MODULOS_FUTUROS.find(m => m.id === abaAtiva);

  return (
    <div className="app-shell min-h-screen bg-canvas lg:flex">
      <Sidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        caixaAberto={caixa.atual.aberto && caixa.atual.data === hojeISO()}
        onLimpar={() => setConfirmarLimpeza(true)}
      />

      <main className="flex-1 min-w-0 p-5 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {abaAtiva === 'dashboard' && (
            <Dashboard produtos={produtos} vendas={vendas} caixa={caixa} irParaVendas={() => setAbaAtiva('vendas')} irParaEstoqueComFiltro={irParaEstoqueComFiltro} />
          )}
          {abaAtiva === 'vendas' && (
            <Vendas produtos={produtos} vendas={vendas} carrinho={carrinho} onAdicionar={adicionarAoCarrinho} onAdicionarPorCodigo={adicionarPorCodigo} onAtualizarQtd={atualizarQtdCarrinho} onAtualizarDesconto={atualizarDescontoCarrinho} onRemover={removerDoCarrinho} onFinalizar={finalizarVenda} />
          )}
          {abaAtiva === 'estoque' && (
            <Estoque produtos={produtos} onSalvarProduto={salvarProduto} onExcluirProduto={excluirProduto} filtroInicial={filtroEstoqueId} />
          )}
          {abaAtiva === 'caixa' && (
            <Caixa caixa={caixa} onAbrir={abrirCaixa} onFechar={fecharCaixa} onAdicionarMovimento={adicionarMovimentoCaixa} />
          )}
          {moduloFuturoAtivo && <ComingSoon titulo={moduloFuturoAtivo.label} />}
        </div>
      </main>

      {confirmarLimpeza && (
        <ConfirmDialog
          titulo="Limpar todos os dados"
          mensagem="Isso vai apagar todos os produtos, vendas e o histórico de caixa no banco de dados. Essa ação não pode ser desfeita."
          onConfirmar={limparDados}
          onCancelar={() => setConfirmarLimpeza(false)}
        />
      )}
    </div>
  );
}
