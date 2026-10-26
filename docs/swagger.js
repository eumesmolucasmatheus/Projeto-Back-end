// Especificação OpenAPI 3.0 da API (exibida em /api-docs)

// ---- Atalhos para evitar repetição ----
const json = (schema) => ({ 'application/json': { schema } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const err = (description) => ({ description, content: json(ref('Error')) });
const secured = [{ bearerAuth: [] }];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const slugParam = { name: 'slug', in: 'path', required: true, schema: { type: 'string' } };
const q = (name, description, schema = { type: 'string' }, example) => ({ name, in: 'query', description, schema, example });

const unauthorized = err('Token ausente ou inválido');
const badRequest = err('Dados inválidos');
const notFound = err('Registro não encontrado');

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Store API',
    version: '1.1.0',
    description:
      'API REST de e-commerce (usuários, categorias e produtos).\n\n' +
      'Rotas protegidas exigem o header `Authorization: Bearer <token>`. Obtenha o token em `POST /v1/user/token`, ' +
      'clique em **Authorize** e cole o token.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [{ name: 'Usuário' }, { name: 'Categoria' }, { name: 'Produto' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string', example: 'Descrição do erro' } } },
      UserCreate: {
        type: 'object', required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'Maria' }, surname: { type: 'string', example: 'Silva' },
          email: { type: 'string', format: 'email', example: 'maria@email.com' },
          password: { type: 'string', minLength: 6, example: '123456' }, confirmPassword: { type: 'string', example: '123456' },
        },
      },
      UserUpdate: {
        type: 'object', required: ['firstname', 'surname', 'email'],
        properties: { firstname: { type: 'string' }, surname: { type: 'string' }, email: { type: 'string', format: 'email' } },
      },
      User: {
        type: 'object',
        properties: { id: { type: 'integer' }, firstname: { type: 'string' }, surname: { type: 'string' }, email: { type: 'string' } },
      },
      Login: {
        type: 'object', required: ['email', 'password'],
        properties: { email: { type: 'string', example: 'admin@email.com' }, password: { type: 'string', example: '123456' } },
      },
      Token: { type: 'object', properties: { token: { type: 'string' } } },
      Created: { type: 'object', properties: { id: { type: 'integer' }, message: { type: 'string' } } },
      CategoryInput: {
        type: 'object', required: ['name'],
        properties: {
          name: { type: 'string', example: 'Tênis' },
          slug: { type: 'string', example: 'tenis', description: 'Se omitido, é gerado a partir do nome' },
          use_in_menu: { type: 'boolean', default: false },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, name: { type: 'string' }, slug: { type: 'string' }, use_in_menu: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CategoryList: {
        type: 'object',
        properties: { data: { type: 'array', items: ref('Category') }, total: { type: 'integer' }, limit: { type: 'integer' }, page: { type: 'integer' } },
      },
      ImageInput: {
        type: 'object',
        description:
          'Nova imagem: `type` + `content` (base64). Na atualização: com `id` e `content` em base64 substitui a imagem; ' +
          'com `id` e `content` sendo uma URL mantém; com `id` e `deleted: true` remove.',
        properties: {
          id: { type: 'integer' }, type: { type: 'string', example: 'image/png' },
          content: { type: 'string', example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
          deleted: { type: 'boolean' },
        },
      },
      OptionInput: {
        type: 'object',
        description: 'Na atualização: sem `id` cria; com `id` altera; com `id` e `deleted: true` remove. `radius` aceita 4 ou "4px".',
        properties: {
          id: { type: 'integer' }, title: { type: 'string', example: 'Tamanho' },
          shape: { type: 'string', enum: ['square', 'circle'], default: 'square' },
          radius: { oneOf: [{ type: 'integer' }, { type: 'string' }], example: '4px' },
          type: { type: 'string', enum: ['text', 'color'], default: 'text' },
          values: { type: 'array', items: { type: 'string' }, example: ['PP', 'M', 'G'] }, deleted: { type: 'boolean' },
        },
      },
      ProductInput: {
        type: 'object', required: ['name', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean' }, name: { type: 'string', example: 'Tênis Nike' },
          slug: { type: 'string', example: 'tenis-nike' }, use_in_menu: { type: 'boolean' },
          stock: { type: 'integer', example: 10 }, description: { type: 'string' },
          price: { type: 'number', example: 199.9 }, price_with_discount: { type: 'number', example: 149.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
          images: { type: 'array', items: ref('ImageInput') }, options: { type: 'array', items: ref('OptionInput') },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, enabled: { type: 'boolean' }, name: { type: 'string' }, slug: { type: 'string' },
          use_in_menu: { type: 'boolean' }, stock: { type: 'integer' }, description: { type: 'string' },
          price: { type: 'number' }, price_with_discount: { type: 'number' },
          category_ids: { type: 'array', items: { type: 'integer' } },
          images: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, content: { type: 'string', example: 'http://localhost:3000/assets/images/abc.png' } } } },
          options: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, title: { type: 'string' }, shape: { type: 'string' }, radius: { type: 'integer' }, type: { type: 'string' }, values: { type: 'array', items: { type: 'string' } } } } },
        },
      },
      ProductList: {
        type: 'object',
        properties: { data: { type: 'array', items: ref('Product') }, total: { type: 'integer' }, limit: { type: 'integer' }, page: { type: 'integer' } },
      },
    },
  },
  paths: {
    '/v1/user/token': {
      post: {
        tags: ['Usuário'], summary: 'Gera o token JWT (login)',
        requestBody: { required: true, content: json(ref('Login')) },
        responses: { 200: { description: 'Token gerado', content: json(ref('Token')) }, 400: err('E-mail/senha ausentes ou inválidos') },
      },
    },
    '/v1/user': {
      post: {
        tags: ['Usuário'], summary: 'Cadastra um usuário',
        requestBody: { required: true, content: json(ref('UserCreate')) },
        responses: { 201: { description: 'Criado', content: json(ref('Created')) }, 400: badRequest },
      },
    },
    '/v1/user/{id}': {
      get: {
        tags: ['Usuário'], summary: 'Consulta usuário por ID', parameters: [idParam],
        responses: { 200: { description: 'OK', content: json(ref('User')) }, 404: notFound },
      },
      put: {
        tags: ['Usuário'], summary: 'Atualiza o próprio usuário', security: secured, parameters: [idParam],
        requestBody: { required: true, content: json(ref('UserUpdate')) },
        responses: { 204: { description: 'Atualizado' }, 400: badRequest, 401: unauthorized, 403: err('Só é possível alterar o próprio usuário'), 404: notFound },
      },
      delete: {
        tags: ['Usuário'], summary: 'Exclui o próprio usuário', security: secured, parameters: [idParam],
        responses: { 204: { description: 'Excluído' }, 401: unauthorized, 403: err('Só é possível excluir o próprio usuário'), 404: notFound },
      },
    },
    '/v1/category/search': {
      get: {
        tags: ['Categoria'], summary: 'Lista categorias com filtros e paginação',
        parameters: [
          q('limit', 'Itens por página; -1 retorna todos (padrão 12)', { type: 'integer' }, 12),
          q('page', 'Página (padrão 1)', { type: 'integer' }, 1),
          q('fields', 'Campos a retornar, separados por vírgula', { type: 'string' }, 'name,slug'),
          q('use_in_menu', 'Filtra por exibição no menu', { type: 'boolean' }),
        ],
        responses: { 200: { description: 'OK', content: json(ref('CategoryList')) }, 400: badRequest },
      },
    },
    '/v1/category/slug/{slug}': {
      get: {
        tags: ['Categoria'], summary: 'Consulta categoria por slug', parameters: [slugParam],
        responses: { 200: { description: 'OK', content: json(ref('Category')) }, 404: notFound },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categoria'], summary: 'Cadastra categoria', security: secured,
        requestBody: { required: true, content: json(ref('CategoryInput')) },
        responses: { 201: { description: 'Criada', content: json(ref('Created')) }, 400: badRequest, 401: unauthorized },
      },
    },
    '/v1/category/{id}': {
      get: {
        tags: ['Categoria'], summary: 'Consulta categoria por ID', parameters: [idParam],
        responses: { 200: { description: 'OK', content: json(ref('Category')) }, 404: notFound },
      },
      put: {
        tags: ['Categoria'], summary: 'Atualiza categoria', security: secured, parameters: [idParam],
        requestBody: { required: true, content: json(ref('CategoryInput')) },
        responses: { 204: { description: 'Atualizada' }, 400: badRequest, 401: unauthorized, 404: notFound },
      },
      delete: {
        tags: ['Categoria'], summary: 'Exclui categoria', security: secured, parameters: [idParam],
        responses: { 204: { description: 'Excluída' }, 401: unauthorized, 404: notFound },
      },
    },
    '/v1/product/search': {
      get: {
        tags: ['Produto'], summary: 'Busca avançada de produtos',
        parameters: [
          q('limit', 'Itens por página; -1 retorna todos (padrão 12)', { type: 'integer' }, 12),
          q('page', 'Página (padrão 1)', { type: 'integer' }, 1),
          q('match', 'Texto buscado no nome ou na descrição', { type: 'string' }, 'Tênis'),
          q('category_ids', 'IDs de categorias separados por vírgula', { type: 'string' }, '1,2'),
          q('price-range', 'Faixa de preço min-max', { type: 'string' }, '100-200'),
          q('option[ID]', 'Valores de uma opção separados por vírgula. Ex.: option[45]=GG,PP', { type: 'string' }, 'GG,PP'),
          q('fields', 'Campos a retornar, separados por vírgula', { type: 'string' }, 'name,images,price'),
        ],
        responses: { 200: { description: 'OK', content: json(ref('ProductList')) }, 400: badRequest },
      },
    },
    '/v1/product/slug/{slug}': {
      get: {
        tags: ['Produto'], summary: 'Consulta produto por slug', parameters: [slugParam],
        responses: { 200: { description: 'OK', content: json(ref('Product')) }, 404: notFound },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Produto'], summary: 'Cadastra produto (com categorias, imagens e opções)', security: secured,
        requestBody: { required: true, content: json(ref('ProductInput')) },
        responses: { 201: { description: 'Criado', content: json(ref('Created')) }, 400: badRequest, 401: unauthorized },
      },
    },
    '/v1/product/{id}': {
      get: {
        tags: ['Produto'], summary: 'Consulta produto por ID', parameters: [idParam],
        responses: { 200: { description: 'OK', content: json(ref('Product')) }, 404: notFound },
      },
      put: {
        tags: ['Produto'], summary: 'Atualiza produto (campos enviados são alterados)', security: secured, parameters: [idParam],
        requestBody: { required: true, content: json(ref('ProductInput')) },
        responses: { 204: { description: 'Atualizado' }, 400: badRequest, 401: unauthorized, 404: notFound },
      },
      delete: {
        tags: ['Produto'], summary: 'Exclui produto', security: secured, parameters: [idParam],
        responses: { 204: { description: 'Excluído' }, 401: unauthorized, 404: notFound },
      },
    },
  },
};
