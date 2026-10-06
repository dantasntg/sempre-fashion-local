import React, { useState } from 'react';
import {
  Wallet, LogIn, LogOut, Plus, Minus, AlertTriangle, History, Copy, Check, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import PageHeader from '../PageHeader.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import MovimentoModal from './MovimentoModal.jsx';
import FecharCaixaModal from './FecharCaixaModal.jsx';
import { hojeISO, formatChaveBR, formatCurrency } from '../../utils.js';

function LinhaMovimento({ m }) {
  const negativo = m.tipo === 'saida';
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-ink truncate">{m.tipo === 'venda' ? m.descricao : m.categoria}</p>
        <p className="text-xs text-ink-faint truncate">{m.hora}{m.formaPagamento ? ` · ${m.formaPagamento}` : ''}{m.tipo !== 'venda' && m.descricao ? ` · ${m.descricao}` : ''}</p>
      </div>
      <span className={`text-sm font-medium shrink-0 tabular-nums ${negativo ? 'text-critical' : 'text-ink'}`}>{negativo ? '−' : '+'}{formatCurrency(m.valor)}</span>
    </div>
  );
}

export default function Caixa({ caixa, onAbrir, onFechar, onAdicionarMovimento }) {
  const hoje = hojeISO();
  const { atual, historico } = caixa;
  const abertoHoje = atual.aberto && atual.data === hoje;
  const abertoAtrasado = atual.aberto && atual.data !== hoje;

  const [valorAbertura, setValorAbertura] = useState(String(historico[0]?.valorAbertura ?? 100));
  const [modalMovimento, setModalMovimento] = useState(null);
  const [modalFechar, setModalFechar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erroAbrir, setErroAbrir] = useState('');
  const [abrindo, setAbrindo] = useState(false);

  const vendasDinheiro = atual.movimentos.filter(m => m.tipo === 'venda' && m.formaPagamento === 'Dinheiro');
  const vendasOutros = atual.movimentos.filter(m => m.tipo === 'venda' && m.formaPagamento !== 'Dinheiro');
  const entradas = atual.movimentos.filter(m => m.tipo === 'entrada');
  const saidas = atual.movimentos.filter(m => m.tipo === 'saida');
  const totalVendasDinheiro = vendasDinheiro.reduce((a, m) => a + m.valor, 0);
  const totalVendasOutros = vendasOutros.reduce((a, m) => a + m.valor, 0);
  const totalEntradas = entradas.reduce((a, m) => a + m.valor, 0);
  const totalSaidas = saidas.reduce((a, m) => a + m.valor, 0);
  const valorEsperado = atual.valorAbertura + totalVendasDinheiro + totalEntradas - totalSaidas;
  const numVendas = vendasDinheiro.length + vendasOutros.length;

  async function handleAbrir(e) {
    e.preventDefault();
    setAbrindo(true);
    setErroAbrir('');
    try {
      await onAbrir(parseFloat(valorAbertura) || 0);
    } catch (err) {
      setErroAbrir(err.message || 'Não foi possível abrir o caixa.');
    } finally {
      setAbrindo(false);
    }
  }

  function copiarResumo() {
    const linhasEntradas = entradas.map(m => `  • ${m.categoria}: ${formatCurrency(m.valor)}`).join('\n');
    const linhasSaidas = saidas.map(m => `  • ${m.categoria}: ${formatCurrency(m.valor)}`).join('\n');
    const partes = [
      `Resumo de caixa — ${formatChaveBR(atual.data)}`,
      `Abertura: ${formatCurrency(atual.valorAbertura)}${atual.horaAbertura ? ` às ${atual.horaAbertura}` : ''}`,
      `Vendas: ${numVendas} (${formatCurrency(totalVendasDinheiro + totalVendasOutros)})`,
      `  Dinheiro: ${formatCurrency(totalVendasDinheiro)}`,
      `  Cartão/Pix: ${formatCurrency(totalVendasOutros)}`,
      totalEntradas > 0 ? `Entradas: ${formatCurrency(totalEntradas)}\n${linhasEntradas}` : null,
      totalSaidas > 0 ? `Saídas: ${formatCurrency(totalSaidas)}\n${linhasSaidas}` : null,
      `Saldo esperado em dinheiro: ${formatCurrency(valorEsperado)}`,
    ].filter(Boolean).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(partes).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }).catch(() => {});
    }
  }

  const historicoRecente = historico.slice(0, 7);
  const maiorTotalRecente = Math.max(...historicoRecente.map(h => h.totalVendasDinheiro + h.totalVendasOutros), 1);

  return (
    <div>
      <PageHeader
        titulo="Caixa"
        subtitulo={atual.aberto ? `Aberto às ${atual.horaAbertura || '—'} · ${formatChaveBR(atual.data)}` : 'Fechado'}
        acoes={
          atual.aberto ? (
            <button onClick={copiarResumo} className="text-xs font-medium flex items-center gap-1.5 text-ink-soft hover:text-ink px-2.5 py-1.5 rounded-md hover:bg-surface-subtle">
              {copiado ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? 'Copiado' : 'Copiar resumo'}
            </button>
          ) : null
        }
      />

      {abertoAtrasado && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.06] p-4 flex items-start gap-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">O caixa do dia {formatChaveBR(atual.data)} ficou aberto</p>
            <p className="text-xs text-ink-faint mb-3">Feche esse caixa antes de abrir o de hoje.</p>
            <button onClick={() => setModalFechar(true)} className="text-white text-sm font-medium px-3.5 py-2 rounded-md bg-warning hover:opacity-90">Fechar caixa de {formatChaveBR(atual.data)}</button>
          </div>
        </div>
      )}

      {!atual.aberto && (
        <div className="bg-surface border border-line rounded-xl max-w-sm">
          <EmptyState
            icon={Wallet}
            title="Caixa fechado"
            description="Abra o caixa para começar a registrar vendas e movimentações de hoje."
            action={
              <form onSubmit={handleAbrir} className="space-y-3 text-left w-56">
                <div>
                  <label className="text-xs font-medium text-ink-soft">Valor inicial (fundo de troco)</label>
                  <input type="number" min="0" step="0.01" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border border-line text-sm bg-surface" />
                </div>
                {erroAbrir && <p className="text-xs text-critical">{erroAbrir}</p>}
                <button type="submit" disabled={abrindo} className="w-full text-white font-medium py-2.5 rounded-md text-sm flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-60">
                  <LogIn className="w-4 h-4" /> {abrindo ? 'Abrindo...' : 'Abrir caixa'}
                </button>
              </form>
            }
          />
        </div>
      )}

      {(abertoHoje || abertoAtrasado) && (
        <div className="space-y-5">
          {/* Saldo — destaque principal */}
          <div className="bg-surface border border-line rounded-xl p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-ink-faint mb-1">Saldo esperado em dinheiro</p>
              <p className="text-3xl font-semibold text-ink tracking-tight tabular-nums">{formatCurrency(valorEsperado)}</p>
            </div>
            {abertoHoje && (
              <div className="flex gap-2">
                <button onClick={() => setModalMovimento('entrada')} className="flex items-center gap-1.5 border border-line hover:bg-surface-subtle text-ink-soft font-medium px-3.5 py-2 rounded-md text-sm">
                  <Plus className="w-3.5 h-3.5 text-positive" /> Entrada
                </button>
                <button onClick={() => setModalMovimento('saida')} className="flex items-center gap-1.5 border border-line hover:bg-surface-subtle text-ink-soft font-medium px-3.5 py-2 rounded-md text-sm">
                  <Minus className="w-3.5 h-3.5 text-critical" /> Saída
                </button>
                <button onClick={() => setModalFechar(true)} className="flex items-center gap-1.5 bg-ink hover:bg-accent text-white font-medium px-3.5 py-2 rounded-md text-sm">
                  <LogOut className="w-3.5 h-3.5" /> Fechar caixa
                </button>
              </div>
            )}
          </div>

          {/* Entradas / Saídas — separados de verdade, como pediu */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-surface border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-positive" />
                  <h3 className="text-sm font-medium text-ink">Entradas</h3>
                </div>
                <span className="text-sm font-medium text-ink tabular-nums">{formatCurrency(totalVendasDinheiro + totalVendasOutros + totalEntradas)}</span>
              </div>
              <div className="divide-y divide-line-soft">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-ink-faint">Vendas em dinheiro</span>
                  <span className="text-ink-soft tabular-nums">{formatCurrency(totalVendasDinheiro)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-ink-faint">Vendas em cartão/Pix</span>
                  <span className="text-ink-soft tabular-nums">{formatCurrency(totalVendasOutros)}</span>
                </div>
                {entradas.map(m => (
                  <div key={m.id} className="flex justify-between py-2 text-sm">
                    <span className="text-ink-faint">{m.categoria}</span>
                    <span className="text-ink-soft tabular-nums">{formatCurrency(m.valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-line rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-critical" />
                  <h3 className="text-sm font-medium text-ink">Saídas</h3>
                </div>
                <span className="text-sm font-medium text-ink tabular-nums">{formatCurrency(totalSaidas)}</span>
              </div>
              {saidas.length === 0 ? (
                <p className="text-sm text-ink-faint py-4">Nenhuma saída registrada hoje.</p>
              ) : (
                <div className="divide-y divide-line-soft">
                  {saidas.map(m => (
                    <div key={m.id} className="flex justify-between py-2 text-sm">
                      <span className="text-ink-faint">{m.categoria}</span>
                      <span className="text-ink-soft tabular-nums">{formatCurrency(m.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {atual.movimentos.length > 0 && (
            <div className="bg-surface border border-line rounded-xl p-5">
              <h3 className="text-sm font-medium text-ink mb-2">Extrato do dia</h3>
              <div className="divide-y divide-line-soft">
                {[...atual.movimentos].reverse().map(m => <LinhaMovimento key={m.id} m={m} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {historicoRecente.length > 0 && (
        <div className="bg-surface border border-line rounded-xl p-5 mt-5">
          <h3 className="text-sm font-medium text-ink mb-4">Últimos fechamentos</h3>
          <div className="flex items-end gap-2" style={{ height: 80 }}>
            {[...historicoRecente].reverse().map((h, i) => {
              const altura = ((h.totalVendasDinheiro + h.totalVendasOutros) / maiorTotalRecente) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className={`w-full rounded-t-sm ${h.diferenca === 0 ? 'bg-ink-faint/40' : 'bg-warning'}`} style={{ height: `${Math.max(altura, 4)}%` }}></div>
                  <span className="text-[11px] text-ink-faint mt-1.5">{formatChaveBR(h.data).slice(0, 5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {historico.length > 0 && (
        <div className="bg-surface border border-line rounded-xl overflow-x-auto mt-5">
          <div className="p-5 pb-0 flex items-center gap-2">
            <History className="w-4 h-4 text-ink-faint" />
            <h3 className="text-sm font-medium text-ink">Histórico de fechamentos</h3>
          </div>
          <table className="w-full text-left mt-3">
            <thead>
              <tr className="text-xs text-ink-faint border-b border-line">
                <th className="py-2 pl-5 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Vendas</th>
                <th className="py-2 pr-3 font-medium">Esperado</th>
                <th className="py-2 pr-3 font-medium">Contado</th>
                <th className="py-2 pr-5 font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {historico.slice(0, 15).map((h, i) => (
                <tr key={i} className="border-b border-line-soft last:border-0">
                  <td className="py-2 pl-5 pr-3 text-sm text-ink-soft whitespace-nowrap">{formatChaveBR(h.data)}</td>
                  <td className="py-2 pr-3 text-sm text-ink-soft">{h.numVendas}</td>
                  <td className="py-2 pr-3 text-sm text-ink-soft whitespace-nowrap tabular-nums">{formatCurrency(h.valorEsperado)}</td>
                  <td className="py-2 pr-3 text-sm text-ink-soft whitespace-nowrap tabular-nums">{formatCurrency(h.valorContado)}</td>
                  <td className={`py-2 pr-5 text-sm font-medium whitespace-nowrap tabular-nums ${h.diferenca === 0 ? 'text-positive' : h.diferenca > 0 ? 'text-ink-soft' : 'text-critical'}`}>
                    {h.diferenca === 0 ? '—' : formatCurrency(h.diferenca)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMovimento && (
        <MovimentoModal tipo={modalMovimento} onClose={() => setModalMovimento(null)} onSalvar={async dados => { await onAdicionarMovimento(modalMovimento, dados); setModalMovimento(null); }} />
      )}
      {modalFechar && (
        <FecharCaixaModal valorEsperado={valorEsperado} onClose={() => setModalFechar(false)} onConfirmar={async valorContado => { await onFechar(valorContado); setModalFechar(false); }} />
      )}
    </div>
  );
}
