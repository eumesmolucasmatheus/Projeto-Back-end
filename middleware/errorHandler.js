// Middlewares globais: rota não encontrada (404) e tratamento centralizado de erros

// Responde 404 para qualquer rota que não exista
const notFound = (req, res) =>
  res.status(404).json({ message: 'Rota não encontrada' });

// Converte erros conhecidos em respostas HTTP corretas.
// O Express 5 encaminha automaticamente erros de funções async para cá.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // JSON inválido no corpo da requisição
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });

  // Corpo maior que o limite permitido
  if (err.type === 'entity.too.large')
    return res.status(413).json({ message: 'Corpo da requisição muito grande' });

  // Erros lançados de propósito pela aplicação (HttpError)
  if (err.status && err.status < 500)
    return res.status(err.status).json({ message: err.message });

  // Violações de validação ou unicidade do Sequelize
  if (err.name === 'SequelizeUniqueConstraintError')
    return res.status(400).json({ message: 'Já existe um registro com esses dados' });
  if (err.name === 'SequelizeValidationError')
    return res.status(400).json({ message: err.errors.map((e) => e.message).join('; ') });
  if (err.name === 'SequelizeForeignKeyConstraintError')
    return res.status(400).json({ message: 'Referência inválida a outro registro' });

  // Qualquer outro erro é inesperado: registra e devolve 500 sem vazar detalhes
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
};

module.exports = { notFound, errorHandler };
