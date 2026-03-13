module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('booking_seats', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      booking_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'bookings',
          key: 'id'
        }
      },

      seat_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'seats',
          key: 'id'
        }
      },

      price: Sequelize.DECIMAL(10,2)

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('booking_seats');
  }
};