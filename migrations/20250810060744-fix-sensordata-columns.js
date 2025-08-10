// migrations/XXXXXXXX-fix-sensordata-columns.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('SensorData');

    // Rename camelCase → snake_case if needed
    if (tableInfo.deviceId && !tableInfo.device_id) {
      await queryInterface.renameColumn('SensorData', 'deviceId', 'device_id');
    }
    if (tableInfo.applianceId && !tableInfo.appliance_id) {
      await queryInterface.renameColumn('SensorData', 'applianceId', 'appliance_id');
    }
    if (tableInfo.createdAt && !tableInfo.created_at) {
      await queryInterface.renameColumn('SensorData', 'createdAt', 'created_at');
    }
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      await queryInterface.renameColumn('SensorData', 'updatedAt', 'updated_at');
    }
    if (tableInfo.deletedAt && !tableInfo.deleted_at) {
      await queryInterface.renameColumn('SensorData', 'deletedAt', 'deleted_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse if needed
  }
};