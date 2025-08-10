// migrations/XXXXXXXX-fix-deviceId-column-name.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename deviceId → device_id
    await queryInterface.renameColumn('Devices', 'deviceId', 'device_id');
    await queryInterface.renameColumn('Devices', 'lastSeen', 'last_seen');
    await queryInterface.renameColumn('Devices', 'createdAt', 'created_at');
    await queryInterface.renameColumn('Devices', 'updatedAt', 'updated_at');
    await queryInterface.renameColumn('Devices', 'deletedAt', 'deleted_at');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Devices', 'device_id', 'deviceId');
    await queryInterface.renameColumn('Devices', 'last_seen', 'lastSeen');
    await queryInterface.renameColumn('Devices', 'created_at', 'createdAt');
    await queryInterface.renameColumn('Devices', 'updated_at', 'updatedAt');
    await queryInterface.renameColumn('Devices', 'deleted_at', 'deletedAt');
  }
};