const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const slugify = require('../utils/slugify');

// Model Category (tabela categories)
const Category = sequelize.define('Category', {
  name: { type: DataTypes.STRING, allowNull: false },            // nome (obrigatório)
  slug: { type: DataTypes.STRING, allowNull: false },            // slug (obrigatório)
  use_in_menu: { type: DataTypes.BOOLEAN, defaultValue: false }, // aparece no menu?
}, {
  timestamps: true,
  tableName: 'categories',
  indexes: [{ name: 'idx_categories_slug', fields: ['slug'] }],
  hooks: {
    // Gera o slug automaticamente se não for informado
    beforeValidate(category) {
      if (category.name && !category.slug) category.slug = slugify(category.name);
    },
  },
});

module.exports = Category;
