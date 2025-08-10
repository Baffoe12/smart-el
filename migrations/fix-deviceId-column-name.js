// migration: fix-deviceId-column-name.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename deviceId → device_id
    await queryInterface.renameColumn('Devices', 'deviceId', 'device_id');
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Devices', 'device_id', 'deviceId');
  }
};