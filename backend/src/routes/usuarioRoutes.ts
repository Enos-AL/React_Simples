// src/routes/usuarioRoutes.ts
import { Router } from 'express';
import { listarUsuarios, criarUsuario, excluirUsuario, listarColunas, inserirDados, atualizarDados } from '../controllers/usuarioController';

const router = Router();

router.get('/', listarUsuarios);
router.post('/', criarUsuario);
router.delete('/:id', excluirUsuario);
router.get('/colunas', listarColunas); // Nova rota para listar colunas
router.post('/inserir', inserirDados); // Nova rota para inserção dinâmica
router.put('/atualizar/:id', atualizarDados); // Nova rota para atualização dinâmica

export default router;
