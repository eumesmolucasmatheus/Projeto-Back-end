'use strict';

// Índices em slug: acelera as buscas /category/slug/:slug e /product/slug/:slug
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('products', ['slug'], { name: 'idx_products_slug' });
    await queryInterface.addIndex('categories', ['slug'], { name: 'idx_categories_slug' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('products', 'idx_products_slug');
    await queryInterface.removeIndex('categories', 'idx_categories_slug');
  },
};
