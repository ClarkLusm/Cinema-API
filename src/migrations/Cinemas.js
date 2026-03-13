module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('cinemas', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      name: Sequelize.STRING,

      address: Sequelize.STRING,

      city: Sequelize.STRING,

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('cinemas');
  }
};