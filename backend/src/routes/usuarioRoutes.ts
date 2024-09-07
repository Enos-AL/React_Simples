// src/routes/usuarioRoutes.ts
import { Router } from 'express';
import { listarUsuarios, atualizarDados, excluirUsuario, listarColunas, excluirColunas  } from '../controllers/usuarioController';
import { criarUsuario } from '../controllers/incluirUsuario'
import { incluirColunas } from '../controllers/incluirColunas'

const router = Router();

router.get('/', listarUsuarios);
router.post('/criarUsuario', criarUsuario);
router.delete('/excluirUsuario/nome', excluirUsuario);
router.get('/listarColunas', listarColunas);
router.post('/excluirColunas', excluirColunas)
router.post('/incluirColunas', incluirColunas);
router.put('/atualizarDados/:id', atualizarDados);

export default router;
