// migrations/add-scheduling-columns-to-appliances.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Appliances', 'scheduled', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });

    await queryInterface.addColumn('Appliances', 'schedule_on', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Appliances', 'schedule_off', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Appliances', 'scheduled');
    await queryInterface.removeColumn('Appliances', 'schedule_on');
    await queryInterface.removeColumn('Appliances', 'schedule_off');
  }
};