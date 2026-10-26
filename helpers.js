// Funções auxiliares compartilhadas pelos testes
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

// Recria as tabelas. Só roda no banco de TESTE (proteção contra apagar o banco de desenvolvimento).
async function resetDatabase() {
  const name = sequelize.getDatabaseName();
  if (!name.endsWith('_test')) throw new Error(`Recusando limpar o banco "${name}": não é um banco de teste`);
  await sequelize.sync({ force: true });
}

// Cria um usuário, faz login e devolve { id, token }
async function createUserAndLogin(email = 'test@email.com') {
  const created = await request(app).post('/v1/user').send({
    firstname: 'Test', surname: 'User', email, password: '123456', confirmPassword: '123456',
  });
  const login = await request(app).post('/v1/user/token').send({ email, password: '123456' });
  return { id: created.body.id, token: login.body.token };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, request, sequelize, resetDatabase, createUserAndLogin, auth };
