// CRUD de categorias
const { Category } = require('../models');
const { first, isNonEmptyString, isBoolean, parseIntStrict, parseBool } = require('../utils/validators');
const slugify = require('../utils/slugify');

// Campos que podem ser pedidos em ?fields=
const ALLOWED_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

// Valida o corpo de criação/atualização. Retorna { errors, data }.
const validateBody = (body = {}) => {
  const errors = [];
  if (!isNonEmptyString(body.name)) errors.push('name é obrigatório');
  if (body.slug !== undefined && !isNonEmptyString(body.slug)) errors.push('slug inválido');
  if (body.use_in_menu !== undefined && !isBoolean(body.use_in_menu))
    errors.push('use_in_menu deve ser boolean');

  const data = {
    name: isNonEmptyString(body.name) ? body.name.trim() : undefined,
    // Se o slug não for enviado, é gerado a partir do nome
    slug: isNonEmptyString(body.slug)
      ? body.slug.trim()
      : body.slug === undefined && isNonEmptyString(body.name) ? slugify(body.name) : undefined,
    use_in_menu: isBoolean(body.use_in_menu) ? body.use_in_menu : false,
  };
  return { errors, data };
};

module.exports = {
  // GET /v1/category/search?limit=&page=&fields=&use_in_menu=
  async searchCategories(req, res) {
    const errors = [];

    // limit: -1 (todos) ou inteiro positivo. Padrão 12.
    const limit = req.query.limit === undefined ? 12 : parseIntStrict(first(req.query.limit));
    if (limit === null || (limit !== -1 && limit < 1)) errors.push('limit inválido');

    // page: inteiro >= 1. Padrão 1.
    const page = req.query.page === undefined ? 1 : parseIntStrict(first(req.query.page));
    if (page === null || page < 1) errors.push('page inválido');

    // fields: apenas colunas existentes
    let attributes;
    if (req.query.fields !== undefined) {
      attributes = String(first(req.query.fields)).split(',').map((f) => f.trim());
      if (attributes.some((f) => !ALLOWED_FIELDS.includes(f)))
        errors.push(`fields aceita apenas: ${ALLOWED_FIELDS.join(', ')}`);
    }

    // use_in_menu: "true" ou "false"
    const where = {};
    if (req.query.use_in_menu !== undefined) {
      const flag = parseBool(first(req.query.use_in_menu));
      if (flag === null) errors.push('use_in_menu deve ser true ou false');
      else where.use_in_menu = flag;
    }

    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const options = { where, attributes, order: [['id', 'ASC']] };
    if (limit !== -1) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }

    const [total, data] = await Promise.all([Category.count({ where }), Category.findAll(options)]);
    return res.status(200).json({ data, total, limit, page });
  },

  // GET /v1/category/:id
  async getCategoryById(req, res) {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });
    return res.status(200).json(category);
  },

  // GET /v1/category/slug/:slug
  async getCategoryBySlug(req, res) {
    const category = await Category.findOne({ where: { slug: req.params.slug } });
    if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });
    return res.status(200).json(category);
  },

  // POST /v1/category (autenticado)
  async createCategory(req, res) {
    const { errors, data } = validateBody(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    const category = await Category.create(data);
    return res.status(201).json({ id: category.id, message: 'Categoria criada com sucesso' });
  },

  // PUT /v1/category/:id (autenticado)
  async updateCategory(req, res) {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });

    const { errors, data } = validateBody(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join('; ') });

    await category.update(data);
    return res.status(204).send();
  },

  // DELETE /v1/category/:id (autenticado)
  async deleteCategory(req, res) {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });

    await category.destroy();
    return res.status(204).send();
  },
};
