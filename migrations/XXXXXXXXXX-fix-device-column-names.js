module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'devices'; // ← lowercase, correct name

    let tableInfo;
    try {
      tableInfo = await queryInterface.describeTable(tableName);
    } catch (err) {
      console.error(`❌ Table "${tableName}" not found. Check the name.`);
      throw new Error(`Table "devices" does not exist. Cannot apply migration.`);
    }

    // Example: rename a column only if it exists and target doesn't
    if (tableInfo.deviceId && !tableInfo.device_id) {
      console.log('Renaming deviceId → device_id');
      await queryInterface.renameColumn(tableName, 'deviceId', 'device_id');
    }

    if (tableInfo.createdAt && !tableInfo.created_at) {
      console.log('Renaming createdAt → created_at');
      await queryInterface.renameColumn(tableName, 'createdAt', 'created_at');
    }

    if (tableInfo.updatedAt && !tableInfo.updated_at) {
      console.log('Renaming updatedAt → updated_at');
      await queryInterface.renameColumn(tableName, 'updatedAt', 'updated_at');
    }

    if (tableInfo.deletedAt && !tableInfo.deleted_at) {
      console.log('Renaming deletedAt → deleted_at');
      await queryInterface.renameColumn(tableName, 'deletedAt', 'deleted_at');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableName = 'devices';

    const tableInfo = await queryInterface.describeTable(tableName);

    if (tableInfo.device_id && !tableInfo.deviceId) {
      await queryInterface.renameColumn(tableName, 'device_id', 'deviceId');
    }

    if (tableInfo.created_at && !tableInfo.createdAt) {
      await queryInterface.renameColumn(tableName, 'created_at', 'createdAt');
    }

    if (tableInfo.updated_at && !tableInfo.updatedAt) {
      await queryInterface.renameColumn(tableName, 'updated_at', 'updatedAt');
    }

    if (tableInfo.deleted_at && !tableInfo.deletedAt) {
      await queryInterface.renameColumn(tableName, 'deleted_at', 'deletedAt');
    }
  }
};