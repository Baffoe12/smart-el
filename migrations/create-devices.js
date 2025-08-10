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
      lastSeen: {
        type: Sequelize.DATE,
        field: 'last_seen'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at'
      },
      deletedAt: {
        type: Sequelize.DATE,
        field: 'deleted_at',
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Devices');
  }
};