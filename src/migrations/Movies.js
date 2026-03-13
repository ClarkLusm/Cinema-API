'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('movies', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      slug: {
        type: Sequelize.STRING,
        unique: true
      },

      description: {
        type: Sequelize.TEXT
      },

      duration: {
        type: Sequelize.INTEGER
      },

      release_date: {
        type: Sequelize.DATE
      },

      language: {
        type: Sequelize.STRING
      },

      poster_url: {
        type: Sequelize.STRING
      },

      trailer_url: {
        type: Sequelize.STRING
      },

      age_rating: {
        type: Sequelize.STRING
      },

      status: {
        type: Sequelize.ENUM(
          'coming_soon',
          'now_showing',
          'ended'
        ),
        defaultValue: 'coming_soon'
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },

      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('movies');
  }
};