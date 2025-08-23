'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'Appliances'; // Match exact name (if capitalized)

    let tableInfo;
    try {
      tableInfo = await queryInterface.describeTable(tableName);
    } catch (err) {
      console.error(`❌ Table "${tableName}" not found. Check name and casing.`);
      throw err;
    }

    // Add `scheduled` if it doesn't exist
    if (!tableInfo.scheduled) {
      console.log('Adding `scheduled` column to `Appliances`');
      await queryInterface.addColumn(tableName, 'scheduled', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
    } else {
      console.log('⏭️ `scheduled` already exists in Appliances');
    }

    // Add `scheduleTime` if needed
    if (!tableInfo.scheduleTime && !tableInfo.schedule_time) {
      console.log('Adding `scheduleTime` column');
      await queryInterface.addColumn(tableName, 'scheduleTime', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } else {
      console.log('⏭️ `scheduleTime` or `schedule_time` already exists');
    }

    // Add other scheduling fields as needed...
  },

  down: async (queryInterface, Sequelize) => {
    const tableName = 'Appliances';

    const tableInfo = await queryInterface.describeTable(tableName);

    if (tableInfo.scheduled) {
      await queryInterface.removeColumn(tableName, 'scheduled');
    }

    if (tableInfo.scheduleTime) {
      await queryInterface.removeColumn(tableName, 'scheduleTime');
    }
  }
};