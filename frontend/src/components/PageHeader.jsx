import React from 'react';

export default function PageHeader({ titulo, subtitulo, acoes }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-ink tracking-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-ink-faint mt-0.5">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
    </div>
  );
}
