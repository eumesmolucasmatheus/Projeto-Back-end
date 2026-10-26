// Salva e remove imagens de produtos no disco
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_PREFIX = '/assets/images';
const EXTENSIONS = { 'image/png': '.png', 'image/jpg': '.jpg', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };

// Pasta de uploads (configurável por UPLOAD_DIR, útil nos testes)
const getUploadDir = () => process.env.UPLOAD_DIR || path.join(__dirname, '../assets/images');

module.exports = {
  PUBLIC_PREFIX,
  getUploadDir,
  isSupportedType: (type) => Object.prototype.hasOwnProperty.call(EXTENSIONS, type),

  // Salva uma imagem em base64 e devolve o caminho público (ex.: /assets/images/abc.png)
  async saveImage(content, type) {
    // Aceita tanto base64 puro quanto data URI ("data:image/png;base64,....")
    const base64 = content.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const filename = `${crypto.randomUUID()}${EXTENSIONS[type]}`;

    await fs.mkdir(getUploadDir(), { recursive: true });
    await fs.writeFile(path.join(getUploadDir(), filename), buffer);
    return `${PUBLIC_PREFIX}/${filename}`;
  },

  // Remove o arquivo de uma imagem (ignora erros, ex.: arquivo já removido)
  async removeImage(publicPath) {
    if (typeof publicPath !== 'string') return;
    publicPath = `/${publicPath.replace(/^\/+/, '')}`; // tolera caminho sem a barra inicial
    if (!publicPath.startsWith(`${PUBLIC_PREFIX}/`)) return;
    try {
      await fs.unlink(path.join(getUploadDir(), path.basename(publicPath)));
    } catch (err) { /* arquivo inexistente: nada a fazer */ }
  },
};
