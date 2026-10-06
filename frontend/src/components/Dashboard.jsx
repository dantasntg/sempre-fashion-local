import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, TrendingUp, BarChart3, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from './PageHeader.jsx';
import { StatStrip } from './ui/StatCard.jsx';
import StatCard from './ui/StatCard.jsx';
import Badge from './ui/Badge.jsx';
import ProductVisual from './ui/ProductVisual.jsx';
import EmptyState from './ui/EmptyState.jsx';
import {
  hojeISO, dataParaChave, formatCurrency, formatDateBR,
  calcularDadosMensais, calcularMaisVendidos, calcularAlertas,
  filtrarVendasPorPeriodo, resumoFinanceiro,
} from '../utils.js';

const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'tudo', label: 'Tudo' },
];

export default function Dashboard({ produtos, vendas, caixa, irParaVendas, irParaEstoqueComFiltro }) {
  const [periodo, setPeriodo] = useState('30d');
  const hoje = hojeISO();

  const vendasHoje = useMemo(() => vendas.filter(v => dataParaChave(v.data) === hoje).sort((a, b) => b.data.localeCompare(a.data)), [vendas, hoje]);
  const vendasPeriodo = useMemo(() => filtrarVendasPorPeriodo(vendas, periodo), [vendas, periodo]);
  const resumo = useMemo(() => resumoFinanceiro(vendasPeriodo), [vendasPeriodo]);

  const dadosMensais = useMemo(() => calcularDadosMensais(vendas), [vendas]);
  const maisVendidos = useMemo(() => calcularMaisVendidos(vendasPeriodo.length ? vendasPeriodo : vendas, 3650), [vendasPeriodo, vendas]);
  const alertas = useMemo(() => calcularAlertas(produtos, vendas), [produtos, vendas]);

  const saldoCaixa = (caixa.atual.aberto && caixa.atual.data === hoje)
    ? caixa.atual.valorAbertura
      + caixa.atual.movimentos.filter(m => m.tipo === 'venda' && m.formaPagamento === 'Dinheiro').reduce((a, m) => a + m.valor, 0)
      + caixa.atual.movimentos.filter(m => m.tipo === 'entrada').reduce((a, m) => a + m.valor, 0)
      - caixa.atual.movimentos.filter(m => m.tipo === 'saida').reduce((a, m) => a + m.valor, 0)
    : null;

  return (
    <div>
      <PageHeader
        titulo="Painel"
        subtitulo="Como a loja está indo"
        acoes={
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${periodo === p.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-faint hover:text-ink-soft'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6">
        <StatStrip>
          <StatCard label="Faturamento" value={formatCurrency(resumo.receita)} sublabel={`${resumo.numVendas} venda(s)`} />
          <StatCard label="Lucro" value={formatCurrency(resumo.lucro)} sublabel={`Margem de ${resumo.margem.toFixed(0)}%`} />
          <StatCard label="Ticket médio" value={formatCurrency(resumo.ticketMedio)} />
          <StatCard label="Saldo em caixa" value={saldoCaixa !== null ? formatCurrency(saldoCaixa) : '—'} sublabel={saldoCaixa !== null ? 'Aberto hoje' : 'Fechado'} />
        </StatStrip>

        {alertas.length > 0 && (
          <div className="bg-surface border border-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-warning" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-ink">Peças que precisam de atenção</h3>
            </div>
            <div className="divide-y divide-line-soft">
              {alertas.slice(0, 5).map(a => (
                <button key={a.variante.id} onClick={() => irParaEstoqueComFiltro(a.produto.id)} className="w-full flex items-center gap-3 py-2.5 text-left group">
                  <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 border border-line-soft">
                    <ProductVisual produto={a.produto} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{a.produto.nome}{a.variante.tamanho || a.variante.cor ? ` · ${[a.variante.tamanho, a.variante.cor].filter(Boolean).join(' · ')}` : ''}</p>
                    <div className="flex gap-3 mt-0.5">
                      {a.tags.map((t, i) => (
                        <Badge key={i} tone={t.tipo === 'sem-estoque' ? 'critical' : t.tipo === 'estoque-baixo' ? 'warning' : 'neutral'}>{t.texto}</Badge>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
            {alertas.length > 5 && <p className="text-xs text-ink-faint mt-2">+ {alertas.length - 5} outro(s) item(ns)</p>}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-surface border border-line rounded-xl p-5">
            <h3 className="text-sm font-medium text-ink mb-4">Faturamento por mês</h3>
            {dadosMensais.length === 0 ? (
              <EmptyState icon={BarChart3} title="Sem dados suficientes ainda" />
            ) : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosMensais} margin={{ left: -20, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE8" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#A39D97' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#A39D97' }} axisLine={false} tickLine={false} tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E7E3DF' }} />
                    <Bar dataKey="receita" fill="#6B1F2A" radius={[3, 3, 0, 0]} name="Receita" maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-surface border border-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-ink-faint" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-ink">Mais vendidos no período</h3>
            </div>
            {maisVendidos.length === 0 ? (
              <EmptyState icon={TrendingUp} title="Nenhuma venda registrada ainda" />
            ) : (
              <div className="space-y-3">
                {maisVendidos.map((p, i) => {
                  const max = maisVendidos[0].quantidade;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-ink-faint w-4 tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-ink-soft truncate">{p.nome}</span>
                          <span className="text-ink-faint shrink-0 ml-2 tabular-nums">{p.quantidade} un.</span>
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
        </div>

        <div className="bg-surface border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-ink-faint" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-ink">Vendas de hoje</h3>
            </div>
            <button onClick={irParaVendas} className="text-xs font-medium text-accent hover:text-accent-hover">Nova venda</button>
          </div>
          {vendasHoje.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhuma venda lançada hoje ainda" />
          ) : (
            <div className="divide-y divide-line-soft">
              {vendasHoje.map(v => (
                <div key={v.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">{v.itens.map(it => it.nome).join(', ')}</p>
                    <p className="text-xs text-ink-faint">{v.hora || formatDateBR(v.data)} · {v.formaPagamento}</p>
                  </div>
                  <span className="text-sm font-medium text-ink shrink-0 tabular-nums">{formatCurrency(v.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
