'use strict';

require('dotenv').config();

const mysql = require('mysql2/promise');

const DEFAULT_DELAY_MS = Number(process.env.DB_CONNECT_RETRY_DELAY || 2000);
const DEFAULT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 30);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openServerConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
}

async function createDatabase({ dropFirst = false } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt += 1) {
    let connection;

    try {
      connection = await openServerConnection();

      if (dropFirst) {
        await connection.query(
          `DROP DATABASE IF EXISTS \`${process.env.DB_NAME || 'db_cinema'}\``
        );
      }

      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'db_cinema'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      await connection.end();
      console.log(`Database ${process.env.DB_NAME || 'db_cinema'} is ready.`);
      return;
    } catch (error) {
      lastError = error;

      if (connection) {
        await connection.end().catch(() => {});
      }

      if (attempt === DEFAULT_RETRIES) {
        break;
      }

      console.log(
        `Waiting for database server (${attempt}/${DEFAULT_RETRIES})...`
      );
      await sleep(DEFAULT_DELAY_MS);
    }
  }

  throw lastError;
}

module.exports = createDatabase;

if (require.main === module) {
  const dropFirst = process.argv.includes('--reset');

  createDatabase({ dropFirst }).catch((error) => {
    console.error('Failed to prepare database.');
    console.error(error.message);
    process.exit(1);
  });
}
