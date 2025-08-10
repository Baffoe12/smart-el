// migrations/XXXXXXXX-add-paranoid-columns-safely.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const addDeletedAtIfMissing = async (table) => {
      const tableInfo = await queryInterface.describeTable(table);
      if (!tableInfo.deleted_at && !tableInfo.deletedAt) {
        await queryInterface.addColumn(table, 'deleted_at', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log(`✅ Added 'deleted_at' to ${table}`);
      } else {
        console.log(`⏭️ 'deleted_at' already exists in ${table}`);
      }
    };

    // Apply to all models using `paranoid: true`
    await addDeletedAtIfMissing('Appliances');
    await addDeletedAtIfMissing('SensorData');
    await addDeletedAtIfMissing('Devices');
    await addDeletedAtIfMissing('Users');
  },

  down: async (queryInterface, Sequelize) => {
    for (const table of ['Appliances', 'SensorData', 'Devices', 'Users']) {
      await queryInterface.removeColumn(table, 'deleted_at').catch(() => {
        console.log(`⏭️ ${table} already missing 'deleted_at'`);
      });
    }
  }
};