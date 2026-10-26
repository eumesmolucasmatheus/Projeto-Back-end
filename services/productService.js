// Regras de negócio de produtos: busca, criação, atualização e exclusão
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const {
  sequelize, Product, ProductImage, ProductOption, ProductCategory, Category,
} = require('../models');
const imageService = require('./imageService');
const HttpError = require('../utils/HttpError');

// Colunas reais da tabela products (os demais campos vêm de associações)
const COLUMNS = ['id', 'enabled', 'name', 'slug', 'use_in_menu', 'stock', 'description', 'price', 'price_with_discount'];

// Monta a URL pública de uma imagem a partir do caminho salvo no banco
// (tolera caminhos salvos sem a barra inicial, ex.: "assets/images/a.png")
const toUrl = (baseUrl, p) => (/^https?:\/\//.test(p) ? p : `${baseUrl}/${p.replace(/^\/+/, '')}`);

// Converte o model Sequelize no formato JSON da API (filtrando por "fields" se informado)
function serialize(product, baseUrl, fields) {
  const p = product.toJSON();
  const out = {};
  for (const c of COLUMNS) out[c] = p[c];
  out.category_ids = (p.Categories || []).map((c) => c.id);
  out.images = (p.ProductImages || []).map((i) => ({ id: i.id, content: toUrl(baseUrl, i.path) }));
  out.options = (p.ProductOptions || []).map((o) => ({
    id: o.id, title: o.title, shape: o.shape, radius: o.radius, type: o.type, values: o.values.split(','),
  }));
  if (!fields) return out;
  return Object.fromEntries(fields.map((f) => [f, out[f]]));
}

// Includes das associações (apenas as que forem necessárias)
const buildIncludes = (fields) => {
  const wants = (f) => !fields || fields.includes(f);
  const includes = [];
  if (wants('category_ids')) includes.push({ model: Category, attributes: ['id'], through: { attributes: [] } });
  if (wants('images')) includes.push({ model: ProductImage, attributes: ['id', 'path'] });
  if (wants('options')) includes.push({ model: ProductOption });
  return includes;
};

// Garante que todas as categorias informadas existem
async function assertCategoriesExist(ids, transaction) {
  if (!ids || !ids.length) return;
  const found = await Category.count({ where: { id: ids }, transaction });
  if (found !== ids.length) throw new HttpError(400, 'category_ids contém categorias inexistentes');
}

// Interseção de listas de ids (usada para combinar filtros)
const intersect = (lists) => lists.reduce((acc, l) => acc.filter((id) => l.includes(id)));

module.exports = {
  serialize,

  // Busca avançada com paginação.
  // Os filtros em tabelas relacionadas viram uma lista de ids de produtos, assim o
  // total e a paginação ficam corretos (sem linhas duplicadas por JOIN).
  async search({ limit, page, fields, match, categoryIds, priceRange, optionFilters }) {
    const idLists = [];

    if (categoryIds) {
      const rows = await ProductCategory.findAll({ attributes: ['product_id'], where: { category_id: categoryIds }, raw: true });
      idLists.push(rows.map((r) => r.product_id));
    }
    // Para cada option[ID]=a,b: produtos cuja opção ID possui algum dos valores (valores ficam separados por vírgula)
    for (const { optionId, values } of optionFilters) {
      const rows = await ProductOption.findAll({
        attributes: ['product_id'],
        where: {
          id: optionId,
          [Op.or]: values.map((v) => sqlWhere(fn('FIND_IN_SET', v, col('values')), { [Op.gt]: 0 })),
        },
        raw: true,
      });
      idLists.push(rows.map((r) => r.product_id));
    }

    const where = {};
    if (idLists.length) {
      const ids = intersect(idLists);
      if (!ids.length) return { data: [], total: 0 }; // nenhum produto atende aos filtros
      where.id = { [Op.in]: ids };
    }
    if (match) where[Op.or] = [{ name: { [Op.like]: `%${match}%` } }, { description: { [Op.like]: `%${match}%` } }];
    if (priceRange) where.price = { [Op.between]: priceRange };

    const query = {
      where,
      order: [['id', 'ASC']],
      // Sempre traz "id" (necessário para os includes); o filtro final é feito em serialize()
      attributes: fields ? [...new Set(['id', ...fields.filter((f) => COLUMNS.includes(f))])] : COLUMNS,
      include: buildIncludes(fields),
    };
    if (limit !== -1) { query.limit = limit; query.offset = (page - 1) * limit; }

    const [total, products] = await Promise.all([Product.count({ where }), Product.findAll(query)]);
    return { data: products, total };
  },

  // Busca um produto completo (com categorias, imagens e opções)
  findById: (id) => Product.findByPk(id, { include: buildIncludes() }),
  findBySlug: (slug) => Product.findOne({ where: { slug }, include: buildIncludes() }),

  // Cria o produto e seus relacionamentos em uma única transação
  async create({ fields, categoryIds, images, options }) {
    const savedFiles = [];
    try {
      return await sequelize.transaction(async (t) => {
        await assertCategoriesExist(categoryIds, t);
        const product = await Product.create(fields, { transaction: t });
        if (categoryIds?.length) await product.setCategories(categoryIds, { transaction: t });

        for (const img of images) {
          const path = await imageService.saveImage(img.content, img.type);
          savedFiles.push(path);
          await ProductImage.create({ product_id: product.id, path, enabled: true }, { transaction: t });
        }
        if (options.length)
          await ProductOption.bulkCreate(options.map((o) => ({ ...o.data, product_id: product.id })), { transaction: t });
        return product;
      });
    } catch (err) {
      await Promise.all(savedFiles.map(imageService.removeImage)); // desfaz arquivos já gravados
      throw err;
    }
  },

  // Atualiza o produto e aplica as alterações de categorias, imagens e opções
  async update(product, { fields, categoryIds, images, options }) {
    const newFiles = [];  // arquivos criados (removidos se a transação falhar)
    const oldFiles = [];  // arquivos substituídos/excluídos (removidos se a transação der certo)
    try {
      await sequelize.transaction(async (t) => {
        await assertCategoriesExist(categoryIds, t);
        await product.update(fields, { transaction: t });
        // Só altera as categorias se o campo foi enviado (evita apagar sem querer)
        if (categoryIds) await product.setCategories(categoryIds, { transaction: t });

        for (const img of images) {
          if (img.action === 'keep') continue;
          const current = img.id !== undefined
            ? await ProductImage.findOne({ where: { id: img.id, product_id: product.id }, transaction: t })
            : null;
          if (img.id !== undefined && !current) throw new HttpError(404, `Imagem ${img.id} não encontrada neste produto`);

          if (img.action === 'delete') {
            oldFiles.push(current.path);
            await current.destroy({ transaction: t });
          } else { // save: nova imagem ou substituição
            const path = await imageService.saveImage(img.content, img.type);
            newFiles.push(path);
            if (current) { oldFiles.push(current.path); await current.update({ path }, { transaction: t }); }
            else await ProductImage.create({ product_id: product.id, path, enabled: true }, { transaction: t });
          }
        }

        for (const opt of options) {
          if (opt.action === 'create') {
            await ProductOption.create({ ...opt.data, product_id: product.id }, { transaction: t });
            continue;
          }
          const current = await ProductOption.findOne({ where: { id: opt.id, product_id: product.id }, transaction: t });
          if (!current) throw new HttpError(404, `Opção ${opt.id} não encontrada neste produto`);
          if (opt.action === 'delete') await current.destroy({ transaction: t });
          else await current.update(opt.data, { transaction: t });
        }
      });
    } catch (err) {
      await Promise.all(newFiles.map(imageService.removeImage));
      throw err;
    }
    await Promise.all(oldFiles.map(imageService.removeImage));
  },

  // Exclui o produto (imagens, opções e vínculos de categoria saem por CASCADE)
  async remove(product) {
    const images = await ProductImage.findAll({ where: { product_id: product.id }, attributes: ['path'], raw: true });
    await product.destroy();
    await Promise.all(images.map((i) => imageService.removeImage(i.path)));
  },
};
