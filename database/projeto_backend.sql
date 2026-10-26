-- =====================================================================
-- Digital Store API - Script SQL do banco de dados (MySQL 8+)
-- Espelha exatamente as migrations em src/migrations.
-- Uso: mysql -u root -p < database/projeto_backend.sql
-- Obs.: o caminho recomendado continua sendo "npm run migrate";
--       este script é a versão em SQL puro da mesma modelagem.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS projeto_backend
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE projeto_backend;

-- ---------------------------------------------------------------------
-- Requisito 01 - Usuários (senha armazenada como hash bcrypt)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT          NOT NULL AUTO_INCREMENT,
  firstname   VARCHAR(255) NOT NULL,
  surname     VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Requisito 02 - Categorias
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INT          NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  use_in_menu BOOLEAN      NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)          -- busca por slug rápida e sem duplicatas
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Requisito 03 - Produtos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  INT          NOT NULL AUTO_INCREMENT,
  enabled             BOOLEAN      NOT NULL DEFAULT 0,
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(255) NOT NULL,
  use_in_menu         BOOLEAN      NOT NULL DEFAULT 0,
  stock               INT          NOT NULL DEFAULT 0,
  description         VARCHAR(255) NULL,
  price               FLOAT        NOT NULL,
  price_with_discount FLOAT        NOT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_price (price)                -- filtro "price-range" da busca
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Requisito 04 - Imagens do produto
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id          INT          NOT NULL AUTO_INCREMENT,
  product_id  INT          NOT NULL,
  enabled     BOOLEAN      NOT NULL DEFAULT 0,
  path        VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_product_images_product (product_id),
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Requisito 05 - Opções do produto
-- "values" é palavra reservada no MySQL, por isso vai entre crases.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_options (
  id          INT                       NOT NULL AUTO_INCREMENT,
  product_id  INT                       NOT NULL,
  title       VARCHAR(255)              NOT NULL,
  shape       ENUM('square', 'circle')  NOT NULL DEFAULT 'square',
  radius      INT                       NOT NULL DEFAULT 0,
  type        ENUM('text', 'color')     NOT NULL DEFAULT 'text',
  `values`    VARCHAR(255)              NOT NULL,   -- valores separados por vírgula
  PRIMARY KEY (id),
  KEY idx_product_options_product (product_id),
  CONSTRAINT fk_product_options_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Requisito 06 - Produtos x Categorias (relação N:N)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
  product_id  INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (product_id, category_id),
  KEY idx_product_categories_category (category_id), -- filtro "category_ids"
  CONSTRAINT fk_pc_product
    FOREIGN KEY (product_id)  REFERENCES products (id)   ON DELETE CASCADE,
  CONSTRAINT fk_pc_category
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Dados de exemplo: rode "npm run seed" após criar as tabelas.
