// CRUD de produtos (camada HTTP: valida a entrada, chama o service e monta a resposta)
const productService = require('../services/productService');
const { parseSearchQuery, validateProductBody } = require('../validators/productValidator');

// Ex.: http://localhost:3000 (usado para montar a URL pública das imagens)
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

module.exports = {
  // GET /v1/product/search
  async searchProducts(req, res) {
    const { errors, params } = parseSearchQuery(req.query);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const { data, total } = await productService.search(params);
    return res.status(200).json({
      data: data.map((p) => productService.serialize(p, baseUrl(req), params.fields)),
      total,
      limit: params.limit,
      page: params.page,
    });
  },

  // GET /v1/product/:id
  async getProductById(req, res) {
    const product = await productService.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    return res.status(200).json(productService.serialize(product, baseUrl(req)));
  },

  // GET /v1/product/slug/:slug
  async getProductBySlug(req, res) {
    const product = await productService.findBySlug(req.params.slug);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
    return res.status(200).json(productService.serialize(product, baseUrl(req)));
  },

  // POST /v1/product (autenticado)
  async createProduct(req, res) {
    const { errors, data } = validateProductBody(req.body, false);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const product = await productService.create(data);
    return res.status(201).json({ id: product.id, message: 'Produto criado com sucesso' });
  },

  // PUT /v1/product/:id (autenticado)
  async updateProduct(req, res) {
    const product = await productService.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

    const { errors, data } = validateProductBody(req.body, true);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    await productService.update(product, data);
    return res.status(204).send();
  },

  // DELETE /v1/product/:id (autenticado)
  async deleteProduct(req, res) {
    const product = await productService.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

    await productService.remove(product);
    return res.status(204).send();
  },
};
