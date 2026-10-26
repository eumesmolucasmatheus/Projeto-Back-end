// Importações de dependências principais: servidor, segurança e variáveis de ambiente
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Importações das rotas, documentação e middlewares
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const swaggerDocument = require('./docs/swagger');
const imageService = require('./services/imageService');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Inicializa a aplicação Express
const app = express();

// Habilita CORS para todas as rotas
app.use(cors());

// Suporte a JSON no body (limite maior porque as imagens chegam em base64)
app.use(express.json({ limit: '10mb' }));

// Serve os arquivos de imagem enviados
app.use(imageService.PUBLIC_PREFIX, express.static(imageService.getUploadDir()));

// Documentação interativa (Swagger UI) e especificação OpenAPI em JSON
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));

// Rotas da API com versionamento v1
app.use('/v1/user', userRoutes);
app.use('/v1/category', categoryRoutes);
app.use('/v1/product', productRoutes);

// Rota raiz para teste de funcionamento da API
app.get('/', (req, res) => {
  res.json({ message: 'API está funcionando perfeitamente!', docs: '/api-docs' });
});

// Sempre por último: 404 para rotas inexistentes e tratamento global de erros
app.use(notFound);
app.use(errorHandler);

// Exporta o app para uso em server.js ou testes
module.exports = app;
