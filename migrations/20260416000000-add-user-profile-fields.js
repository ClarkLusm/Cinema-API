'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'age', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'fullname',
    });

    await queryInterface.addColumn('users', 'address', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'avatar',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'address');
    await queryInterface.removeColumn('users', 'age');
  },
};
