// migrations/add-manually-added-to-appliances.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Appliances', 'manually_added', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Appliances', 'manually_added');
  }
};