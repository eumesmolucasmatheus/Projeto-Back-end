// Middleware de autenticação: exige o header "Authorization: Bearer <jwt>"
const tokenService = require('../services/tokenService');

module.exports = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  // Header ausente ou fora do formato "Bearer <token>"
  if (scheme !== 'Bearer' || !token)
    return res.status(401).json({ message: 'Token não enviado' });

  try {
    // Valida assinatura e expiração; guarda o id do usuário para as próximas camadas
    req.userId = tokenService.validate(token).id;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};
