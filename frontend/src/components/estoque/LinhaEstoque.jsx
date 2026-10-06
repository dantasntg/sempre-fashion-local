import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import ProductVisual from '../ui/ProductVisual.jsx';
import Badge from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils.js';

export default function LinhaEstoque({ produto, variante, selecionada, onSelecionar, onEditar, onExcluir }) {
  const minimo = variante.estoqueMinimo ?? 3;
  const margem = variante.precoVenda > 0 ? ((variante.precoVenda - variante.custoCompra) / variante.precoVenda) * 100 : 0;
  const status = variante.quantidade === 0
    ? { tone: 'critical', texto: 'Sem estoque' }
    : variante.quantidade <= minimo
      ? { tone: 'warning', texto: 'Estoque baixo' }
      : { tone: 'positive', texto: 'Em estoque' };

  return (
    <tr className="border-b border-line-soft hover:bg-surface-subtle/60 group">
      <td className="py-2.5 pl-5 pr-2">
        <input type="checkbox" checked={selecionada} onChange={() => onSelecionar(variante.id)} className="accent-accent" />
      </td>
      <td className="py-2.5 pr-3">
        <div className="w-9 h-9 rounded-md overflow-hidden border border-line-soft">
          <ProductVisual produto={produto} />
        </div>
      </td>
      <td className="py-2.5 pr-3 min-w-[180px]">
        <p className="text-sm text-ink">{produto.nome}</p>
        <p className="text-xs text-ink-faint">{produto.marca ? `${produto.marca} · ` : ''}{variante.sku}</p>
      </td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft whitespace-nowrap">{[variante.tamanho, variante.cor].filter(Boolean).join(' · ') || '—'}</td>
      <td className="py-2.5 pr-3 text-xs text-ink-faint font-mono whitespace-nowrap">{variante.codigoBarras}</td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft whitespace-nowrap">{produto.categoria}</td>
      <td className="py-2.5 pr-3 text-sm text-ink-soft whitespace-nowrap tabular-nums">{formatCurrency(variante.custoCompra)}</td>
      <td className="py-2.5 pr-3 text-sm text-ink whitespace-nowrap tabular-nums">{formatCurrency(variante.precoVenda)}</td>
      <td className={`py-2.5 pr-3 text-sm whitespace-nowrap tabular-nums ${margem < 0 ? 'text-critical' : 'text-ink-soft'}`}>{margem.toFixed(0)}%</td>
      <td className="py-2.5 pr-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink tabular-nums w-6 text-right">{variante.quantidade}</span>
          <Badge tone={status.tone}>{status.texto}</Badge>
        </div>
      </td>
      <td className="py-2.5 pr-5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEditar(produto)} className="p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-subtle"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onExcluir(produto)} className="p-1.5 rounded-md text-ink-faint hover:text-critical hover:bg-surface-subtle"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}
