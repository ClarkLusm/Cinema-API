module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('genres', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      name: Sequelize.STRING,

      slug: Sequelize.STRING
    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('genres');
  }
};