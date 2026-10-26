const { app, request, sequelize, resetDatabase, createUserAndLogin, auth } = require('./helpers');

let token;
beforeAll(async () => {
  await resetDatabase();
  ({ token } = await createUserAndLogin());
});
afterAll(() => sequelize.close());

const create = (body) => request(app).post('/v1/category').set(auth(token)).send(body);

describe('Categorias', () => {
  let id;

  it('exige token para criar (401)', async () => {
    expect((await request(app).post('/v1/category').send({ name: 'X' })).statusCode).toBe(401);
  });

  it('valida os dados (400)', async () => {
    expect((await create({})).statusCode).toBe(400);
    expect((await create({ name: 123 })).statusCode).toBe(400);
    expect((await create({ name: 'A', use_in_menu: 'sim' })).statusCode).toBe(400);
  });

  it('cria categoria (201) e gera o slug quando não enviado', async () => {
    const res = await create({ name: 'Camisetas Básicas', use_in_menu: true });
    expect(res.statusCode).toBe(201);
    id = res.body.id;
    const get = await request(app).get(`/v1/category/${id}`);
    expect(get.body.slug).toBe('camisetas-basicas');
  });

  it('consulta por id e por slug; 404 quando não existe', async () => {
    expect((await request(app).get(`/v1/category/${id}`)).statusCode).toBe(200);
    expect((await request(app).get('/v1/category/slug/camisetas-basicas')).body.id).toBe(id);
    expect((await request(app).get('/v1/category/99999')).statusCode).toBe(404);
    expect((await request(app).get('/v1/category/slug/nada')).statusCode).toBe(404);
  });

  it('lista com paginação, fields e filtro use_in_menu', async () => {
    await create({ name: 'Calçados', slug: 'calcados', use_in_menu: false });
    await create({ name: 'Bonés', slug: 'bones', use_in_menu: true });

    const all = await request(app).get('/v1/category/search?limit=-1');
    expect(all.body.total).toBe(3);
    expect(all.body.data).toHaveLength(3);

    const page = await request(app).get('/v1/category/search?limit=2&page=2');
    expect(page.body.data).toHaveLength(1);
    expect(page.body.total).toBe(3);

    const menu = await request(app).get('/v1/category/search?use_in_menu=true&fields=name,slug');
    expect(menu.body.total).toBe(2);
    expect(Object.keys(menu.body.data[0]).sort()).toEqual(['name', 'slug']);
  });

  it('rejeita parâmetros inválidos na busca (400)', async () => {
    for (const qs of ['limit=0', 'limit=abc', 'page=0', 'fields=senha', 'use_in_menu=talvez'])
      expect((await request(app).get(`/v1/category/search?${qs}`)).statusCode).toBe(400);
  });

  it('atualiza (204), valida (400) e 404 se não existe', async () => {
    expect((await request(app).put(`/v1/category/${id}`).set(auth(token)).send({ name: 'Novo', slug: 'novo', use_in_menu: false })).statusCode).toBe(204);
    expect((await request(app).get(`/v1/category/${id}`)).body.name).toBe('Novo');
    expect((await request(app).put(`/v1/category/${id}`).set(auth(token)).send({})).statusCode).toBe(400);
    expect((await request(app).put('/v1/category/99999').set(auth(token)).send({ name: 'x' })).statusCode).toBe(404);
  });

  it('exclui (204) e depois 404', async () => {
    expect((await request(app).delete(`/v1/category/${id}`).set(auth(token))).statusCode).toBe(204);
    expect((await request(app).delete(`/v1/category/${id}`).set(auth(token))).statusCode).toBe(404);
  });
});
