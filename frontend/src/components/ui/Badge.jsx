import React from 'react';

// Indicador discreto de status — ponto + texto, sem selo colorido pesado.
export default function Badge({ children, tone = 'neutral' }) {
  const dot = {
    neutral: 'bg-ink-faint',
    positive: 'bg-positive',
    warning: 'bg-warning',
    critical: 'bg-critical',
  };
  const text = {
    neutral: 'text-ink-soft',
    positive: 'text-positive',
    warning: 'text-warning',
    critical: 'text-critical',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot[tone]}`}></span>
      {children}
    </span>
  );
}
