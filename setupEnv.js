// Executado antes dos testes: garante ambiente isolado
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';
// Imagens enviadas nos testes vão para uma pasta temporária (não poluem src/assets)
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), 'digital-store-test-images');
