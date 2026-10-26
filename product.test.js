const fs = require('fs');
const { app, request, sequelize, resetDatabase, createUserAndLogin, auth } = require('./helpers');

// PNG 1x1 válido em base64
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let token; let catA; let catB;

const createProduct = (body) => request(app).post('/v1/product').set(auth(token)).send(body);
const base = (over = {}) => ({ enabled: true, name: 'Produto', stock: 5, description: 'desc', price: 100, price_with_discount: 90, ...over });

beforeAll(async () => {
  await resetDatabase();
  ({ token } = await createUserAndLogin());
  catA = (await request(app).post('/v1/category').set(auth(token)).send({ name: 'A' })).body.id;
  catB = (await request(app).post('/v1/category').set(auth(token)).send({ name: 'B' })).body.id;
});
afterAll(() => sequelize.close());

describe('Criação de produto', () => {
  it('exige token (401)', async () => {
    expect((await request(app).post('/v1/product').send(base())).statusCode).toBe(401);
  });

  it('valida os dados (400)', async () => {
    const bad = [{}, { name: '' }, { price: 'caro' }, { price: -1 }, { stock: 1.5 }, { enabled: 'sim' },
      { category_ids: 'x' }, { category_ids: [99999] }, { images: [{ type: 'text/plain', content: 'abc' }] },
      { options: [{ title: 'Tam', values: [] }] }, { options: [{ title: 'Tam', shape: 'triangle', values: ['P'] }] }];
    for (const over of bad) {
      const body = over.name === '' || Object.keys(over).length === 0 ? over : base(over);
      expect((await createProduct(body)).statusCode).toBe(400);
    }
  });

  it('cria produto completo com categorias, imagens e opções; aceita radius "4px" e "value"', async () => {
    const res = await createProduct(base({
      name: 'Tênis Nike', category_ids: [catA, catB],
      images: [{ type: 'image/png', content: PNG }],
      options: [
        { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', values: ['39', '40', '41'] },
        { title: 'Cor', shape: 'circle', radius: 100, type: 'color', value: '#000,#FFF' },
      ],
    }));
    expect(res.statusCode).toBe(201);

    const get = await request(app).get(`/v1/product/${res.body.id}`);
    expect(get.statusCode).toBe(200);
    expect(get.body.slug).toBe('tenis-nike');
    expect(get.body.category_ids.sort()).toEqual([catA, catB].sort());
    expect(get.body.options[0]).toMatchObject({ title: 'Tamanho', radius: 4, values: ['39', '40', '41'] });
    expect(get.body.options[1].values).toEqual(['#000', '#FFF']);

    // a imagem fica acessível pela URL pública
    expect(get.body.images[0].content).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/assets\/images\/.+\.png$/);
    const file = await request(app).get(new URL(get.body.images[0].content).pathname);
    expect(file.statusCode).toBe(200);
  });

  it('monta URL correta mesmo para imagens salvas sem a barra inicial (dados antigos/seed)', async () => {
    const { ProductImage } = require('../src/models');
    const productId = (await createProduct(base({ name: 'Legado' }))).body.id;
    await ProductImage.create({ product_id: productId, path: 'assets/images/legado.png' });
    const get = await request(app).get(`/v1/product/${productId}`);
    expect(get.body.images[0].content).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/assets\/images\/legado\.png$/);
    // remove para não interferir nos totais dos demais testes
    await request(app).delete(`/v1/product/${productId}`).set(auth(token));
  });

  it('consulta por slug; 404 quando não existe', async () => {
    expect((await request(app).get('/v1/product/slug/tenis-nike')).body.name).toBe('Tênis Nike');
    expect((await request(app).get('/v1/product/slug/nada')).statusCode).toBe(404);
    expect((await request(app).get('/v1/product/99999')).statusCode).toBe(404);
  });
});

describe('Busca avançada', () => {
  beforeAll(async () => {
    await createProduct(base({ name: 'Camiseta Azul', price: 50, price_with_discount: 40, category_ids: [catA], options: [{ title: 'Tam', values: ['P', 'M'] }] }));
    await createProduct(base({ name: 'Camiseta Vermelha', price: 150, price_with_discount: 120, category_ids: [catA, catB], description: 'algodão', options: [{ title: 'Tam', values: ['G', 'GG'] }] }));
    await createProduct(base({ name: 'Boné', price: 80, price_with_discount: 70 }));
  });
  const search = (qs) => request(app).get(`/v1/product/search?${qs}`);

  it('retorna o formato paginado', async () => {
    const res = await search('limit=-1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ total: 4, limit: -1, page: 1 });
  });

  it('total e paginação corretos mesmo com produtos em várias categorias (sem linhas duplicadas)', async () => {
    const res = await search(`category_ids=${catA},${catB}&limit=2&page=1`);
    expect(res.body.total).toBe(3);        // Tênis, Camiseta Azul, Camiseta Vermelha (1x cada)
    expect(res.body.data).toHaveLength(2);
    const p2 = await search(`category_ids=${catA},${catB}&limit=2&page=2`);
    expect(p2.body.data).toHaveLength(1);
  });

  it('filtra por match (nome ou descrição)', async () => {
    expect((await search('match=Camiseta')).body.total).toBe(2);
    expect((await search('match=algodão')).body.total).toBe(1);
  });

  it('filtra por price-range', async () => {
    const res = await search('price-range=60-160&fields=name,price');
    expect(res.body.data.map((p) => p.name).sort()).toEqual(['Boné', 'Camiseta Vermelha', 'Tênis Nike']);
  });

  it('filtra por option[ID]=valores', async () => {
    const optionId = (await request(app).get('/v1/product/slug/camiseta-vermelha')).body.options[0].id;
    const res = await search(`option[${optionId}]=GG,XG`);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].name).toBe('Camiseta Vermelha');
    expect((await search(`option[${optionId}]=PP`)).body.total).toBe(0);
  });

  it('combina filtros', async () => {
    const res = await search(`category_ids=${catB}&price-range=100-200&match=Camiseta`);
    expect(res.body.total).toBe(1);
  });

  it('fields devolve só os campos pedidos, inclusive images (antes causava erro 500)', async () => {
    const res = await search('fields=name,images,price&limit=1');
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['images', 'name', 'price']);
  });

  it('rejeita parâmetros inválidos (400)', async () => {
    for (const qs of ['limit=0', 'page=x', 'fields=senha', 'category_ids=a,b', 'price-range=abc', 'price-range=200-100', 'option[1]='])
      expect((await search(qs)).statusCode).toBe(400);
  });
});

describe('Atualização e exclusão', () => {
  let id; let imageId; let optionId;
  beforeAll(async () => {
    id = (await createProduct(base({ name: 'Mochila', category_ids: [catA], images: [{ type: 'image/png', content: PNG }], options: [{ title: 'Cor', values: ['Preta'] }] }))).body.id;
    const p = (await request(app).get(`/v1/product/${id}`)).body;
    imageId = p.images[0].id; optionId = p.options[0].id;
  });

  it('exige token (401) e responde 404 / 400 corretamente', async () => {
    expect((await request(app).put(`/v1/product/${id}`).send(base())).statusCode).toBe(401);
    expect((await request(app).put('/v1/product/99999').set(auth(token)).send(base())).statusCode).toBe(404);
    expect((await request(app).put(`/v1/product/${id}`).set(auth(token)).send({ price: 'x' })).statusCode).toBe(400);
  });

  it('atualiza campos, categorias, imagem e opção (204)', async () => {
    const res = await request(app).put(`/v1/product/${id}`).set(auth(token)).send({
      name: 'Mochila Grande', price: 250, category_ids: [catB],
      images: [{ id: imageId, deleted: true }, { type: 'image/png', content: PNG }],
      options: [{ id: optionId, values: ['Preta', 'Azul'] }, { title: 'Tamanho', values: ['G'] }],
    });
    expect(res.statusCode).toBe(204);

    const p = (await request(app).get(`/v1/product/${id}`)).body;
    expect(p).toMatchObject({ name: 'Mochila Grande', price: 250, category_ids: [catB] });
    expect(p.images).toHaveLength(1);
    expect(p.images[0].id).not.toBe(imageId);
    expect(p.options).toHaveLength(2);
    expect(p.options.find((o) => o.id === optionId).values).toEqual(['Preta', 'Azul']);
  });

  it('não apaga as categorias quando category_ids não é enviado', async () => {
    await request(app).put(`/v1/product/${id}`).set(auth(token)).send({ stock: 99 });
    const p = (await request(app).get(`/v1/product/${id}`)).body;
    expect(p.stock).toBe(99);
    expect(p.category_ids).toEqual([catB]);
  });

  it('retorna 404 ao alterar imagem/opção que não pertence ao produto', async () => {
    expect((await request(app).put(`/v1/product/${id}`).set(auth(token)).send({ images: [{ id: 99999, deleted: true }] })).statusCode).toBe(404);
  });

  it('exclui produto (204), remove o arquivo da imagem e depois responde 404', async () => {
    const url = (await request(app).get(`/v1/product/${id}`)).body.images[0].content;
    const file = require('path').join(process.env.UPLOAD_DIR, require('path').basename(url));
    expect(fs.existsSync(file)).toBe(true);

    expect((await request(app).delete(`/v1/product/${id}`).set(auth(token))).statusCode).toBe(204);
    expect(fs.existsSync(file)).toBe(false);
    expect((await request(app).get(`/v1/product/${id}`)).statusCode).toBe(404);
    expect((await request(app).delete(`/v1/product/${id}`).set(auth(token))).statusCode).toBe(404);
  });
});
