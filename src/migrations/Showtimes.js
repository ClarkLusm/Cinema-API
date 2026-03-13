module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('showtimes', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      movie_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'movies',
          key: 'id'
        }
      },

      room_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'rooms',
          key: 'id'
        }
      },

      start_time: Sequelize.DATE,

      end_time: Sequelize.DATE,

      price: Sequelize.DECIMAL(10,2)

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('showtimes');
  }
};