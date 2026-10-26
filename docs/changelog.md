# 📝 Changelog

## [1.0.0] - 2025-06-23
### Adicionado
- Estrutura completa de API REST
- CRUD de usuários, categorias, produtos
- Upload de imagens
- Autenticação JWT
- Testes automatizados
- Documentação completa
## 1.1.0
- Rota de login `POST /v1/user/token` (conforme o escopo; a antiga `/v1/login/token` foi removida)
- Filtros de produto: `price-range`, `option[ID]`, `fields` (incluindo `images`) corrigidos/implementados
- `radius` aceita `"4px"` e `value` é aceito como alias de `values`
- Paginação e total corretos na busca de produtos
- Tratamento global de erros, validações (400) e 404 de rotas
- Autorização: usuário só altera/exclui a si mesmo (403)
- Testes usam banco separado e foram movidos para `tests/`
- Documentação Swagger em `/api-docs`
- Índices em `slug` (nova migration), `description` e `values` como TEXT nos models
- Seeder corrigido (`bcrypt`) e `sequelize-cli` adicionado às dependências
