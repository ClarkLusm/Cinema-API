module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('seats', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      room_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'rooms',
          key: 'id'
        }
      },

      seat_row: Sequelize.STRING,

      seat_number: Sequelize.INTEGER,

      type: {
        type: Sequelize.ENUM('normal', 'vip', 'couple'),
        defaultValue: 'normal'
      }

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('seats');
  }
};