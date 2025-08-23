'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Appliances');

    if (!tableInfo.name) {
      await queryInterface.addColumn('Appliances', 'name', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Unnamed Appliance'
      });
    }

    if (!tableInfo.location) {
      await queryInterface.addColumn('Appliances', 'location', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'Unknown'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Appliances');

    if (tableInfo.name) {
      await queryInterface.removeColumn('Appliances', 'name');
    }

    if (tableInfo.location) {
      await queryInterface.removeColumn('Appliances', 'location');
    }
  }
};