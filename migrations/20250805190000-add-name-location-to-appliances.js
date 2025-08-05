'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Appliances', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Unnamed Appliance'
    });
    
    await queryInterface.addColumn('Appliances', 'location', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Unknown'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Appliances', 'name');
    await queryInterface.removeColumn('Appliances', 'location');
  }
};
