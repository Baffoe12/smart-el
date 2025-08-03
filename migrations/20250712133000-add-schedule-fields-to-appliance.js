'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Appliances', 'scheduled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    
    await queryInterface.addColumn('Appliances', 'scheduleOn', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('Appliances', 'scheduleOff', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Appliances', 'scheduled');
    await queryInterface.removeColumn('Appliances', 'scheduleOn');
    await queryInterface.removeColumn('Appliances', 'scheduleOff');
  }
};
