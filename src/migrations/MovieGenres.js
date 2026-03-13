module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('movie_genres', {

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

      genre_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'genres',
          key: 'id'
        }
      }

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('movie_genres');
  }
};