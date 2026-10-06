import React from 'react';
import { Compass } from 'lucide-react';
import EmptyState from './ui/EmptyState.jsx';

export default function ComingSoon({ titulo }) {
  return (
    <div className="bg-surface border border-line rounded-xl">
      <EmptyState
        icon={Compass}
        title={`${titulo} está a caminho`}
        description="Esse módulo já está previsto na estrutura do sistema. Ele será ativado numa próxima etapa, junto com as tabelas e a API necessárias no backend."
      />
    </div>
  );
}
