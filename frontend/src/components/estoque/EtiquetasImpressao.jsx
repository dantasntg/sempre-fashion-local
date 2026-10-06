import React from 'react';
import { Printer, X } from 'lucide-react';
import BarcodeSVG from '../ui/BarcodeSVG.jsx';
import { formatCurrency } from '../../utils.js';

function Etiqueta({ produto, variante }) {
  return (
    <div className="border border-dashed border-ink-faint/50 rounded-md p-3 flex flex-col items-center text-center break-inside-avoid">
      <p className="text-[10px] font-display tracking-[0.15em]">SEMPRE FASHION</p>
      <p className="text-sm font-medium text-ink mt-1 leading-tight">{produto.nome}</p>
      <p className="text-xs text-ink-soft">{[variante.tamanho, variante.cor].filter(Boolean).join(' · ') || '—'}</p>
      <p className="text-base font-semibold text-ink mt-1">{formatCurrency(variante.precoVenda)}</p>
      <div className="w-full mt-2"><BarcodeSVG codigo={variante.codigoBarras} height={38} /></div>
      <p className="text-xs font-mono text-ink-soft mt-0.5">{variante.codigoBarras}</p>
    </div>
  );
}

// Tela cheia de impressão: some da tela ao fechar/imprimir, e o resto do app
// (definido com a classe "app-shell") fica oculto só durante a impressão via
// CSS em index.css — assim a folha impressa mostra só as etiquetas.
export default function EtiquetasImpressao({ itens, onClose }) {
  return (
    <div className="fixed inset-0 bg-surface z-[100] overflow-y-auto">
      <div className="no-print sticky top-0 bg-surface border-b border-line px-6 py-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{itens.length} etiqueta(s) selecionada(s)</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md text-sm text-ink-soft hover:bg-surface-subtle flex items-center gap-1.5">
            <X className="w-4 h-4" /> Fechar
          </button>
          <button onClick={() => window.print()} className="px-3.5 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-hover flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
        {itens.map(({ produto, variante }) => <Etiqueta key={variante.id} produto={produto} variante={variante} />)}
      </div>
    </div>
  );
}
