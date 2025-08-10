'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Check if the column exists and get current type
    const tableDescription = await queryInterface.describeTable('SensorData');
    const hasDeviceId = tableDescription.hasOwnProperty('deviceId');
    
    if (hasDeviceId) {
      // Step 2: Drop existing foreign key constraint if it exists
      try {
        await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey');
      } catch (error) {
        // Constraint might not exist, continue
        console.log('Constraint SensorData_deviceId_fkey does not exist, skipping removal');
      }
      
      // Step 3: Handle data conversion
      // First, make column nullable to handle any data issues
      await queryInterface.changeColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: true
      });
      
      // Step 4: Update any existing data if needed
      // (This would be application-specific if you have data to migrate)
      
      // Step 5: Make column non-nullable
      await queryInterface.changeColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: false
      });
      
      // Step 6: Add foreign key constraint
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
      });
    } else {
      // Column doesn't exist, create it properly
      await queryInterface.addColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Devices',
          key: 'device_id'
        }
      });
      
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
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey');
    } catch (error) {
      console.log('Constraint SensorData_deviceId_fkey does not exist, skipping removal');
    }
    
    // Check if column was originally added by 20250807123200
    const originalMigration = await queryInterface.sequelize.query(
      "SELECT * FROM \"SequelizeMeta\" WHERE name = '20250807123200-add-deviceId-to-sensor-data.js'"
    );
    
    if (originalMigration[0].length > 0) {
      // Column was added by original migration, keep it as STRING
      await queryInterface.changeColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: true
      });
    } else {
      // Column was created by this migration, remove it
      await queryInterface.removeColumn('SensorData', 'deviceId');
    }
  }
};
