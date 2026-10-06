import React, { useState } from 'react';
import { Shirt, Gem } from 'lucide-react';

export default function ProductVisual({ produto }) {
  const [erro, setErro] = useState(false);
  const Icone = produto.categoria === 'Acessórios' ? Gem : Shirt;
  if (produto.foto && !erro) {
    return <img src={produto.foto} alt={produto.nome} className="w-full h-full object-cover" onError={() => setErro(true)} />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-surface-subtle">
      <Icone className="w-7 h-7 text-ink-faint" strokeWidth={1.25} />
    </div>
  );
}
