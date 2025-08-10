'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, we need to handle the foreign key dependencies
    // Remove the foreign key constraint from SensorData
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});
    
    // Now we can safely modify the Devices table
    // Ensure deviceId is properly configured as primary key
    await queryInterface.changeColumn('Devices', 'deviceId', {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    });
    
    // Re-add the foreign key constraint
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
    // Remove foreign key constraint
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});
    
    // Revert deviceId column changes if needed
    await queryInterface.changeColumn('Devices', 'deviceId', {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    });
    
    // Re-add foreign key constraint
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
