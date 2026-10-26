// Validação e normalização das entradas de produto (query string e corpo da requisição)
const imageService = require('../services/imageService');
const slugify = require('../utils/slugify');
const {
  first, isNonEmptyString, isBoolean, isInteger, isNumber, parseIntStrict,
} = require('../utils/validators');

const SHAPES = ['square', 'circle'];
const OPTION_TYPES = ['text', 'color'];
// Campos que podem ser pedidos em ?fields=
const PRODUCT_FIELDS = [
  'id', 'enabled', 'name', 'slug', 'use_in_menu', 'stock', 'description',
  'price', 'price_with_discount', 'category_ids', 'images', 'options',
];

// ---------- GET /v1/product/search ----------
// Retorna { errors, params } com os filtros já convertidos para os tipos corretos
function parseSearchQuery(query) {
  const errors = [];
  const params = { optionFilters: [] };

  // limit: -1 (todos) ou inteiro positivo. Padrão 12.
  params.limit = query.limit === undefined ? 12 : parseIntStrict(first(query.limit));
  if (params.limit === null || (params.limit !== -1 && params.limit < 1)) errors.push('limit inválido');

  // page: inteiro >= 1. Padrão 1.
  params.page = query.page === undefined ? 1 : parseIntStrict(first(query.page));
  if (params.page === null || params.page < 1) errors.push('page inválido');

  // fields=name,images,price
  if (query.fields !== undefined) {
    params.fields = String(first(query.fields)).split(',').map((f) => f.trim());
    if (params.fields.some((f) => !PRODUCT_FIELDS.includes(f)))
      errors.push(`fields aceita apenas: ${PRODUCT_FIELDS.join(', ')}`);
  }

  // match=Tênis (busca no nome ou na descrição)
  if (query.match !== undefined) params.match = String(first(query.match)).trim();

  // category_ids=15,24
  if (query.category_ids !== undefined) {
    const ids = String(first(query.category_ids)).split(',').map((v) => parseIntStrict(v.trim()));
    if (!ids.length || ids.some((id) => id === null || id < 1)) errors.push('category_ids inválido');
    else params.categoryIds = ids;
  }

  // price-range=100-200 (também aceita price_range)
  const rawRange = first(query['price-range'] ?? query.price_range);
  if (rawRange !== undefined) {
    const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(String(rawRange));
    if (!m || Number(m[1]) > Number(m[2])) errors.push('price-range deve ter o formato min-max (ex.: 100-200)');
    else params.priceRange = [Number(m[1]), Number(m[2])];
  }

  // option[45]=GG,PP (o parser simples do Express entrega a chave literal "option[45]")
  for (const key of Object.keys(query)) {
    const m = /^option\[(\d+)\]$/.exec(key);
    if (!m) continue;
    const values = String(first(query[key])).split(',').map((v) => v.trim()).filter(Boolean);
    if (!values.length) errors.push(`${key} inválido`);
    else params.optionFilters.push({ optionId: Number(m[1]), values });
  }

  return { errors, params };
}

// ---------- Opções ----------
// Aceita "values" ou "value", como array ou string separada por vírgula
function normalizeValues(opt) {
  const raw = opt.values ?? opt.value;
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null;
  if (!list) return null;
  const clean = list.map((v) => String(v).trim()).filter(Boolean);
  return clean.length ? clean : null;
}

// radius aceita 4, "4" ou "4px"
function normalizeRadius(radius) {
  if (isInteger(radius) && radius >= 0) return radius;
  const m = typeof radius === 'string' ? /^(\d+)(?:px)?$/.exec(radius.trim()) : null;
  return m ? Number(m[1]) : null;
}

function validateOption(opt, index, partial, errors) {
  const at = `options[${index}]`;
  if (typeof opt !== 'object' || opt === null) { errors.push(`${at} inválido`); return null; }

  if (opt.deleted === true) {
    if (!isInteger(opt.id)) errors.push(`${at}.id é obrigatório para excluir`);
    return { action: 'delete', id: opt.id };
  }

  const isUpdate = opt.id !== undefined;
  if (isUpdate && !isInteger(opt.id)) errors.push(`${at}.id inválido`);

  const data = {};
  if (opt.title !== undefined || !isUpdate) {
    if (!isNonEmptyString(opt.title)) errors.push(`${at}.title é obrigatório`);
    else data.title = opt.title.trim();
  }
  if (opt.shape !== undefined) {
    if (!SHAPES.includes(opt.shape)) errors.push(`${at}.shape deve ser square ou circle`);
    else data.shape = opt.shape;
  }
  if (opt.type !== undefined) {
    if (!OPTION_TYPES.includes(opt.type)) errors.push(`${at}.type deve ser text ou color`);
    else data.type = opt.type;
  }
  if (opt.radius !== undefined) {
    const radius = normalizeRadius(opt.radius);
    if (radius === null) errors.push(`${at}.radius inválido`);
    else data.radius = radius;
  }
  if (opt.values !== undefined || opt.value !== undefined || !isUpdate) {
    const values = normalizeValues(opt);
    if (!values) errors.push(`${at}.values deve ser uma lista não vazia`);
    else data.values = values.join(',');
  }
  return { action: isUpdate ? 'update' : 'create', id: opt.id, data };
}

// ---------- Imagens ----------
function validateImage(img, index, partial, errors) {
  const at = `images[${index}]`;
  if (typeof img !== 'object' || img === null) { errors.push(`${at} inválido`); return null; }

  // { id, deleted: true } remove a imagem
  if (img.deleted === true) {
    if (!isInteger(img.id)) errors.push(`${at}.id é obrigatório para excluir`);
    return { action: 'delete', id: img.id };
  }

  // { id, content: "https://..." } mantém a imagem existente
  const isUrl = typeof img.content === 'string' && /^(https?:\/\/|\/)/.test(img.content);
  if (img.id !== undefined && isUrl) {
    if (!isInteger(img.id)) errors.push(`${at}.id inválido`);
    return { action: 'keep', id: img.id };
  }

  // Caso contrário é um upload em base64 (nova imagem ou substituição, se tiver id)
  if (!imageService.isSupportedType(img.type)) errors.push(`${at}.type deve ser image/png, image/jpg, image/jpeg, image/gif ou image/webp`);
  if (!isNonEmptyString(img.content)) errors.push(`${at}.content (base64) é obrigatório`);
  if (img.id !== undefined && !isInteger(img.id)) errors.push(`${at}.id inválido`);
  return { action: 'save', id: img.id, type: img.type, content: img.content };
}

// ---------- POST / PUT /v1/product ----------
// partial=false (criação): campos obrigatórios exigidos. partial=true (atualização): só valida o que veio.
// Retorna { errors, data } com { fields, categoryIds, images, options }.
function validateProductBody(body = {}, partial = false) {
  const errors = [];
  const fields = {};

  if (body.name !== undefined || !partial) {
    if (!isNonEmptyString(body.name)) errors.push('name é obrigatório');
    else fields.name = body.name.trim();
  }
  if (body.slug !== undefined) {
    if (!isNonEmptyString(body.slug)) errors.push('slug inválido');
    else fields.slug = body.slug.trim();
  } else if (!partial && fields.name) {
    fields.slug = slugify(fields.name); // gera o slug se não for enviado
  }
  for (const key of ['price', 'price_with_discount']) {
    if (body[key] !== undefined || !partial) {
      if (!isNumber(body[key]) || body[key] < 0) errors.push(`${key} deve ser um número >= 0`);
      else fields[key] = body[key];
    }
  }
  if (body.stock !== undefined) {
    if (!isInteger(body.stock) || body.stock < 0) errors.push('stock deve ser um inteiro >= 0');
    else fields.stock = body.stock;
  }
  for (const key of ['enabled', 'use_in_menu']) {
    if (body[key] !== undefined) {
      if (!isBoolean(body[key])) errors.push(`${key} deve ser boolean`);
      else fields[key] = body[key];
    }
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') errors.push('description inválida');
    else fields.description = body.description;
  }

  // category_ids
  let categoryIds;
  if (body.category_ids !== undefined) {
    if (!Array.isArray(body.category_ids) || body.category_ids.some((id) => !isInteger(id) || id < 1))
      errors.push('category_ids deve ser uma lista de inteiros');
    else categoryIds = [...new Set(body.category_ids)];
  }

  // images
  let images = [];
  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) errors.push('images deve ser uma lista');
    else images = body.images.map((img, i) => validateImage(img, i, partial, errors)).filter(Boolean);
  }
  // options
  let options = [];
  if (body.options !== undefined) {
    if (!Array.isArray(body.options)) errors.push('options deve ser uma lista');
    else options = body.options.map((opt, i) => validateOption(opt, i, partial, errors)).filter(Boolean);
  }

  // Na criação só faz sentido criar itens novos
  if (!partial) {
    if (images.some((i) => i.action !== 'save' || i.id !== undefined)) errors.push('Na criação, images deve conter apenas novas imagens (type e content)');
    if (options.some((o) => o.action !== 'create')) errors.push('Na criação, options deve conter apenas novas opções');
  }

  return { errors, data: { fields, categoryIds, images, options } };
}

module.exports = { parseSearchQuery, validateProductBody, PRODUCT_FIELDS };
