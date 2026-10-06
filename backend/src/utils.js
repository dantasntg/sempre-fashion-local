const CATEGORIA_PREFIXOS = {
  'Camisetas': 'CAM', 'Blusas': 'BLU', 'Calças': 'CAL', 'Shorts': 'SHO',
  'Vestidos': 'VES', 'Saias': 'SAI', 'Jaquetas': 'JAQ', 'Acessórios': 'ACE',
};

// --- Contadores persistidos em disco (tabela `contadores`) ------------------
// Nunca dependem de memória RAM: sobrevivem a reiniciar o servidor.
function proximoContador(db, chave, minimoInicial = 0) {
  const row = db.prepare('SELECT valor FROM contadores WHERE chave = ?').get(chave);
  const atual = row ? row.valor : minimoInicial;
  const novo = atual + 1;
  if (row) db.prepare('UPDATE contadores SET valor = ? WHERE chave = ?').run(novo, chave);
  else db.prepare('INSERT INTO contadores (chave, valor) VALUES (?, ?)').run(chave, novo);
  return novo;
}

// Usado só durante a migração, pra garantir que o contador nunca comece
// atrás de um número que já existia nos dados antigos.
function garantirContadorMinimo(db, chave, minimo) {
  const row = db.prepare('SELECT valor FROM contadores WHERE chave = ?').get(chave);
  if (!row) db.prepare('INSERT INTO contadores (chave, valor) VALUES (?, ?)').run(chave, minimo);
  else if (row.valor < minimo) db.prepare('UPDATE contadores SET valor = ? WHERE chave = ?').run(minimo, chave);
}

// Código-base do PRODUTO (ex: "CAM-0001"). Um por produto, gerado uma vez.
function gerarCodigoBaseProduto(db, categoria) {
  const prefixo = CATEGORIA_PREFIXOS[categoria] || categoria.slice(0, 3).toUpperCase();
  const n = proximoContador(db, `sku_${prefixo}`);
  return `${prefixo}-${String(n).padStart(4, '0')}`;
}

// Código de barras INTERNO da loja (ex: "SF000001"). Não é GTIN/EAN oficial.
// Code 128 é o formato usado para renderizar/ler esse identificador.
function gerarCodigoBarras(db) {
  const n = proximoContador(db, 'barcode');
  return `SF${String(n).padStart(6, '0')}`;
}

function abreviarCor(cor) {
  if (!cor) return 'UNI';
  return cor.trim().slice(0, 3).toUpperCase();
}

// SKU da VARIAÇÃO (ex: "CAM-0001-M-PRE"). Único por variação — se colidir
// (mesmo tamanho+cor cadastrado duas vezes), acrescenta um sufixo numérico.
function gerarSkuVariante(db, codigoBase, tamanho, cor) {
  const tam = (tamanho || 'U').toString().trim().toUpperCase().slice(0, 3) || 'U';
  const corAbrev = abreviarCor(cor);
  let sku = `${codigoBase}-${tam}-${corAbrev}`;
  let n = 2;
  while (db.prepare('SELECT 1 FROM produto_variantes WHERE sku = ?').get(sku)) {
    sku = `${codigoBase}-${tam}-${corAbrev}-${n}`;
    n++;
  }
  return sku;
}

// Chave "AAAA-MM-DD" no fuso horário local do servidor
function dataParaChave(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function horaAgora(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  CATEGORIA_PREFIXOS,
  proximoContador, garantirContadorMinimo,
  gerarCodigoBaseProduto, gerarCodigoBarras, gerarSkuVariante, abreviarCor,
  dataParaChave, horaAgora, uid,
};
