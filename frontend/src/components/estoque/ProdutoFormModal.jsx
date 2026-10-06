import React, { useState, useMemo } from 'react';
import { Upload, Trash2, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import ProductVisual from '../ui/ProductVisual.jsx';
import BarcodeSVG from '../ui/BarcodeSVG.jsx';
import { CATEGORIAS } from '../../constants.js';
import { formatCurrency, processarImagemArquivo } from '../../utils.js';

function Secao({ titulo, acoes, children }) {
  return (
    <div className="pb-5 border-b border-line-soft last:border-0 last:pb-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-ink-faint uppercase tracking-wider">{titulo}</p>
        {acoes}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full px-2.5 py-1.5 rounded-md border border-line text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent";

let contadorTemp = 0;
function novaLinhaVariante() {
  contadorTemp += 1;
  return { tempId: `novo-${contadorTemp}`, id: null, tamanho: '', cor: '', custoCompra: '', precoVenda: '', quantidade: '', estoqueMinimo: 3 };
}

export default function ProdutoFormModal({ produto, produtos, onSalvar, onClose }) {
  const editando = !!produto;
  const [nome, setNome] = useState(produto?.nome || '');
  const [categoria, setCategoria] = useState(produto?.categoria || CATEGORIAS[0]);
  const [marca, setMarca] = useState(produto?.marca || '');
  const [descontoPadrao, setDescontoPadrao] = useState(produto?.descontoPadrao || 0);
  const [foto, setFoto] = useState(produto?.foto || '');
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const [mostrarLink, setMostrarLink] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');

  const [variantes, setVariantes] = useState(() =>
    editando
      ? produto.variantes.map(v => ({ tempId: v.id, id: v.id, tamanho: v.tamanho, cor: v.cor, sku: v.sku, codigoBarras: v.codigoBarras, custoCompra: v.custoCompra, precoVenda: v.precoVenda, quantidade: v.quantidade, estoqueMinimo: v.estoqueMinimo }))
      : [novaLinhaVariante()]
  );
  const [removidas, setRemovidas] = useState([]);

  const sugestoesCategorias = useMemo(() => Array.from(new Set([...CATEGORIAS, ...produtos.map(p => p.categoria)])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [produtos]);

  async function handleArquivo(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setErroFoto('');
    setCarregandoFoto(true);
    try {
      setFoto(await processarImagemArquivo(file));
    } catch (err) {
      setErroFoto('Não foi possível carregar essa imagem. Tente outro arquivo.');
    } finally {
      setCarregandoFoto(false);
      e.target.value = '';
    }
  }

  function atualizarVariante(tempId, campo, valor) {
    setVariantes(prev => prev.map(v => (v.tempId === tempId ? { ...v, [campo]: valor } : v)));
  }
  function adicionarVariante() {
    setVariantes(prev => [...prev, novaLinhaVariante()]);
  }
  function removerVariante(tempId) {
    setVariantes(prev => {
      const alvo = prev.find(v => v.tempId === tempId);
      if (alvo?.id) setRemovidas(r => [...r, alvo.id]);
      return prev.filter(v => v.tempId !== tempId);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim() || !categoria.trim()) return;
    if (variantes.length === 0) { setErroSalvar('Cadastre pelo menos uma variação.'); return; }
    setSalvando(true);
    setErroSalvar('');
    try {
      const payload = {
        nome: nome.trim(), categoria: categoria.trim(), marca: marca.trim(),
        descontoPadrao: Number(descontoPadrao) || 0, foto,
        variantes: variantes.map(v => ({
          id: v.id || undefined,
          tamanho: v.tamanho, cor: v.cor,
          custoCompra: parseFloat(v.custoCompra) || 0,
          precoVenda: parseFloat(v.precoVenda) || 0,
          quantidade: parseInt(v.quantidade, 10) || 0,
          estoqueMinimo: v.estoqueMinimo === '' ? 3 : parseInt(v.estoqueMinimo, 10),
        })),
        removerVariantes: removidas,
      };
      await onSalvar(payload, editando ? produto.id : null);
    } catch (err) {
      setErroSalvar(err.message || 'Não foi possível salvar o produto.');
      setSalvando(false);
    }
  }

  const produtoPreview = { nome, categoria, foto };

  return (
    <Modal titulo={editando ? 'Editar produto' : 'Novo produto'} subtitulo={editando ? produto.codigoBase : 'O código de cada variação é gerado ao salvar'} onClose={onClose} largura="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">

        <Secao titulo="Informações do produto">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-line">
              <ProductVisual produto={produtoPreview} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-ink-soft">Nome do produto</label>
                <input required value={nome} onChange={e => setNome(e.target.value)} className={`${inputCls} mt-1`} placeholder="Ex: Camiseta Básica" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-soft">Categoria</label>
                <input list="lista-categorias-sugeridas" required value={categoria} onChange={e => setCategoria(e.target.value)} className={`${inputCls} mt-1`} placeholder="Escolha ou digite" />
                <datalist id="lista-categorias-sugeridas">{sugestoesCategorias.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-soft">Marca (opcional)</label>
                <input value={marca} onChange={e => setMarca(e.target.value)} className={`${inputCls} mt-1`} placeholder="Ex: Denim Co." />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer px-3 py-1.5 rounded-md border border-line text-xs text-ink-soft hover:bg-surface-subtle flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> {foto ? 'Trocar foto' : 'Enviar foto'}
              <input type="file" accept="image/*" className="hidden" onChange={handleArquivo} />
            </label>
            {foto && <button type="button" onClick={() => setFoto('')} className="text-xs text-ink-faint hover:text-critical flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remover</button>}
            <button type="button" onClick={() => setMostrarLink(v => !v)} className="text-xs text-ink-faint hover:text-ink-soft underline ml-auto">{mostrarLink ? 'ocultar link' : 'usar link em vez disso'}</button>
          </div>
          {carregandoFoto && <p className="text-xs text-ink-faint mt-1.5">Carregando imagem...</p>}
          {erroFoto && <p className="text-xs text-critical mt-1.5">{erroFoto}</p>}
          {mostrarLink && <input value={foto} onChange={e => setFoto(e.target.value)} className={`${inputCls} mt-2`} placeholder="Cole o link de uma imagem" />}
        </Secao>

        <Secao titulo="Preços">
          <div className="w-40">
            <label className="text-xs font-medium text-ink-soft">Desconto padrão (%)</label>
            <input type="number" min="0" max="90" value={descontoPadrao} onChange={e => setDescontoPadrao(e.target.value)} className={`${inputCls} mt-1`} />
          </div>
          <p className="text-xs text-ink-faint mt-1.5">Custo e preço ficam por variação, logo abaixo — cada tamanho/cor pode ter um valor diferente.</p>
        </Secao>

        <Secao
          titulo="Variações"
          acoes={<button type="button" onClick={adicionarVariante} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar variação</button>}
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="text-[11px] text-ink-faint">
                  <th className="pb-1.5 pr-2 font-medium">Tamanho</th>
                  <th className="pb-1.5 pr-2 font-medium">Cor</th>
                  <th className="pb-1.5 pr-2 font-medium">Custo</th>
                  <th className="pb-1.5 pr-2 font-medium">Preço</th>
                  <th className="pb-1.5 pr-2 font-medium">Estoque</th>
                  <th className="pb-1.5 pr-2 font-medium">Mínimo</th>
                  <th className="pb-1.5 pr-2 font-medium">Código</th>
                  <th className="pb-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {variantes.map(v => {
                  const existente = !!v.id;
                  return (
                    <tr key={v.tempId} className="border-t border-line-soft">
                      <td className="py-1.5 pr-2 w-20">
                        {existente ? <span className="text-sm text-ink-soft">{v.tamanho || '—'}</span> :
                          <input value={v.tamanho} onChange={e => atualizarVariante(v.tempId, 'tamanho', e.target.value)} className={inputCls} placeholder="M" />}
                      </td>
                      <td className="py-1.5 pr-2 w-28">
                        {existente ? <span className="text-sm text-ink-soft">{v.cor || '—'}</span> :
                          <input value={v.cor} onChange={e => atualizarVariante(v.tempId, 'cor', e.target.value)} className={inputCls} placeholder="Preto" />}
                      </td>
                      <td className="py-1.5 pr-2 w-24">
                        <input required type="number" min="0" step="0.01" value={v.custoCompra} onChange={e => atualizarVariante(v.tempId, 'custoCompra', e.target.value)} className={inputCls} />
                      </td>
                      <td className="py-1.5 pr-2 w-24">
                        <input required type="number" min="0" step="0.01" value={v.precoVenda} onChange={e => atualizarVariante(v.tempId, 'precoVenda', e.target.value)} className={inputCls} />
                      </td>
                      <td className="py-1.5 pr-2 w-20">
                        <input required type="number" min="0" value={v.quantidade} onChange={e => atualizarVariante(v.tempId, 'quantidade', e.target.value)} className={inputCls} />
                      </td>
                      <td className="py-1.5 pr-2 w-20">
                        <input type="number" min="0" value={v.estoqueMinimo} onChange={e => atualizarVariante(v.tempId, 'estoqueMinimo', e.target.value)} className={inputCls} />
                      </td>
                      <td className="py-1.5 pr-2 text-xs text-ink-faint font-mono whitespace-nowrap">
                        {existente ? v.codigoBarras : <span className="italic">gerado ao salvar</span>}
                      </td>
                      <td className="py-1.5">
                        {variantes.length > 1 && (
                          <button type="button" onClick={() => removerVariante(v.tempId)} className="p-1 text-ink-faint hover:text-critical"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-faint mt-2">Tamanho e cor não podem ser alterados depois de criados (o código de barras e o SKU já estarão vinculados a eles). Para corrigir, remova a linha e adicione uma nova.</p>
        </Secao>

        {editando && (
          <Secao titulo="Etiquetas">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {produto.variantes.map(v => (
                <div key={v.id} className="border border-line rounded-md p-2 shrink-0 w-32 text-center">
                  <p className="text-xs text-ink-soft truncate">{[v.tamanho, v.cor].filter(Boolean).join(' · ') || '—'}</p>
                  <BarcodeSVG codigo={v.codigoBarras} height={26} />
                  <p className="text-[10px] font-mono text-ink-faint">{v.codigoBarras}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-2">Para imprimir, selecione as variações na tabela de Estoque e use "Imprimir etiquetas".</p>
          </Secao>
        )}

        {erroSalvar && <p className="text-sm text-critical">{erroSalvar}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-md text-sm font-medium text-ink-soft hover:bg-surface-subtle">Cancelar</button>
          <button type="submit" disabled={salvando} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-60">
            {salvando ? 'Salvando...' : 'Salvar produto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
