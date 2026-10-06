import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// KPI minimalista: número grande, rótulo pequeno, variação discreta.
// Usado em uma faixa horizontal dividida por linhas finas, não em caixas coloridas.
export default function StatCard({ label, value, sublabel, variacao }) {
  return (
    <div className="flex-1 min-w-[140px] px-5 py-4 first:pl-0 last:pr-0">
      <p className="text-xs text-ink-faint mb-1.5">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-ink tracking-tight">{value}</p>
        {variacao !== undefined && variacao !== null && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${variacao >= 0 ? 'text-positive' : 'text-critical'}`}>
            {variacao >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(variacao).toFixed(0)}%
          </span>
        )}
      </div>
      {sublabel && <p className="text-xs text-ink-faint mt-1">{sublabel}</p>}
    </div>
  );
}

export function StatStrip({ children }) {
  return (
    <div className="bg-surface border border-line rounded-xl flex flex-wrap divide-x divide-line">
      {children}
    </div>
  );
}
