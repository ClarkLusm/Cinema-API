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
      MODIFY COLUMN provider ENUM('momo','vnpay','cash','vietqr') DEFAULT NULL,
      ADD COLUMN bank_code VARCHAR(50) NULL AFTER status,
      ADD COLUMN account_number VARCHAR(50) NULL AFTER bank_code,
      ADD COLUMN account_name VARCHAR(255) NULL AFTER account_number,
      ADD COLUMN transfer_note VARCHAR(255) NULL AFTER account_name,
      ADD COLUMN qr_payload TEXT NULL AFTER transfer_note,
      ADD COLUMN qr_image_url TEXT NULL AFTER qr_payload,
      ADD COLUMN paid_amount DECIMAL(10,2) NULL AFTER qr_image_url,
      ADD COLUMN webhook_payload TEXT NULL AFTER paid_amount,
      ADD COLUMN paid_at DATETIME NULL AFTER webhook_payload
    `);
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      ALTER TABLE payments
      DROP COLUMN paid_at,
      DROP COLUMN webhook_payload,
      DROP COLUMN paid_amount,
      DROP COLUMN qr_image_url,
      DROP COLUMN qr_payload,
      DROP COLUMN transfer_note,
      DROP COLUMN account_name,
      DROP COLUMN account_number,
      DROP COLUMN bank_code,
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
