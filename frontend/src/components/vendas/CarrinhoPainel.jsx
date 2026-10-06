import React, { useState } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, Check } from 'lucide-react';
import { FORMAS_PAGAMENTO } from '../../constants.js';
import { formatCurrency } from '../../utils.js';

export default function CarrinhoPainel({ carrinho, onAtualizarQtd, onAtualizarDesconto, onRemover, onFinalizar }) {
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro');
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erro, setErro] = useState('');

  const subtotal = carrinho.reduce((a, i) => a + i.quantidade * i.precoUnitario, 0);
  const totalDesconto = carrinho.reduce((a, i) => a + i.quantidade * i.precoUnitario * (i.desconto / 100), 0);
  const total = subtotal - totalDesconto;
  const opcoesDesconto = [0, 5, 10, 15, 20];

  async function handleFinalizar() {
    if (carrinho.length === 0) return;
    setProcessando(true);
    setErro('');
    try {
      await onFinalizar(formaPagamento, total);
      setSucesso(total);
      setTimeout(() => setSucesso(null), 3000);
    } catch (e) {
      setErro(e.message || 'Não foi possível registrar a venda.');
    } finally {
      setProcessando(false);
    }
  }

  if (sucesso !== null) {
    return (
      <div className="bg-surface border border-line rounded-xl shadow-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5" />
        </div>
        <p className="text-sm font-medium text-ink">Venda registrada</p>
        <p className="text-sm text-ink-faint">{formatCurrency(sucesso)} lançado com sucesso.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-xl shadow-xl flex flex-col max-h-full">
      <div className="px-4 py-3 border-b border-line-soft">
        <h3 className="text-sm font-medium text-ink flex items-center gap-2">
          <ShoppingCart className="w-3.5 h-3.5" /> Carrinho ({carrinho.length})
        </h3>
      </div>
      {carrinho.length === 0 ? (
        <p className="text-sm text-ink-faint text-center py-10 px-4">Toque em um produto para adicionar à venda.</p>
      ) : (
        <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 320 }}>
          {carrinho.map(item => (
            <div key={item.varianteId} className="flex gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{item.nome}</p>
                <p className="text-xs text-ink-faint">{[item.tamanho, item.cor].filter(Boolean).join(' · ')}{item.tamanho || item.cor ? ' · ' : ''}{formatCurrency(item.precoUnitario)} un.</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => onAtualizarQtd(item.varianteId, item.quantidade - 1)} className="w-6 h-6 rounded-full bg-surface-subtle flex items-center justify-center text-ink-soft"><Minus className="w-3 h-3" /></button>
                  <span className="text-sm w-4 text-center tabular-nums">{item.quantidade}</span>
                  <button onClick={() => onAtualizarQtd(item.varianteId, item.quantidade + 1)} className="w-6 h-6 rounded-full bg-surface-subtle flex items-center justify-center text-ink-soft"><Plus className="w-3 h-3" /></button>
                  <select value={item.desconto} onChange={e => onAtualizarDesconto(item.varianteId, Number(e.target.value))} className="text-xs border border-line rounded-md px-1 py-0.5 ml-auto text-ink-faint bg-surface">
                    {!opcoesDesconto.includes(item.desconto) && <option value={item.desconto}>{item.desconto}%</option>}
                    {opcoesDesconto.map(o => <option key={o} value={o}>{o === 0 ? 'Sem desc.' : `${o}%`}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-ink tabular-nums">{formatCurrency(item.quantidade * item.precoUnitario * (1 - item.desconto / 100))}</p>
                <button onClick={() => onRemover(item.varianteId)} className="text-ink-faint hover:text-critical mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {carrinho.length > 0 && (
        <div className="p-4 border-t border-line-soft space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-ink-faint"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
            {totalDesconto > 0 && <div className="flex justify-between text-accent"><span>Desconto</span><span className="tabular-nums">-{formatCurrency(totalDesconto)}</span></div>}
            <div className="flex justify-between font-semibold text-ink text-lg pt-1"><span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map(fp => {
              const Icon = fp.icon;
              const ativo = formaPagamento === fp.id;
              return (
                <button key={fp.id} onClick={() => setFormaPagamento(fp.id)} className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium border transition-colors ${ativo ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:bg-surface-subtle'}`}>
                  <Icon className="w-3.5 h-3.5" /> {fp.label}
                </button>
              );
            })}
          </div>
          {erro && <p className="text-xs text-critical">{erro}</p>}
          <button onClick={handleFinalizar} disabled={processando} className="w-full text-white font-medium py-3 rounded-md text-sm bg-accent hover:bg-accent-hover disabled:opacity-60">
            {processando ? 'Processando...' : `Finalizar venda · ${formatCurrency(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}
