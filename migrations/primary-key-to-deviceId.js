'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove FK first
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});

    // Make sure Devices.deviceId is STRING and NOT NULL
    await queryInterface.changeColumn('Devices', 'deviceId', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Re-add as primary key (if desired)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Devices" DROP CONSTRAINT IF EXISTS "Devices_pkey",
      ADD CONSTRAINT "Devices_pkey" PRIMARY KEY ("deviceId")
    `);

    // Re-add FK
    await queryInterface.addConstraint('SensorData', {
      fields: ['deviceId'],
      type: 'foreign key',
      name: 'SensorData_deviceId_fkey',
      references: {
        table: 'Devices',
        field: 'deviceId'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove FK
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});
    
    // Remove primary key constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "Devices" DROP CONSTRAINT IF EXISTS "Devices_pkey"
    `);
    
    // Revert deviceId column to allow null (if needed)
    await queryInterface.changeColumn('Devices', 'deviceId', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    // Re-add FK with original constraints
    await queryInterface.addConstraint('SensorData', {
      fields: ['deviceId'],
      type: 'foreign key',
      name: 'SensorData_deviceId_fkey',
      references: {
        table: 'Devices',
        field: 'deviceId'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
