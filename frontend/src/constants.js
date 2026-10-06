import { Banknote, CreditCard, Zap } from 'lucide-react';

export const CATEGORIAS = ['Camisetas', 'Blusas', 'Calças', 'Shorts', 'Vestidos', 'Saias', 'Jaquetas', 'Acessórios'];

export const FORMAS_PAGAMENTO = [
  { id: 'Dinheiro', label: 'Dinheiro', icon: Banknote },
  { id: 'Cartão de Débito', label: 'Débito', icon: CreditCard },
  { id: 'Cartão de Crédito', label: 'Crédito', icon: CreditCard },
  { id: 'Pix', label: 'Pix', icon: Zap },
];

export const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export const DENOMINACOES = [
  { valor: 200 }, { valor: 100 }, { valor: 50 }, { valor: 20 }, { valor: 10 }, { valor: 5 }, { valor: 2 },
  { valor: 1 }, { valor: 0.5 }, { valor: 0.25 }, { valor: 0.1 }, { valor: 0.05 },
];

export const CATEGORIAS_ENTRADA = ['Reforço de troco', 'Aporte/Depósito do proprietário', 'Outra entrada'];
export const CATEGORIAS_SAIDA = ['Sangria (retirada de segurança)', 'Pagamento de despesa', 'Pagamento a fornecedor', 'Retirada do proprietário', 'Outra saída'];

// Módulos futuros — navegação já preparada, backend ainda não implementado.
// Ver ROADMAP-BACKEND.md na raiz do projeto para o que cada um exige.
export const MODULOS_FUTUROS = [
  { id: 'clientes', label: 'Clientes' },
  { id: 'fornecedores', label: 'Fornecedores' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'configuracoes', label: 'Configurações' },
];
