// migrations/XXXXXXXX-fix-deviceId-column-name.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename deviceId → device_id
    await queryInterface.renameColumn('devices', 'deviceId', 'device_id');
    await queryInterface.renameColumn('devices', 'lastSeen', 'last_seen');
    await queryInterface.renameColumn('devices', 'createdAt', 'created_at');
    await queryInterface.renameColumn('devices', 'updatedAt', 'updated_at');
    await queryInterface.renameColumn('devices', 'deletedAt', 'deleted_at');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('devices', 'device_id', 'deviceId');
    await queryInterface.renameColumn('devices', 'last_seen', 'lastSeen');
    await queryInterface.renameColumn('devices', 'created_at', 'createdAt');
    await queryInterface.renameColumn('devices', 'updated_at', 'updatedAt');
    await queryInterface.renameColumn('devices', 'deleted_at', 'deletedAt');
  }
};