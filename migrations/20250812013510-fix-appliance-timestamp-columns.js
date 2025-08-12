// migrations/fix-appliance-timestamp-columns.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('Appliances');

    // Add created_at if missing
    if (!tableDefinition.created_at) {
      await queryInterface.addColumn('Appliances', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      });
      console.log('✅ Added created_at to Appliances');
    }

    // Add updated_at if missing
    if (!tableDefinition.updated_at) {
      await queryInterface.addColumn('Appliances', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      });
      console.log('✅ Added updated_at to Appliances');
    }

    // Add deleted_at if missing (only if paranoid: true)
    if (!tableDefinition.deleted_at) {
      await queryInterface.addColumn('Appliances', 'deleted_at', {
        type: Sequelize.DATE
      });
      console.log('✅ Added deleted_at to Appliances');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('Appliances');

    if (tableDefinition.created_at) {
      await queryInterface.removeColumn('Appliances', 'created_at');
    }
    if (tableDefinition.updated_at) {
      await queryInterface.removeColumn('Appliances', 'updated_at');
    }
    if (tableDefinition.deleted_at) {
      await queryInterface.removeColumn('Appliances', 'deleted_at');
    }
  }
};