const { app, request } = require('./helpers');

describe('Aplicação', () => {
  it('GET / responde 200 com mensagem', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('rota inexistente responde 404 em JSON', async () => {
    const res = await request(app).get('/v1/nao-existe');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('JSON malformado responde 400', async () => {
    const res = await request(app).post('/v1/user').set('Content-Type', 'application/json').send('{invalido');
    expect(res.statusCode).toBe(400);
  });

  it('requisição sem corpo não derruba a API (400, não 500)', async () => {
    const res = await request(app).post('/v1/user');
    expect(res.statusCode).toBe(400);
  });

  it('serve a documentação Swagger', async () => {
    expect((await request(app).get('/api-docs.json')).body.openapi).toBe('3.0.3');
    expect((await request(app).get('/api-docs/')).statusCode).toBe(200);
  });
});
