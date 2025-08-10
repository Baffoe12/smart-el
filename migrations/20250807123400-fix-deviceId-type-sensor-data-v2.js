// migrations/xxxxx-fix-sensor-data-deviceid-foreign-key.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tableDescription = await queryInterface.describeTable('SensorData');
      const hasDeviceId = tableDescription.hasOwnProperty('deviceId');

      if (hasDeviceId) {
        // Drop existing FK if exists
        try {
          await queryInterface.removeConstraint(
            'SensorData',
            'SensorData_deviceId_fkey',
            { transaction }
          );
        } catch (err) {
          console.log('No foreign key constraint to remove: SensorData_deviceId_fkey');
        }

        // Ensure column is STRING and NOT NULL
        await queryInterface.changeColumn('SensorData', 'deviceId', {
          type: Sequelize.STRING,
          allowNull: false
        }, { transaction });

        // Re-add foreign key to Devices(device_id)
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

      } else {
        // Column doesn't exist — add it
        await queryInterface.addColumn('SensorData', 'deviceId', {
          type: Sequelize.STRING,
          allowNull: false
        }, { transaction });

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
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey', { transaction });
      await queryInterface.changeColumn('SensorData', 'deviceId', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};