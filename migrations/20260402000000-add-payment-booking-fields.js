'use strict';

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      ALTER TABLE orders
      ADD COLUMN seat_ids_json TEXT NULL AFTER status,
      ADD COLUMN booking_code VARCHAR(64) NULL AFTER seat_ids_json,
      ADD COLUMN ticket_code VARCHAR(64) NULL AFTER booking_code,
      ADD COLUMN ticket_qr_data TEXT NULL AFTER ticket_code,
      ADD COLUMN paid_at DATETIME NULL AFTER ticket_qr_data
    `);

    await sequelize.query(`
      ALTER TABLE payments
      MODIFY COLUMN provider ENUM('cash','onepay') DEFAULT NULL,
      ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'VND' AFTER amount,
      ADD COLUMN merch_txn_ref VARCHAR(64) NULL AFTER currency,
      ADD COLUMN gateway_transaction_no VARCHAR(50) NULL AFTER merch_txn_ref,
      ADD COLUMN response_code VARCHAR(10) NULL AFTER gateway_transaction_no,
      ADD COLUMN message TEXT NULL AFTER response_code,
      ADD COLUMN paid_at DATETIME NULL AFTER message,
      ADD UNIQUE KEY payments_merch_txn_ref_unique (merch_txn_ref)
    `);

    await sequelize.query(`
      CREATE TABLE onepay_transactions (
        id INT NOT NULL AUTO_INCREMENT,
        merch_txn_ref VARCHAR(64) NOT NULL,
        order_id INT NOT NULL,
        booking_id INT NULL,
        amount DECIMAL(10,2) NOT NULL,
        locale VARCHAR(5) NOT NULL DEFAULT 'vn',
        client_ip VARCHAR(64) NULL,
        status ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
        response_code VARCHAR(10) NULL,
        transaction_no VARCHAR(50) NULL,
        message TEXT NULL,
        secure_hash_valid TINYINT(1) NOT NULL DEFAULT 0,
        gateway_url TEXT NULL,
        return_query LONGTEXT NULL,
        ipn_query LONGTEXT NULL,
        paid_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY onepay_transactions_merch_txn_ref_unique (merch_txn_ref),
        KEY onepay_transactions_order_id_idx (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
    `);
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      DROP TABLE IF EXISTS onepay_transactions
    `);

    await sequelize.query(`
      ALTER TABLE payments
      DROP COLUMN paid_at,
      DROP COLUMN message,
      DROP COLUMN response_code,
      DROP COLUMN gateway_transaction_no,
      DROP COLUMN merch_txn_ref,
      DROP COLUMN currency,
      DROP INDEX payments_merch_txn_ref_unique,
      MODIFY COLUMN provider ENUM('momo','vnpay','cash') DEFAULT NULL
    `);

    await sequelize.query(`
      ALTER TABLE orders
      DROP COLUMN paid_at,
      DROP COLUMN ticket_qr_data,
      DROP COLUMN ticket_code,
      DROP COLUMN booking_code,
      DROP COLUMN seat_ids_json
    `);
  },
};
