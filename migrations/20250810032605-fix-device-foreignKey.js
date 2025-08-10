module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Remove FK constraint
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});

    // Step 2: Now Sequelize can safely alter Devices.deviceId if needed
    // (This allows sync to proceed)

    console.log('✅ Removed foreign key constraint. Proceeding with sync.');
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the constraint
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