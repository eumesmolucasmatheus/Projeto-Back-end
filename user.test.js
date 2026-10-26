const { app, request, sequelize, resetDatabase, createUserAndLogin, auth } = require('./helpers');

let me; let other;

beforeAll(async () => {
  await resetDatabase();
  me = await createUserAndLogin('me@email.com');
  other = await createUserAndLogin('other@email.com');
});
afterAll(() => sequelize.close());

describe('Cadastro e login de usuário', () => {
  it('cadastra usuário (201) e não expõe a senha na consulta', async () => {
    const res = await request(app).get(`/v1/user/${me.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: me.id, email: 'me@email.com' });
    expect(res.body).not.toHaveProperty('password');
  });

  it('rejeita e-mail duplicado (400)', async () => {
    const res = await request(app).post('/v1/user').send({
      firstname: 'A', surname: 'B', email: 'me@email.com', password: '123456', confirmPassword: '123456',
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejeita senhas diferentes, e-mail inválido e campos vazios (400)', async () => {
    const base = { firstname: 'A', surname: 'B', email: 'x@email.com', password: '123456', confirmPassword: '123456' };
    for (const bad of [{ confirmPassword: '999999' }, { email: 'nao-e-email' }, { firstname: '' }, { password: '123', confirmPassword: '123' }]) {
      const res = await request(app).post('/v1/user').send({ ...base, ...bad });
      expect(res.statusCode).toBe(400);
    }
  });

  it('gera token com credenciais corretas (200)', async () => {
    const res = await request(app).post('/v1/user/token').send({ email: 'me@email.com', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('recusa senha errada, e-mail inexistente e corpo vazio (400)', async () => {
    expect((await request(app).post('/v1/user/token').send({ email: 'me@email.com', password: 'errada' })).statusCode).toBe(400);
    expect((await request(app).post('/v1/user/token').send({ email: 'x@x.com', password: '123456' })).statusCode).toBe(400);
    expect((await request(app).post('/v1/user/token').send({})).statusCode).toBe(400);
  });

  it('usuário inexistente responde 404', async () => {
    expect((await request(app).get('/v1/user/99999')).statusCode).toBe(404);
  });
});

describe('Atualização e exclusão de usuário', () => {
  const body = { firstname: 'Novo', surname: 'Nome', email: 'me@email.com' };

  it('exige token (401)', async () => {
    expect((await request(app).put(`/v1/user/${me.id}`).send(body)).statusCode).toBe(401);
    expect((await request(app).put(`/v1/user/${me.id}`).set('Authorization', 'Bearer lixo').send(body)).statusCode).toBe(401);
    expect((await request(app).delete(`/v1/user/${me.id}`)).statusCode).toBe(401);
  });

  it('não permite alterar nem excluir outro usuário (403)', async () => {
    expect((await request(app).put(`/v1/user/${other.id}`).set(auth(me.token)).send(body)).statusCode).toBe(403);
    expect((await request(app).delete(`/v1/user/${other.id}`).set(auth(me.token))).statusCode).toBe(403);
  });

  it('responde 404 para usuário inexistente (com token)', async () => {
    expect((await request(app).put('/v1/user/99999').set(auth(me.token)).send(body)).statusCode).toBe(404);
  });

  it('rejeita e-mail que já pertence a outro usuário (400)', async () => {
    const res = await request(app).put(`/v1/user/${me.id}`).set(auth(me.token)).send({ ...body, email: 'other@email.com' });
    expect(res.statusCode).toBe(400);
  });

  it('atualiza o próprio usuário (204)', async () => {
    expect((await request(app).put(`/v1/user/${me.id}`).set(auth(me.token)).send(body)).statusCode).toBe(204);
    expect((await request(app).get(`/v1/user/${me.id}`)).body.firstname).toBe('Novo');
  });

  it('exclui o próprio usuário (204) e depois responde 404', async () => {
    expect((await request(app).delete(`/v1/user/${me.id}`).set(auth(me.token))).statusCode).toBe(204);
    expect((await request(app).get(`/v1/user/${me.id}`)).statusCode).toBe(404);
  });
});
