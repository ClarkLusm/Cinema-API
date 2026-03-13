module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('rooms', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      cinema_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cinemas',
          key: 'id'
        }
      },

      name: Sequelize.STRING,

      total_seats: Sequelize.INTEGER
    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('rooms');
  }
};