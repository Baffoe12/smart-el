// migrations/XXXXXXXXXXXXXX-fix-sensordata-columns-and-paranoid.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('SensorData');

    // 1. Add `deleted_at` if missing (for paranoid: true)
    if (!tableInfo.deleted_at && !tableInfo.deletedAt) {
      await queryInterface.addColumn('SensorData', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
      console.log('✅ Added `deleted_at` column to SensorData');
    }

    // 2. Rename camelCase → snake_case if needed
    if (tableInfo.applianceId && !tableInfo.appliance_id) {
      await queryInterface.renameColumn('SensorData', 'applianceId', 'appliance_id');
      console.log('✅ Renamed `applianceId` → `appliance_id`');
    }

    if (tableInfo.deviceId && !tableInfo.device_id) {
      await queryInterface.renameColumn('SensorData', 'deviceId', 'device_id');
      console.log('✅ Renamed `deviceId` → `device_id`');
    }

    // Optional: Rename timestamps if needed
    if (tableInfo.createdAt && !tableInfo.created_at) {
      await queryInterface.renameColumn('SensorData', 'createdAt', 'created_at');
    }
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      await queryInterface.renameColumn('SensorData', 'updatedAt', 'updated_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the changes if needed
    await queryInterface.renameColumn('SensorData', 'appliance_id', 'applianceId');
    await queryInterface.renameColumn('SensorData', 'device_id', 'deviceId');
    await queryInterface.removeColumn('SensorData', 'deleted_at');

    // Reverse timestamps if renamed
    await queryInterface.renameColumn('SensorData', 'created_at', 'createdAt');
    await queryInterface.renameColumn('SensorData', 'updated_at', 'updatedAt');
  }
};