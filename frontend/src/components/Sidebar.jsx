import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Wallet, Trash2 } from 'lucide-react';
import BrandMark from './BrandMark.jsx';
import { MODULOS_FUTUROS } from '../constants.js';

const ITENS_PRINCIPAIS = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'vendas', label: 'Vender', icon: ShoppingCart },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'caixa', label: 'Caixa', icon: Wallet },
];

function ItemNav({ ativo, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
        ativo ? 'bg-accent-soft text-accent font-medium' : 'text-ink-soft hover:bg-surface-subtle hover:text-ink'
      }`}
    >
      {Icon ? <Icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.6} /> : <span className="w-[17px] shrink-0" />}
      {label}
    </button>
  );
}

export default function Sidebar({ abaAtiva, setAbaAtiva, caixaAberto, onLimpar }) {
  return (
    <>
      {/* Desktop: coluna fixa à esquerda */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 border-r border-line bg-surface">
        <div className="px-5 pt-7 pb-6">
          <BrandMark />
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <p className="px-3 text-[11px] font-medium text-ink-faint uppercase tracking-wider mb-1.5">Operação</p>
          {ITENS_PRINCIPAIS.map(item => (
            <ItemNav key={item.id} ativo={abaAtiva === item.id} icon={item.icon} label={item.label} onClick={() => setAbaAtiva(item.id)} />
          ))}

          <p className="px-3 text-[11px] font-medium text-ink-faint uppercase tracking-wider mt-5 mb-1.5">Em breve</p>
          {MODULOS_FUTUROS.map(item => (
            <ItemNav key={item.id} ativo={abaAtiva === item.id} icon={null} label={item.label} onClick={() => setAbaAtiva(item.id)} />
          ))}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-line-soft">
          {caixaAberto && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-positive"></span>
              <span className="text-xs text-ink-soft">Caixa aberto</span>
            </div>
          )}
          <button onClick={onLimpar} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-ink-faint hover:text-critical hover:bg-surface-subtle">
            <Trash2 className="w-3.5 h-3.5" /> Limpar dados
          </button>
        </div>
      </aside>

      {/* Mobile/tablet: barra superior compacta */}
      <div className="lg:hidden border-b border-line bg-surface sticky top-0 z-30">
        <div className="px-4 pt-4">
          <BrandMark />
        </div>
        <nav className="flex gap-1 px-3 pb-2 pt-3 overflow-x-auto">
          {ITENS_PRINCIPAIS.map(item => {
            const Icon = item.icon;
            const ativo = abaAtiva === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAbaAtiva(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${ativo ? 'bg-accent-soft text-accent' : 'text-ink-soft'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
