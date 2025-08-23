module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Appliances');

    if (!tableInfo.manually_added) {
      console.log('Adding `manually_added` column');
      await queryInterface.addColumn('Appliances', 'manually_added', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
    } else {
      console.log('⏭️ Column `manually_added` already exists. Skipping.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('Appliances');
    if (tableInfo.manually_added) {
      await queryInterface.removeColumn('Appliances', 'manually_added');
    }
  }
};