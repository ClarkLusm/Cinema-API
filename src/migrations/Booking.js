module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('bookings', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },

      showtime_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'showtimes',
          key: 'id'
        }
      },

      booking_code: {
        type: Sequelize.STRING,
        unique: true
      },

      total_price: Sequelize.DECIMAL(10,2),

      status: {
        type: Sequelize.ENUM(
          'pending',
          'paid',
          'cancelled'
        ),
        defaultValue: 'pending'
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('bookings');
  }
};