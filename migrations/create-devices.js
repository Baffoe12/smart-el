module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Devices', {
      deviceId: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        field: 'device_id' // ← Ensures column is named `device_id`
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_seen: {
        type: Sequelize.DATE
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Devices');
  }
};