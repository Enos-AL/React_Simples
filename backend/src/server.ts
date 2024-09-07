import http from 'http';
import { app } from './http';
import "./websocket";
import usuarioRoutes from './routes/usuarioRoutes';

const serverHttp = http.createServer(app);

// Início do servidor
const PORT = process.env.PORT || 5000;

// Definindo as rotas no servidor Express
app.use('/usuarios', usuarioRoutes);  // Isso define o prefixo /usuarios para todas as rotas de usuário

serverHttp.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

