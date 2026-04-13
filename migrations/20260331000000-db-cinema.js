'use strict';

const {
  getSchemaStatements,
  getTablesFromCreateStatements,
} = require("../src/utils/sqlDumpLoader");

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const schemaStatements = getSchemaStatements();

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    try {
      for (const statement of schemaStatements) {
        await sequelize.query(statement);
      }
    } finally {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const tables = getTablesFromCreateStatements().reverse();

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");

    try {
      for (const table of tables) {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
      }
    } finally {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    }
  },
};
