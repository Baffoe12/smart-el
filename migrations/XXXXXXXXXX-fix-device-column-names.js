// migrations/XXXXXXXXXX-fix-device-column-names.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Devices');

    // Rename deviceId → device_id if it exists
    if (tableInfo.deviceId && !tableInfo.device_id) {
      await queryInterface.renameColumn('Devices', 'deviceId', 'device_id');
    }

    // Rename lastSeen → last_seen
    if (tableInfo.lastSeen && !tableInfo.last_seen) {
      await queryInterface.renameColumn('Devices', 'lastSeen', 'last_seen');
    }

    // Rename createdAt → created_at
    if (tableInfo.createdAt && !tableInfo.created_at) {
      await queryInterface.renameColumn('Devices', 'createdAt', 'created_at');
    }

    // Rename updatedAt → updated_at
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      await queryInterface.renameColumn('Devices', 'updatedAt', 'updated_at');
    }

    // Rename deletedAt → deleted_at
    if (tableInfo.deletedAt && !tableInfo.deleted_at) {
      await queryInterface.renameColumn('Devices', 'deletedAt', 'deleted_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Devices');

    // Reverse: snake_case → camelCase
    if (tableInfo.device_id && !tableInfo.deviceId) {
      await queryInterface.renameColumn('Devices', 'device_id', 'deviceId');
    }
    if (tableInfo.last_seen && !tableInfo.lastSeen) {
      await queryInterface.renameColumn('Devices', 'last_seen', 'lastSeen');
    }
    if (tableInfo.created_at && !tableInfo.createdAt) {
      await queryInterface.renameColumn('Devices', 'created_at', 'createdAt');
    }
    if (tableInfo.updated_at && !tableInfo.updatedAt) {
      await queryInterface.renameColumn('Devices', 'updated_at', 'updatedAt');
    }
    if (tableInfo.deleted_at && !tableInfo.deletedAt) {
      await queryInterface.renameColumn('Devices', 'deleted_at', 'deletedAt');
    }
  }
};