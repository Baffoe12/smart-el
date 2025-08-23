// migrations/20250810071721-add-paranoid-columns-safely.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'sensor_data';

    // ✅ Handle sensor_data (safe)
    let tableInfo;
    try {
      tableInfo = await queryInterface.describeTable(tableName);
    } catch (err) {
      console.error(`❌ Table "${tableName}" not found. Skipping.`);
      // Don't throw — just skip
    }

    if (tableInfo && !tableInfo.deleted_at) {
      console.log('Adding `deleted_at` to `sensor_data`');
      await queryInterface.addColumn(tableName, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } else if (tableInfo) {
      console.log('⏭️ `deleted_at` already exists in sensor_data');
    }

    // ✅ Handle appliances (only if table exists)
    const applianceTable = 'appliances';

    let applianceInfo;
    try {
      applianceInfo = await queryInterface.describeTable(applianceTable);
    } catch (err) {
      console.warn(`🟡 Table "${applianceTable}" not found. It may not exist yet or was renamed. Skipping.`);
      return; // Skip appliance part — safe!
    }

    if (!applianceInfo.deleted_at) {
      console.log('Adding `deleted_at` to `appliances`');
      await queryInterface.addColumn(applianceTable, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } else {
      console.log('⏭️ `deleted_at` already exists in appliances');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse only if column exists
    const sensorTable = 'sensor_data';
    const applianceTable = 'appliances';

    try {
      const sensorInfo = await queryInterface.describeTable(sensorTable);
      if (sensorInfo.deleted_at) {
        await queryInterface.removeColumn(sensorTable, 'deleted_at');
      }
    } catch (err) {
      console.log(`Table ${sensorTable} not found or already removed. Skipping.`);
    }

    try {
      const applianceInfo = await queryInterface.describeTable(applianceTable);
      if (applianceInfo.deleted_at) {
        await queryInterface.removeColumn(applianceTable, 'deleted_at');
      }
    } catch (err) {
      console.log(`Table ${applianceTable} not found or already removed. Skipping.`);
    }
  }
};