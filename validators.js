// Funções utilitárias de validação reutilizadas pelos controllers e validators

// Usa o último valor quando a query string é repetida (?a=1&a=2)
const first = (v) => (Array.isArray(v) ? v[v.length - 1] : v);

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isBoolean = (v) => typeof v === 'boolean';
const isInteger = (v) => Number.isInteger(v);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (v) => isNonEmptyString(v) && EMAIL_REGEX.test(v.trim());

// Converte "12" em 12. Retorna null se não for um inteiro válido.
const parseIntStrict = (v) => (typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : null);

// Converte "true"/"false" em boolean. Retorna null se for outro valor.
const parseBool = (v) => (v === 'true' ? true : v === 'false' ? false : null);

module.exports = { first, isNonEmptyString, isBoolean, isInteger, isNumber, isEmail, parseIntStrict, parseBool };
