// migrations/fix-deviceId-type-and-fk.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const deviceTable = 'devices';
    const sensorDataTable = 'sensor_data';

    // 1. Confirm devices table exists and has device_id
    let deviceInfo;
    try {
      deviceInfo = await queryInterface.describeTable(deviceTable);
    } catch (err) {
      console.error(`❌ Table "${deviceTable}" not found.`);
      throw err;
    }

    if (!deviceInfo.device_id) {
      console.error(`❌ Column "device_id" not found in "devices".`);
      throw new Error('Cannot proceed: devices.device_id missing');
    }

    // 2. Confirm sensor_data table exists
    let sensorDataInfo;
    try {
      sensorDataInfo = await queryInterface.describeTable(sensorDataTable);
    } catch (err) {
      console.error(`❌ Table "${sensorDataTable}" not found.`);
      throw err;
    }

    // 3. Check which column exists: `deviceId` or `device_id`?
    const hasDeviceId = sensorDataInfo.deviceId;
    const hasDeviceIdColumn = sensorDataInfo.device_id;

    if (!hasDeviceId && !hasDeviceIdColumn) {
      console.error(`❌ Neither "deviceId" nor "device_id" found in "sensor_data"`);
      throw new Error('sensor_data is missing device ID column');
    }

    // 4. Prefer `device_id` (snake_case) if using underscored: true
    const fkColumn = hasDeviceIdColumn ? 'device_id' : 'deviceId';
    console.log(`✅ Using column: ${fkColumn} in sensor_data`);

    // 5. Only add FK if it doesn't already exist
    const constraints = await queryInterface.sequelize.query(
      `SELECT constraint_name FROM information_schema.table_constraints
       WHERE table_name = 'sensor_data'
         AND constraint_type = 'FOREIGN KEY'
         AND constraint_name = 'sensor_data_device_id_fk';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (constraints.length === 0) {
      console.log(`✅ Adding foreign key: sensor_data.${fkColumn} → devices.device_id`);
      await queryInterface.addConstraint('sensor_data', {
        fields: [fkColumn],
        type: 'foreign key',
        name: 'sensor_data_device_id_fk',
        references: {
          table: deviceTable,
          field: 'device_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } else {
      console.log('⏭️ Foreign key already exists. Skipping.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove constraint safely
    try {
      await queryInterface.removeConstraint('sensor_data', 'sensor_data_device_id_fk');
    } catch (err) {
      console.log('No foreign key to remove or already removed.');
    }
  }
};