// src/routes/usuarioRoutes.ts
import { Router } from 'express';
import { atualizarDados, excluirUsuario, listarColunas, excluirColunas } from '../controllers/usuarioController';
import { criarUsuario } from '../controllers/incluirUsuario'
import { incluirColunas } from '../controllers/incluirColunas'
import { listarUsuarios } from '../controllers/listarUsuarios'
import { criarChamados } from '../controllers/criarChamados'

const router = Router();
router.post('/criarChamados', criarChamados);
router.get('/listarUsuarios', listarUsuarios);
router.post('/criarUsuario', criarUsuario);
router.delete('/excluirUsuario/nome', excluirUsuario);
router.get('/listarColunas', listarColunas);
router.post('/excluirColunas', excluirColunas)
router.post('/incluirColunas', incluirColunas);
router.put('/atualizarDados/:id', atualizarDados);

export default router;
