// migrations/XXXXXXXXXXXXXX-create-devices.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Devices', {
      // Primary key: maps JS `deviceId` → DB `device_id`
      deviceId: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        field: 'device_id',
        comment: 'Unique device identifier (e.g., SmartBoard_01)'
      },

      // Device IP address
      ip: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Current IP address of the device'
      },

      // Last seen timestamp
      lastSeen: {
        type: Sequelize.DATE,
        field: 'last_seen',
        allowNull: true,
        comment: 'Timestamp of last communication from the device'
      },

      // Timestamps (automatically managed by Sequelize)
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
    }, {
      // Table-level options
      tableName: 'Devices',
      timestamps: false, // We define createdAt/updatedAt manually
      paranoid: true,    // Enables soft-delete
      comment: 'Stores IoT device metadata and connection status'
    });

    // Optional: Add index on `device_id` for performance (redundant since PK)
    // await queryInterface.addIndex('Devices', ['device_id']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the table if it exists
    const tableExists = await queryInterface.sequelize
      .query(`SELECT to_regclass('public."Devices"');`)
      .then(res => res[0][0].to_regclass !== null)
      .catch(() => false);

    if (tableExists) {
      await queryInterface.dropTable('Devices');
    }
  }
};