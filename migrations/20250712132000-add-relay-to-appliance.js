'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Appliances', 'relay', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1, // or choose an appropriate default
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Appliances', 'relay');
  }
};
