import express from 'express';
import cors from 'cors';
import path from 'path'; // Importando 'path' para manipular caminhos de diretórios
import routes from './routes/usuarioRoutes';

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api', routes);

// Usando o 'path' para servir arquivos estáticos (por exemplo, para servir o frontend depois de construído)
const staticPath = path.join(__dirname, '../frontend/build');
app.use(express.static(staticPath));

// Servir o frontend em produção
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

