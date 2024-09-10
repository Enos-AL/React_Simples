// src/routes/usuarioRoutes.ts
import { Router } from 'express';
import { excluirUsuario, listarColunas, excluirColunas } from '../controllers/usuarioController';
import { criarUsuario } from '../controllers/incluirUsuario'
import { incluirColunas } from '../controllers/incluirColunas'
import { listarUsuarios } from '../controllers/listarUsuarios'
import { criarChamados } from '../controllers/criarChamados'
import { concluirChamado } from '../controllers/concluirChamado'
import { filtrarChamados } from '../controllers/filtrarChamados'
import { atualizarDados, buscarUsuario } from '../controllers/atualizarDados'

const router = Router();
router.post('/criarChamados', criarChamados);
router.get('/listarUsuarios', listarUsuarios);
router.post('/criarUsuario', criarUsuario);
router.delete('/excluirUsuario/nome', excluirUsuario);
router.get('/listarColunas', listarColunas);
router.post('/excluirColunas', excluirColunas)
router.post('/incluirColunas', incluirColunas);
router.get('/buscarUsuario', buscarUsuario);
router.post('/atualizarDados', atualizarDados);
router.post('/filtrarChamados',filtrarChamados);
router.put('/concluirChamado', concluirChamado);
export default router;
