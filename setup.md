# ⚙️ Configuração do Projeto

## Pré-requisitos
- Node.js 18 ou superior
- MySQL 8 (ou MariaDB 10.5+)

## Passos

1. Clone o repositório e entre na pasta:
```bash
git clone <URL-DO-SEU-REPOSITÓRIO>
cd projeto-backend
```

2. Instale as dependências:
```bash
npm install
```

3. Crie os bancos (desenvolvimento e testes):
```sql
CREATE DATABASE projeto_backend;
CREATE DATABASE projeto_backend_test;
```

4. Crie o `.env` a partir do exemplo (`cp .env.example .env`) e preencha:
```
PORT=3000
JWT_SECRET=um_segredo_longo_e_aleatorio
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=projeto_backend
DB_NAME_TEST=projeto_backend_test
```
> A variável da senha é **`DB_PASSWORD`**.

5. Rode as migrations:
```bash
npm run migrate
```

6. (Opcional) Popule com dados de exemplo:
```bash
npm run seed
```

7. Inicie o servidor:
```bash
npm run dev
```

Acesse: http://localhost:3000 — documentação: http://localhost:3000/api-docs
