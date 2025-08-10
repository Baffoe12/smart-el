module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove existing FK if exists
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});

    // Change column type to STRING
    await queryInterface.changeColumn('SensorData', 'deviceId', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Add FK constraint — but reference ACTUAL column name
    await queryInterface.addConstraint('SensorData', {
      fields: ['deviceId'],
      type: 'foreign key',
      name: 'SensorData_deviceId_fkey',
      references: {
        table: 'Devices',
        field: 'deviceId' // ← Use 'deviceId', not 'device_id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Optional: revert the changes made in up
    await queryInterface.removeConstraint('SensorData', 'SensorData_deviceId_fkey').catch(() => {});
    await queryInterface.changeColumn('SensorData', 'deviceId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    // Optionally, add back the old constraint if needed
  }
};