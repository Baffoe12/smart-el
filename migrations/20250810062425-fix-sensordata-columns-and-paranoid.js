// migrations/XXXXXXXXXXXXXX-fix-sensordata-columns-and-paranoid.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('sensor_data');

    // 1. Add `deleted_at` if missing (for paranoid: true)
    if (!tableInfo.deleted_at && !tableInfo.deletedAt) {
      await queryInterface.addColumn('sensor_data', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
      console.log('✅ Added `deleted_at` column to sensor_data');
    }

    // 2. Rename camelCase → snake_case if needed
    if (tableInfo.applianceId && !tableInfo.appliance_id) {
      await queryInterface.renameColumn('sensor_data', 'applianceId', 'appliance_id');
      console.log('✅ Renamed `applianceId` → `appliance_id`');
    }

    if (tableInfo.deviceId && !tableInfo.device_id) {
      await queryInterface.renameColumn('sensor_data', 'deviceId', 'device_id');
      console.log('✅ Renamed `deviceId` → `device_id`');
    }

    // Optional: Rename timestamps if needed
    if (tableInfo.createdAt && !tableInfo.created_at) {
      await queryInterface.renameColumn('sensor_data', 'createdAt', 'created_at');
    }
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      await queryInterface.renameColumn('sensor_data', 'updatedAt', 'updated_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse the changes if needed
    await queryInterface.renameColumn('sensor_data', 'appliance_id', 'applianceId');
    await queryInterface.renameColumn('sensor_data', 'device_id', 'deviceId');
    await queryInterface.removeColumn('sensor_data', 'deleted_at');

    // Reverse timestamps if renamed
    await queryInterface.renameColumn('sensor_data', 'created_at', 'createdAt');
    await queryInterface.renameColumn('sensor_data', 'updated_at', 'updatedAt');
  }
};
