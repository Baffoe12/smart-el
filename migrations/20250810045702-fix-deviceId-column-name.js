// migrations/XXXXXXXX-fix-deviceId-column-name.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('devices');

    // Rename deviceId → device_id if deviceId exists and device_id doesn't
    if (tableInfo.deviceId && !tableInfo.device_id) {
      console.log('Renaming deviceId → device_id');
      await queryInterface.renameColumn('devices', 'deviceId', 'device_id');
    } else if (tableInfo.device_id) {
      console.log('Column device_id already exists. Skipping rename.');
    } else {
      console.log('No deviceId or device_id column found!');
    }

    // Rename lastSeen → last_seen
    if (tableInfo.lastSeen && !tableInfo.last_seen) {
      console.log('Renaming lastSeen → last_seen');
      await queryInterface.renameColumn('devices', 'lastSeen', 'last_seen');
    }

    // createdAt → created_at
    if (tableInfo.createdAt && !tableInfo.created_at) {
      console.log('Renaming createdAt → created_at');
      await queryInterface.renameColumn('devices', 'createdAt', 'created_at');
    }

    // updatedAt → updated_at
    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      console.log('Renaming updatedAt → updated_at');
      await queryInterface.renameColumn('devices', 'updatedAt', 'updated_at');
    }

    // deletedAt → deleted_at (only if paranoid: true)
    if (tableInfo.deletedAt && !tableInfo.deleted_at) {
      console.log('Renaming deletedAt → deleted_at');
      await queryInterface.renameColumn('devices', 'deletedAt', 'deleted_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('devices');

    // Reverse renames only if target doesn't exist
    if (tableInfo.device_id && !tableInfo.deviceId) {
      await queryInterface.renameColumn('devices', 'device_id', 'deviceId');
    }

    if (tableInfo.last_seen && !tableInfo.lastSeen) {
      await queryInterface.renameColumn('devices', 'last_seen', 'lastSeen');
    }

    if (tableInfo.created_at && !tableInfo.createdAt) {
      await queryInterface.renameColumn('devices', 'created_at', 'createdAt');
    }

    if (tableInfo.updated_at && !tableInfo.updatedAt) {
      await queryInterface.renameColumn('devices', 'updated_at', 'updatedAt');
    }

    if (tableInfo.deleted_at && !tableInfo.deletedAt) {
      await queryInterface.renameColumn('devices', 'deleted_at', 'deletedAt');
    }
  }
};