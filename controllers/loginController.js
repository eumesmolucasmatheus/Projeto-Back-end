// Autenticação: gera o token JWT a partir de e-mail e senha
const { User } = require('../models');
const hashService = require('../services/hashService');
const tokenService = require('../services/tokenService');
const { isNonEmptyString } = require('../utils/validators');

module.exports = {
  // POST /v1/user/token
  async generateToken(req, res) {
    const { email, password } = req.body ?? {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password))
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });

    // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
    const user = await User.findOne({ where: { email: email.trim() } });
    if (!user || !(await hashService.compare(password, user.password)))
      return res.status(400).json({ message: 'E-mail ou senha inválidos' });

    return res.status(200).json({ token: tokenService.generate({ id: user.id }) });
  },
};
