// Ponto de entrada: valida a configuração, conecta ao banco e inicia o servidor
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

// Sem JWT_SECRET não é possível assinar tokens: falha cedo com mensagem clara
if (!process.env.JWT_SECRET) {
  console.error('Defina JWT_SECRET no arquivo .env (veja .env.example).');
  process.exit(1);
}

// O banco é criado/atualizado com migrations: npm run migrate
sequelize.authenticate().then(() => {
  console.log('Banco de dados conectado com sucesso!');
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} — documentação em http://localhost:${PORT}/api-docs`);
  });
}).catch((err) => {
  console.error('Erro ao conectar ao banco de dados:', err.message);
  process.exit(1);
});
