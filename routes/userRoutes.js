const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const userController = require('../controllers/userController');
const loginController = require('../controllers/loginController');

// Gera o token JWT (login). Deve vir antes de '/:id'.
router.post('/token', loginController.generateToken);

router.get('/:id', userController.getUserById);          // Buscar usuário por ID
router.post('/', userController.createUser);             // Criar usuário
router.put('/:id', auth, userController.updateUser);    // Atualizar usuário (autenticado)
router.delete('/:id', auth, userController.deleteUser); // Deletar usuário (autenticado)

module.exports = router;
