'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Drop existing foreign key constraint if it exists
      await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey', { transaction }).catch(() => {});
      
      // Change column type to STRING to match Devices.device_id
      await queryInterface.changeColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Devices',
          key: 'device_id'
        }
      }, { transaction });
      
      // Add foreign key constraint
      await queryInterface.addConstraint('SensorData', {
        fields: ['deviceId'],
        type: 'foreign key',
        name: 'SensorData_deviceId_fkey',
        references: {
          table: 'Devices',
          field: 'device_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }, { transaction });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Drop foreign key constraint
      await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey', { transaction });
      
      // Revert column type back to STRING (as it was originally)
      await queryInterface.changeColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
    });
  }
};
