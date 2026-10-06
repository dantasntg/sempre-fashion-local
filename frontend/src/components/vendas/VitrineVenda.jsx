import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Barcode as BarcodeIcon, ShoppingCart, PackageSearch } from 'lucide-react';
import CartaoVenda from './CartaoVenda.jsx';
import CarrinhoPainel from './CarrinhoPainel.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { categoriasDeProdutos, formatCurrency } from '../../utils.js';

export default function VitrineVenda({ produtos, carrinho, onAdicionar, onAdicionarPorCodigo, onAtualizarQtd, onAtualizarDesconto, onRemover, onFinalizar }) {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [codigoBarra, setCodigoBarra] = useState('');
  const [erroCodigo, setErroCodigo] = useState('');
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const inputBarraRef = useRef(null);

  // Mantém o campo de leitura sempre focado — o vendedor pode simplesmente
  // bipar a qualquer momento, sem precisar clicar em nada antes.
  useEffect(() => {
    inputBarraRef.current?.focus();
  }, []);

  const categoriasDisponiveis = useMemo(() => categoriasDeProdutos(produtos, true), [produtos]);

  const produtosFiltrados = useMemo(() => produtos.filter(p => {
    const termo = busca.trim().toLowerCase();
    const matchBusca = !termo || p.nome.toLowerCase().includes(termo)
      || p.variantes.some(v => v.sku.toLowerCase().includes(termo) || v.codigoBarras.toLowerCase().includes(termo));
    const matchCategoria = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  }), [produtos, busca, categoriaFiltro]);

  async function handleScanSubmit(e) {
    e.preventDefault();
    const codigo = codigoBarra.trim();
    setCodigoBarra('');
    if (!codigo) return;
    setErroCodigo('');
    try {
      await onAdicionarPorCodigo(codigo);
    } catch (err) {
      setErroCodigo(err.message || 'Código não encontrado.');
      setTimeout(() => setErroCodigo(''), 2500);
    } finally {
      inputBarraRef.current?.focus();
    }
  }

  function quantidadesNoCarrinho(produto) {
    const mapa = {};
    produto.variantes.forEach(v => {
      const item = carrinho.find(i => i.varianteId === v.id);
      if (item) mapa[v.id] = item.quantidade;
    });
    return mapa;
  }

  const totalItensCarrinho = carrinho.reduce((a, i) => a + i.quantidade, 0);
  const totalCarrinho = carrinho.reduce((a, i) => a + i.quantidade * i.precoUnitario * (1 - i.desconto / 100), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-start">
        <div className="flex-1 flex gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full pl-8 pr-3 py-2 rounded-md border border-line text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft" />
          </div>
          <form onSubmit={handleScanSubmit} className="relative shrink-0">
            <BarcodeIcon className="w-3.5 h-3.5 text-accent absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputBarraRef}
              value={codigoBarra}
              onChange={e => setCodigoBarra(e.target.value)}
              onBlur={() => setTimeout(() => inputBarraRef.current?.focus(), 150)}
              placeholder="Aponte o leitor aqui"
              autoComplete="off"
              className={`w-44 sm:w-56 pl-8 pr-3 py-2 rounded-md border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft ${erroCodigo ? 'border-critical' : 'border-accent/40'}`}
            />
          </form>
        </div>

        <div className="relative shrink-0">
          <button onClick={() => setCarrinhoAberto(v => !v)} className="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-white bg-ink hover:bg-accent transition-colors">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline tabular-nums">{formatCurrency(totalCarrinho)}</span>
            {totalItensCarrinho > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent text-white text-[11px] font-medium rounded-full w-5 h-5 flex items-center justify-center">{totalItensCarrinho}</span>
            )}
          </button>
          {carrinhoAberto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCarrinhoAberto(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-96 z-50">
                <CarrinhoPainel carrinho={carrinho} onAtualizarQtd={onAtualizarQtd} onAtualizarDesconto={onAtualizarDesconto} onRemover={onRemover} onFinalizar={onFinalizar} />
              </div>
            </>
          )}
        </div>
      </div>

      {erroCodigo && <p className="text-xs text-critical -mt-2">{erroCodigo}</p>}

      {categoriasDisponiveis.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button onClick={() => setCategoriaFiltro('Todas')} className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${categoriaFiltro === 'Todas' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-subtle'}`}>Todas</button>
          {categoriasDisponiveis.map(c => {
            const ativo = categoriaFiltro === c;
            return (
              <button key={c} onClick={() => setCategoriaFiltro(c)} className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${ativo ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-subtle'}`}>{c}</button>
            );
          })}
        </div>
      )}

      {produtosFiltrados.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl">
          <EmptyState icon={PackageSearch} title="Nenhum produto encontrado" description="Tente ajustar a busca ou os filtros de categoria." />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {produtosFiltrados.map(p => (
            <CartaoVenda key={p.id} produto={p} quantidadesNoCarrinho={quantidadesNoCarrinho(p)} onAdicionar={onAdicionar} />
          ))}
        </div>
      )}
    </div>
  );
}
