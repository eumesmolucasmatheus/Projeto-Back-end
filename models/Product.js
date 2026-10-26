const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const slugify = require('../utils/slugify');

// Model Product (tabela products)
const Product = sequelize.define('Product', {
  enabled: { type: DataTypes.BOOLEAN, defaultValue: false },       // produto ativo/inativo
  name: { type: DataTypes.STRING(150), allowNull: false },         // nome do produto
  slug: { type: DataTypes.STRING(150), allowNull: false },         // slug para URLs amigáveis
  use_in_menu: { type: DataTypes.BOOLEAN, defaultValue: false },   // aparece no menu?
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },             // quantidade em estoque
  description: { type: DataTypes.TEXT },                           // descrição
  price: { type: DataTypes.FLOAT, allowNull: false },              // preço padrão
  price_with_discount: { type: DataTypes.FLOAT, allowNull: false } // preço com desconto
}, {
  timestamps: true, // created_at, updated_at
  tableName: 'products',
  indexes: [{ name: 'idx_products_slug', fields: ['slug'] }],
  hooks: {
    // Gera o slug automaticamente se não for informado
    beforeValidate: (product) => {
      if (product.name && !product.slug) product.slug = slugify(product.name);
    },
  },
});

module.exports = Product;
