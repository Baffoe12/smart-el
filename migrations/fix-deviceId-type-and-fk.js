// migrations/fix-deviceId-foreignKey.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove any existing broken FK
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});

    // Ensure column is STRING
    await queryInterface.changeColumn('SensorData', 'device_id', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Add correct FK to Devices.device_id
    await queryInterface.addConstraint('SensorData', {
      fields: ['device_id'],
      type: 'foreign key',
      name: 'SensorData_deviceId_fkey',
      references: {
        table: 'Devices',
        field: 'device_id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey');
    await queryInterface.changeColumn('SensorData', 'device_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};