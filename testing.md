# 🧪 Testes

## Rodando os testes
```bash
npm test            # todos os testes
npm run coverage    # com relatório de cobertura
npm run watch       # modo observação
```

Os testes usam um **banco separado** (`DB_NAME_TEST`, padrão `<DB_NAME>_test`) e recriam as tabelas a cada arquivo.
Há uma proteção que recusa limpar qualquer banco cujo nome não termine em `_test`.
As imagens enviadas nos testes vão para uma pasta temporária do sistema.

## Estrutura
- `tests/app.test.js` — raiz, 404, JSON inválido, Swagger
- `tests/user.test.js` — cadastro, login, atualização, exclusão, 401/403/404
- `tests/category.test.js` — CRUD, paginação, `fields`, filtros e erros 400
- `tests/product.test.js` — CRUD com imagens e opções, filtros combinados, paginação e exclusão

Utilizamos Jest e Supertest.
