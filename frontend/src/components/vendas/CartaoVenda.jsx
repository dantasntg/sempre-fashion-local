import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ProductVisual from '../ui/ProductVisual.jsx';
import { formatCurrency } from '../../utils.js';

export default function CartaoVenda({ produto, quantidadesNoCarrinho, onAdicionar }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const variantesComEstoque = produto.variantes.filter(v => v.quantidade > 0);
  const semEstoque = variantesComEstoque.length === 0;
  const unica = produto.variantes.length === 1;
  const precoBase = produto.variantes[0]?.precoVenda ?? 0;
  const descontoPadrao = produto.descontoPadrao || 0;
  const precoExibido = descontoPadrao > 0 ? precoBase * (1 - descontoPadrao / 100) : precoBase;

  function clicar() {
    if (semEstoque) return;
    if (unica) { onAdicionar(produto, produto.variantes[0]); return; }
    setEscolhendo(v => !v);
  }

  function escolher(variante) {
    onAdicionar(produto, variante);
    setEscolhendo(false);
  }

  return (
    <div className="relative bg-surface border border-line rounded-lg overflow-hidden flex flex-col">
      <div className="relative aspect-square">
        <ProductVisual produto={produto} />
        {descontoPadrao > 0 && !semEstoque && (
          <span className="absolute top-2 left-2 bg-ink text-white text-[11px] font-medium px-1.5 py-0.5 rounded">-{descontoPadrao}%</span>
        )}
        {semEstoque && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-white text-xs font-medium px-2 py-1 bg-ink/70 rounded">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <p className="text-[11px] text-ink-faint truncate">{produto.categoria}{!unica ? ` · ${variantesComEstoque.length} variação(ões)` : ''}</p>
        <h3 className="text-sm text-ink leading-snug mt-0.5">{produto.nome}</h3>
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            {descontoPadrao > 0 ? (
              <div>
                <p className="text-ink-faint line-through text-xs">{formatCurrency(precoBase)}</p>
                <p className="text-sm font-medium text-ink">{formatCurrency(precoExibido)}</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-ink">{formatCurrency(precoExibido)}</p>
            )}
          </div>
          <button
            disabled={semEstoque}
            onClick={clicar}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white bg-ink hover:bg-accent disabled:bg-line-soft disabled:text-ink-faint transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {escolhendo && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEscolhendo(false)}></div>
          <div className="absolute bottom-2 right-2 left-2 z-50 bg-surface border border-line rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto">
            <p className="text-[11px] text-ink-faint px-1 pb-1">Escolha a variação</p>
            {produto.variantes.map(v => {
              const jaNoCarrinho = quantidadesNoCarrinho[v.id] || 0;
              const esgotada = v.quantidade === 0;
              const limite = jaNoCarrinho >= v.quantidade;
              return (
                <button
                  key={v.id}
                  disabled={esgotada || limite}
                  onClick={() => escolher(v)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-sm hover:bg-surface-subtle disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="text-ink-soft">{[v.tamanho, v.cor].filter(Boolean).join(' · ') || '—'}</span>
                  <span className="text-xs text-ink-faint">{esgotada ? 'esgotado' : `${v.quantidade} un.`}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
