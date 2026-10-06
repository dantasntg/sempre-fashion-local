import React, { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { DENOMINACOES } from '../../constants.js';
import { formatCurrency } from '../../utils.js';

export default function FecharCaixaModal({ valorEsperado, onConfirmar, onClose }) {
  const [modo, setModo] = useState('cedulas');
  const [valorDigitado, setValorDigitado] = useState('');
  const [quantidades, setQuantidades] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const totalCedulas = DENOMINACOES.reduce((acc, d) => acc + (Number(quantidades[d.valor]) || 0) * d.valor, 0);
  const contado = modo === 'cedulas' ? totalCedulas : parseFloat(valorDigitado);
  const diferenca = !isNaN(contado) ? contado - valorEsperado : null;

  function setQtd(valor, qtd) { setQuantidades(q => ({ ...q, [valor]: qtd })); }

  async function confirmar() {
    if (isNaN(contado)) return;
    setSalvando(true);
    setErro('');
    try {
      await onConfirmar(contado);
    } catch (err) {
      setErro(err.message || 'Não foi possível fechar o caixa.');
      setSalvando(false);
    }
  }

  return (
    <Modal titulo="Fechamento de caixa" onClose={onClose} largura="max-w-md">
      <div className="space-y-4">
        <div className="bg-surface-subtle rounded-lg p-3 flex justify-between text-sm">
          <span className="text-ink-soft">Saldo esperado em dinheiro</span>
          <span className="font-medium text-ink tabular-nums">{formatCurrency(valorEsperado)}</span>
        </div>

        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          <button type="button" onClick={() => setModo('cedulas')} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${modo === 'cedulas' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint'}`}>Contar cédulas</button>
          <button type="button" onClick={() => setModo('total')} className={`flex-1 py-1.5 rounded-md text-xs font-medium ${modo === 'total' ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint'}`}>Digitar total</button>
        </div>

        {modo === 'cedulas' ? (
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
            {DENOMINACOES.map(d => (
              <div key={d.valor} className="flex items-center justify-between gap-2 py-1">
                <span className="text-sm text-ink-soft w-16 shrink-0 tabular-nums">{formatCurrency(d.valor)}</span>
                <input type="number" min="0" inputMode="numeric" value={quantidades[d.valor] || ''} onChange={e => setQtd(d.valor, e.target.value)} placeholder="0" className="flex-1 px-2 py-1.5 rounded-md border border-line text-sm text-center bg-surface" />
                <span className="text-xs text-ink-faint w-20 text-right shrink-0 tabular-nums">{formatCurrency((Number(quantidades[d.valor]) || 0) * d.valor)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-line-soft font-medium text-ink text-sm">
              <span>Total contado</span><span className="tabular-nums">{formatCurrency(totalCedulas)}</span>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium text-ink-soft">Valor contado na gaveta (R$)</label>
            <input autoFocus type="number" min="0" step="0.01" value={valorDigitado} onChange={e => setValorDigitado(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border border-line text-sm bg-surface" />
          </div>
        )}

        {diferenca !== null && !isNaN(diferenca) && (
          <p className={`text-sm font-medium ${diferenca === 0 ? 'text-positive' : diferenca > 0 ? 'text-ink-soft' : 'text-critical'}`}>
            {diferenca === 0 ? 'Caixa bate certinho' : diferenca > 0 ? `Sobra de ${formatCurrency(diferenca)}` : `Falta de ${formatCurrency(Math.abs(diferenca))}`}
          </p>
        )}

        {erro && <p className="text-sm text-critical">{erro}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-md text-sm font-medium text-ink-soft hover:bg-surface-subtle">Cancelar</button>
          <button onClick={confirmar} disabled={isNaN(contado) || salvando} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-ink hover:bg-accent disabled:opacity-50">
            {salvando ? 'Fechando...' : 'Fechar caixa'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
