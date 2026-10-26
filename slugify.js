// Gera um slug amigável a partir de um texto ("Tênis Nike" -> "tenis-nike")
module.exports = function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')                // separa letras e acentos
    .replace(/[\u0300-\u036f]/g, '') // remove os acentos
    .replace(/[^a-z0-9 -]/g, '')     // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-');           // espaços viram hífens
};
