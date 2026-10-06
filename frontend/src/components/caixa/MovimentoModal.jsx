import React, { useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA } from '../../constants.js';

const inputCls = "w-full px-3 py-2 rounded-md border border-line text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent";

export default function MovimentoModal({ tipo, onSalvar, onClose }) {
  const categorias = tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const [categoria, setCategoria] = useState(categorias[0]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const v = parseFloat(valor);
    if (!v || v <= 0) return;
    setSalvando(true);
    setErro('');
    try {
      await onSalvar({ categoria, descricao: descricao.trim(), valor: v });
    } catch (err) {
      setErro(err.message || 'Não foi possível registrar.');
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída'} onClose={onClose} largura="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-ink-soft">Motivo</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={`${inputCls} mt-1`}>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-soft">Observação (opcional)</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhe, se quiser" className={`${inputCls} mt-1`} />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-soft">Valor (R$)</label>
          <input required autoFocus type="number" min="0.01" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={`${inputCls} mt-1`} />
        </div>
        {erro && <p className="text-xs text-critical">{erro}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-md text-sm font-medium text-ink-soft hover:bg-surface-subtle">Cancelar</button>
          <button type="submit" disabled={salvando} className={`px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-60 ${tipo === 'entrada' ? 'bg-positive hover:bg-emerald-800' : 'bg-critical hover:bg-red-800'}`}>
            {salvando ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
