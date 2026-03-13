module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('payments', {

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

      method: {
        type: Sequelize.ENUM(
          'momo',
          'vnpay',
          'cash'
        )
      },

      amount: Sequelize.DECIMAL(10,2),

      status: {
        type: Sequelize.ENUM(
          'pending',
          'success',
          'failed'
        )
      },

      transaction_id: Sequelize.STRING,

      paid_at: Sequelize.DATE

    });

  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};