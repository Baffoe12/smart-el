// migrations/XXXXXXXXXXXXXX-add-last_seen-to-devices.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Devices', 'last_seen', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Devices', 'last_seen');
  }
};