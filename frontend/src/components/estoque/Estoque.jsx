import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, PackageSearch, Printer } from 'lucide-react';
import PageHeader from '../PageHeader.jsx';
import LinhaEstoque from './LinhaEstoque.jsx';
import ProdutoFormModal from './ProdutoFormModal.jsx';
import EtiquetasImpressao from './EtiquetasImpressao.jsx';
import { ConfirmDialog } from '../ui/Modal.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { categoriasDeProdutos, linhasEstoque } from '../../utils.js';

export default function Estoque({ produtos, onSalvarProduto, onExcluirProduto, filtroInicial }) {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [statusFiltro, setStatusFiltro] = useState('Todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [produtoExcluir, setProdutoExcluir] = useState(null);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (filtroInicial) {
      const p = produtos.find(pr => pr.id === filtroInicial);
      if (p) setBusca(p.nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroInicial]);

  const categoriasDisponiveis = useMemo(() => categoriasDeProdutos(produtos, false), [produtos]);
  const todasLinhas = useMemo(() => linhasEstoque(produtos), [produtos]);

  const linhasFiltradas = useMemo(() => todasLinhas.filter(({ produto: p, variante: v }) => {
    const termo = busca.trim().toLowerCase();
    const matchBusca = !termo
      || p.nome.toLowerCase().includes(termo)
      || (p.marca || '').toLowerCase().includes(termo)
      || v.sku.toLowerCase().includes(termo)
      || v.codigoBarras.toLowerCase().includes(termo)
      || (v.tamanho || '').toLowerCase().includes(termo)
      || (v.cor || '').toLowerCase().includes(termo);
    const matchCategoria = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
    const min = v.estoqueMinimo ?? 3;
    const matchStatus = statusFiltro === 'Todos'
      || (statusFiltro === 'Baixo' && v.quantidade > 0 && v.quantidade <= min)
      || (statusFiltro === 'Esgotado' && v.quantidade === 0)
      || (statusFiltro === 'EmEstoque' && v.quantidade > 0);
    return matchBusca && matchCategoria && matchStatus;
  }), [todasLinhas, busca, categoriaFiltro, statusFiltro]);

  function abrirNovo() { setProdutoEditando(null); setModalAberto(true); }
  function abrirEditar(p) { setProdutoEditando(p); setModalAberto(true); }
  async function handleSalvar(dados, id) { await onSalvarProduto(dados, id); setModalAberto(false); }

  function alternarSelecao(varianteId) {
    setSelecionadas(prev => {
      const novo = new Set(prev);
      if (novo.has(varianteId)) novo.delete(varianteId); else novo.add(varianteId);
      return novo;
    });
  }

  const linhasSelecionadas = todasLinhas.filter(l => selecionadas.has(l.variante.id));
  const semProdutosNoSistema = produtos.length === 0;

  return (
    <div>
      <PageHeader
        titulo="Estoque"
        subtitulo={`${produtos.length} produto(s) · ${todasLinhas.length} variação(ões)`}
        acoes={
          <div className="flex gap-2">
            {linhasSelecionadas.length > 0 && (
              <button onClick={() => setImprimindo(true)} className="border border-line hover:bg-surface-subtle text-ink-soft px-3.5 py-2 rounded-md text-sm font-medium flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Imprimir etiquetas ({linhasSelecionadas.length})
              </button>
            )}
            <button onClick={abrirNovo} className="bg-accent hover:bg-accent-hover text-white px-3.5 py-2 rounded-md text-sm font-medium flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Novo produto
            </button>
          </div>
        }
      />

      {semProdutosNoSistema ? (
        <div className="bg-surface border border-line rounded-xl">
          <EmptyState
            icon={PackageSearch}
            title="Você ainda não possui produtos cadastrados"
            description="Cadastre a primeira peça para começar a controlar estoque e vender."
            action={
              <button onClick={abrirNovo} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-sm font-medium">
                + Cadastrar produto
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, marca, SKU, código de barras, tamanho, cor..." className="w-80 pl-8 pr-3 py-1.5 rounded-md border border-line text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft" />
            </div>
            <div className="flex gap-1">
              {['Todos', 'EmEstoque', 'Baixo', 'Esgotado'].map(s => {
                const ativo = statusFiltro === s;
                const label = s === 'Todos' ? 'Todos' : s === 'EmEstoque' ? 'Em estoque' : s === 'Baixo' ? 'Estoque baixo' : 'Esgotados';
                return (
                  <button key={s} onClick={() => setStatusFiltro(s)} className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${ativo ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-subtle'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            <span className="w-px h-5 bg-line mx-1"></span>
            <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-line text-xs text-ink-soft bg-surface focus:outline-none">
              <option value="Todas">Todas categorias</option>
              {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-surface border border-line rounded-xl overflow-x-auto">
            {linhasFiltradas.length === 0 ? (
              <EmptyState icon={Search} title="Nenhum produto encontrado" description="Tente ajustar a busca ou os filtros." />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-ink-faint border-b border-line">
                    <th className="py-2.5 pl-5 pr-2 font-medium"></th>
                    <th className="py-2.5 pr-3 font-medium"></th>
                    <th className="py-2.5 pr-3 font-medium">Produto</th>
                    <th className="py-2.5 pr-3 font-medium">Variação</th>
                    <th className="py-2.5 pr-3 font-medium">Código de barras</th>
                    <th className="py-2.5 pr-3 font-medium">Categoria</th>
                    <th className="py-2.5 pr-3 font-medium">Custo</th>
                    <th className="py-2.5 pr-3 font-medium">Preço</th>
                    <th className="py-2.5 pr-3 font-medium">Margem</th>
                    <th className="py-2.5 pr-3 font-medium">Estoque</th>
                    <th className="py-2.5 pr-5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map(({ produto, variante }) => (
                    <LinhaEstoque
                      key={variante.id}
                      produto={produto}
                      variante={variante}
                      selecionada={selecionadas.has(variante.id)}
                      onSelecionar={alternarSelecao}
                      onEditar={abrirEditar}
                      onExcluir={setProdutoExcluir}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {modalAberto && <ProdutoFormModal produto={produtoEditando} produtos={produtos} onSalvar={handleSalvar} onClose={() => setModalAberto(false)} />}
      {produtoExcluir && (
        <ConfirmDialog
          titulo="Excluir produto"
          mensagem={`Tem certeza que deseja excluir "${produtoExcluir.nome}" e todas as suas ${produtoExcluir.variantes.length} variação(ões)? Essa ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirProduto(produtoExcluir.id); setProdutoExcluir(null); }}
          onCancelar={() => setProdutoExcluir(null)}
        />
      )}
      {imprimindo && <EtiquetasImpressao itens={linhasSelecionadas} onClose={() => setImprimindo(false)} />}
    </div>
  );
}
