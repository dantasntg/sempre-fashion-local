import React, { useState } from 'react';
import { ShoppingBag, History } from 'lucide-react';
import PageHeader from '../PageHeader.jsx';
import VitrineVenda from './VitrineVenda.jsx';
import HistoricoDiario from './HistoricoDiario.jsx';

export default function Vendas({ produtos, vendas, carrinho, onAdicionar, onAdicionarPorCodigo, onAtualizarQtd, onAtualizarDesconto, onRemover, onFinalizar }) {
  const [subAba, setSubAba] = useState('vitrine');
  return (
    <div>
      <PageHeader
        titulo="Vender"
        subtitulo="Monte a venda e finalize em poucos cliques"
        acoes={
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            <button onClick={() => setSubAba('vitrine')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${subAba === 'vitrine' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint'}`}>
              <ShoppingBag className="w-3.5 h-3.5" /> Vitrine
            </button>
            <button onClick={() => setSubAba('historico')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${subAba === 'historico' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint'}`}>
              <History className="w-3.5 h-3.5" /> Histórico do dia
            </button>
          </div>
        }
      />
      {subAba === 'vitrine' ? (
        <VitrineVenda produtos={produtos} carrinho={carrinho} onAdicionar={onAdicionar} onAdicionarPorCodigo={onAdicionarPorCodigo} onAtualizarQtd={onAtualizarQtd} onAtualizarDesconto={onAtualizarDesconto} onRemover={onRemover} onFinalizar={onFinalizar} />
      ) : (
        <HistoricoDiario vendas={vendas} />
      )}
    </div>
  );
}
