import { Router } from 'express';
import { getUsuarios, insertUsuario, updateUsuario } from '../controllers/usuarioController';

const router = Router();

router.get('/usuarios', getUsuarios);
router.post('/usuarios', insertUsuario);
router.put('/usuarios/:id', updateUsuario);

export default router;

