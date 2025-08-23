'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
   await queryInterface.addColumn('users', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'User' // Default value for existing records
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'name');
  }
};
