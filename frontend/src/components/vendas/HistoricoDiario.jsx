import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { StatStrip } from '../ui/StatCard.jsx';
import StatCard from '../ui/StatCard.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { hojeISO, dataParaChave, chaveParaData, formatChaveBR, formatCurrency, agregarVendidos } from '../../utils.js';

export default function HistoricoDiario({ vendas }) {
  const [dataEscolhida, setDataEscolhida] = useState(hojeISO());
  const ehHoje = dataEscolhida === hojeISO();

  const vendasDoDia = useMemo(() => vendas.filter(v => dataParaChave(v.data) === dataEscolhida).sort((a, b) => b.data.localeCompare(a.data)), [vendas, dataEscolhida]);
  const totalDia = vendasDoDia.reduce((a, v) => a + v.total, 0);
  const ticketMedio = vendasDoDia.length ? totalDia / vendasDoDia.length : 0;
  const maisVendidosDia = useMemo(() => agregarVendidos(vendasDoDia).slice(0, 5), [vendasDoDia]);

  function mudarDia(delta) {
    const d = chaveParaData(dataEscolhida);
    d.setDate(d.getDate() + delta);
    const novaChave = dataParaChave(d);
    if (novaChave > hojeISO()) return;
    setDataEscolhida(novaChave);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => mudarDia(-1)} className="w-7 h-7 rounded-full hover:bg-surface-subtle flex items-center justify-center text-ink-soft"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-medium text-ink w-28 text-center">{ehHoje ? 'Hoje' : formatChaveBR(dataEscolhida)}</p>
        <button onClick={() => mudarDia(1)} disabled={ehHoje} className="w-7 h-7 rounded-full hover:bg-surface-subtle flex items-center justify-center text-ink-soft disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <StatStrip>
        <StatCard label="Vendas" value={String(vendasDoDia.length)} />
        <StatCard label="Faturado" value={formatCurrency(totalDia)} />
        <StatCard label="Ticket médio" value={formatCurrency(ticketMedio)} />
      </StatStrip>

      <div className="bg-surface border border-line rounded-xl p-5">
        <h3 className="text-sm font-medium text-ink mb-1">O que mais saiu</h3>
        <p className="text-xs text-ink-faint mb-4">Neste dia, por quantidade</p>
        {maisVendidosDia.length === 0 ? (
          <p className="text-sm text-ink-faint py-6 text-center">Sem vendas nesse dia.</p>
        ) : (
          <div className="space-y-3">
            {maisVendidosDia.map((p, i) => {
              const max = maisVendidosDia[0].quantidade;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-ink-faint w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-soft truncate">{p.nome}</span>
                      <span className="text-ink-faint shrink-0 ml-2">{p.quantidade} un.</span>
                    </div>
                    <div className="h-1 bg-line-soft rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(p.quantidade / max) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-surface border border-line rounded-xl p-5">
        <h3 className="text-sm font-medium text-ink mb-3">Vendas do dia</h3>
        {vendasDoDia.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma venda registrada nesse dia" />
        ) : (
          <div className="divide-y divide-line-soft">
            {vendasDoDia.map(v => (
              <div key={v.id} className="py-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs text-ink-faint">{v.hora} · {v.formaPagamento}</span>
                  <span className="text-sm font-medium text-ink tabular-nums">{formatCurrency(v.total)}</span>
                </div>
                <p className="text-sm text-ink-soft">{v.itens.map(it => `${it.nome} x${it.quantidade}`).join(', ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
