module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Devices', {
      deviceId: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        field: 'device_id' // JS: deviceId → DB: device_id
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lastSeen: {
        type: Sequelize.DATE,
        field: 'last_seen' // JS: lastSeen → DB: last_seen
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