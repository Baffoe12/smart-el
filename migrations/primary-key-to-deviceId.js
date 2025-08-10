module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Devices');

    // Only add deviceId if it doesn't exist
    if (!tableInfo.deviceId && !tableInfo.device_id) {
      await queryInterface.addColumn('Devices', 'deviceId', {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        field: 'device_id'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Devices');

    // Only remove if it exists
    if (tableInfo.deviceId) {
      await queryInterface.removeColumn('Devices', 'deviceId');
    } else if (tableInfo.device_id) {
      await queryInterface.removeColumn('Devices', 'device_id');
    }
  }
};
