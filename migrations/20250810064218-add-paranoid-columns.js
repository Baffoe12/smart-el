// migrations/XXXXXXXX-add-paranoid-columns.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addDeletedAt = (table) => queryInterface.addColumn(table, 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addDeletedAt('Appliances');
    await addDeletedAt('SensorData');
    await addDeletedAt('Devices');
    await addDeletedAt('Users');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Appliances', 'deleted_at');
    await queryInterface.removeColumn('SensorData', 'deleted_at');
    await queryInterface.removeColumn('Devices', 'deleted_at');
    await queryInterface.removeColumn('Users', 'deleted_at');
  }
};