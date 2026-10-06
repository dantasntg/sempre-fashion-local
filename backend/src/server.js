const express = require('express');
const cors = require('cors');

const { seedIfEmpty } = require('./seed');
const produtosRouter = require('./routes/produtos');
const vendasRouter = require('./routes/vendas');
const caixaRouter = require('./routes/caixa');
const dadosRouter = require('./routes/dados');

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // fotos em base64 podem ser grandes

app.get('/api/health', (req, res) => res.json({ ok: true, nome: 'Sempre Fashion API' }));

app.use('/api/produtos', produtosRouter);
app.use('/api/vendas', vendasRouter);
app.use('/api/caixa', caixaRouter);
app.use('/api/dados', dadosRouter);

app.use((req, res) => res.status(404).json({ error: 'rota não encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'erro interno do servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Sempre Fashion API rodando em http://localhost:${PORT}`);
  console.log(`Banco de dados SQLite em backend/data/sempre-fashion.db`);
});
