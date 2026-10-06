import { MESES_ABREV } from './constants.js';

export function formatCurrency(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dataParaChave(valor) {
  const d = typeof valor === 'string' ? new Date(valor) : valor;
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function chaveParaData(chave) {
  const [ano, mes, dia] = chave.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function hojeISO() {
  return dataParaChave(new Date());
}

export function formatDateBR(valorIso) {
  return new Date(valorIso).toLocaleDateString('pt-BR');
}

export function formatChaveBR(chave) {
  const [ano, mes, dia] = chave.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarMesLabel(chaveAnoMes) {
  const [ano, mes] = chaveAnoMes.split('-');
  return `${MESES_ABREV[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

export function caixaVazio() {
  return { aberto: false, data: null, horaAbertura: null, valorAbertura: 0, movimentos: [] };
}

export function variacaoPercentual(atual, anterior) {
  if (anterior === undefined || anterior === null) return null;
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function categoriasDeProdutos(produtos, somenteComEstoque) {
  const lista = produtos.filter(p => !somenteComEstoque || p.variantes.some(v => v.quantidade > 0)).map(p => p.categoria);
  return Array.from(new Set(lista)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Achata produto+variantes em uma linha por variação — usado na tabela de
// Estoque e na busca (nome, marca, categoria, SKU, código de barras, tamanho, cor).
export function linhasEstoque(produtos) {
  const linhas = [];
  produtos.forEach(p => {
    p.variantes.forEach(v => {
      linhas.push({ produto: p, variante: v });
    });
  });
  return linhas;
}

export function processarImagemArquivo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('não é imagem')); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 480;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('falha ao carregar imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export function calcularDadosMensais(vendas) {
  const meses = {};
  vendas.forEach(v => {
    const chave = dataParaChave(v.data).slice(0, 7);
    if (!meses[chave]) meses[chave] = { receita: 0, custo: 0, qtdVendas: 0 };
    meses[chave].qtdVendas += 1;
    v.itens.forEach(it => {
      meses[chave].receita += it.quantidade * it.precoUnitario * (1 - (it.desconto || 0) / 100);
      meses[chave].custo += it.quantidade * (it.custoUnitario || 0);
    });
  });
  const chaves = Object.keys(meses).sort();
  const ultimas6 = chaves.slice(-6);
  return ultimas6.map(chave => ({
    mes: formatarMesLabel(chave),
    chave,
    receita: Number(meses[chave].receita.toFixed(2)),
    custo: Number(meses[chave].custo.toFixed(2)),
    lucro: Number((meses[chave].receita - meses[chave].custo).toFixed(2)),
    qtdVendas: meses[chave].qtdVendas,
  }));
}

export function agregarVendidos(vendasFiltradas) {
  const contagem = {};
  vendasFiltradas.forEach(v => v.itens.forEach(it => {
    if (!contagem[it.produtoId]) contagem[it.produtoId] = { nome: it.nome, quantidade: 0 };
    contagem[it.produtoId].quantidade += it.quantidade;
  }));
  return Object.values(contagem).sort((a, b) => b.quantidade - a.quantidade);
}

export function calcularMaisVendidos(vendas, dias) {
  const limite = new Date();
  limite.setDate(limite.getDate() - dias);
  return agregarVendidos(vendas.filter(v => new Date(v.data) >= limite)).slice(0, 5);
}

export function calcularAlertas(produtos, vendas) {
  const hoje = new Date();
  const ultimaVendaPorVariante = {};
  vendas.forEach(v => {
    const d = new Date(v.data);
    v.itens.forEach(it => {
      const chave = it.varianteId || it.produtoId;
      if (!ultimaVendaPorVariante[chave] || d > ultimaVendaPorVariante[chave]) {
        ultimaVendaPorVariante[chave] = d;
      }
    });
  });
  const resultado = [];
  produtos.forEach(p => {
    p.variantes.forEach(v => {
      const tags = [];
      const minimo = v.estoqueMinimo ?? 3;
      if (v.quantidade === 0) tags.push({ tipo: 'sem-estoque', texto: 'Sem estoque' });
      else if (v.quantidade <= minimo) tags.push({ tipo: 'estoque-baixo', texto: `Só ${v.quantidade} un.` });
      const ultimaVenda = ultimaVendaPorVariante[v.id] || null;
      const dataBase = ultimaVenda || new Date(p.dataCadastro);
      const dias = Math.max(0, Math.floor((hoje - dataBase) / 86400000));
      if (v.quantidade > 0 && dias >= 30) {
        tags.push({ tipo: 'parado', texto: ultimaVenda ? `${dias}d sem vender` : `${dias}d, nunca vendido` });
      }
      if (tags.length > 0) resultado.push({ produto: p, variante: v, tags, diasSemVenda: dias });
    });
  });
  return resultado.sort((a, b) => b.diasSemVenda - a.diasSemVenda);
}

// Filtra vendas por um período pré-definido usado no filtro do Painel.
export function filtrarVendasPorPeriodo(vendas, periodo) {
  if (periodo === 'tudo') return vendas;
  const agora = new Date();
  let limite;
  if (periodo === 'hoje') {
    limite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  } else if (periodo === '7d') {
    limite = new Date(agora); limite.setDate(limite.getDate() - 6); limite.setHours(0, 0, 0, 0);
  } else if (periodo === '30d') {
    limite = new Date(agora); limite.setDate(limite.getDate() - 29); limite.setHours(0, 0, 0, 0);
  } else if (periodo === 'mes') {
    limite = new Date(agora.getFullYear(), agora.getMonth(), 1);
  } else {
    return vendas;
  }
  return vendas.filter(v => new Date(v.data) >= limite);
}

// Resumo financeiro (faturamento, lucro, margem, ticket médio) de uma lista de vendas já filtrada.
export function resumoFinanceiro(vendasFiltradas) {
  let receita = 0, custo = 0;
  vendasFiltradas.forEach(v => v.itens.forEach(it => {
    receita += it.quantidade * it.precoUnitario * (1 - (it.desconto || 0) / 100);
    custo += it.quantidade * (it.custoUnitario || 0);
  }));
  const lucro = receita - custo;
  const numVendas = vendasFiltradas.length;
  return {
    receita: Number(receita.toFixed(2)),
    custo: Number(custo.toFixed(2)),
    lucro: Number(lucro.toFixed(2)),
    margem: receita > 0 ? (lucro / receita) * 100 : 0,
    numVendas,
    ticketMedio: numVendas > 0 ? receita / numVendas : 0,
  };
}
