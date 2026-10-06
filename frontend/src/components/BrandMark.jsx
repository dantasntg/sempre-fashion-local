import React from 'react';

// Identidade tipográfica da marca — sem ícone, sem símbolo.
// Funciona em qualquer contexto: sidebar, impressão, relatórios, tela de login futura.
export default function BrandMark({ size = 'default' }) {
  const tamanhos = {
    default: { linha: 'text-[15px]', tracking: 'tracking-[0.15em]' },
    large: { linha: 'text-2xl', tracking: 'tracking-[0.1em]' },
  };
  const t = tamanhos[size];
  return (
    <div className={`font-display ${t.linha} ${t.tracking} leading-[1.15] text-ink select-none`}>
      <div>SEMPRE</div>
      <div className="text-accent">FASHION</div>
    </div>
  );
}
