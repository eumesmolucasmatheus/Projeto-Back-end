'use strict';

// Torna o slug único em produtos e categorias (substitui os índices comuns)
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeIndex('products', 'idx_products_slug');
    await queryInterface.removeIndex('categories', 'idx_categories_slug');
    await queryInterface.addIndex('products', ['slug'], { name: 'uq_products_slug', unique: true });
    await queryInterface.addIndex('categories', ['slug'], { name: 'uq_categories_slug', unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('products', 'uq_products_slug');
    await queryInterface.removeIndex('categories', 'uq_categories_slug');
    await queryInterface.addIndex('products', ['slug'], { name: 'idx_products_slug' });
    await queryInterface.addIndex('categories', ['slug'], { name: 'idx_categories_slug' });
  },
};
