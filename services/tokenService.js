// Geração e validação de tokens JWT
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = {
  // Gera um token com validade de 1 dia
  generate(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  },

  // Valida e decodifica um token (lança erro se inválido ou expirado)
  validate(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  },
};
