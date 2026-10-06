import React from 'react';
import { X } from 'lucide-react';

export function Modal({ titulo, subtitulo, onClose, children, largura = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={`bg-surface rounded-xl shadow-2xl w-full ${largura} max-h-full overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface rounded-t-xl">
          <div>
            <h3 className="font-semibold text-ink text-[15px]">{titulo}</h3>
            {subtitulo && <p className="text-xs text-ink-faint mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink p-1 rounded-md hover:bg-surface-subtle -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ titulo, mensagem, onConfirmar, onCancelar, destrutivo = true }) {
  return (
    <Modal titulo={titulo} onClose={onCancelar} largura="max-w-sm">
      <p className="text-sm text-ink-soft mb-5">{mensagem}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancelar} className="px-3.5 py-2 rounded-md text-sm font-medium text-ink-soft hover:bg-surface-subtle">Cancelar</button>
        <button onClick={onConfirmar} className={`px-3.5 py-2 rounded-md text-sm font-medium text-white ${destrutivo ? 'bg-critical hover:bg-red-800' : 'bg-accent hover:bg-accent-hover'}`}>Confirmar</button>
      </div>
    </Modal>
  );
}
