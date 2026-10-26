// Conexão Sequelize usada pela aplicação e pelos models
require('dotenv').config();
const { Sequelize } = require('sequelize');

// Em testes (Jest define NODE_ENV=test) usamos SEMPRE um banco separado,
// pois os testes recriam as tabelas (sync force) e apagariam os dados de desenvolvimento.
const isTest = process.env.NODE_ENV === 'test';
const database = isTest
  ? process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`
  : process.env.DB_NAME;

const sequelize = new Sequelize(
  database,
  process.env.DB_USER,
  // DB_PASS é aceito como alternativa por compatibilidade com .env antigos
  process.env.DB_PASSWORD ?? process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define: { underscored: true }, // snake_case nas colunas (created_at, updated_at)
  }
);

module.exports = sequelize;
