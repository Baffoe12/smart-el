// migrations/20250712136000-add-device-id-to-devices.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add device_id if not exists
    await queryInterface.addColumn('devices', 'device_id', {
      type: Sequelize.STRING,
      allowNull: true
    }).catch(() => {}); // ignore if already exists

    // Backfill with UUID-based ID
    await queryInterface.sequelize.query(`
      UPDATE "devices"
      SET "device_id" = 'DEV-' || REPLACE(GEN_RANDOM_UUID()::TEXT, '-', '')
      WHERE "device_id" IS NULL OR "device_id" = ''
    `);

    // Now make it required
    await queryInterface.changeColumn('devices', 'device_id', {
      type: Sequelize.STRING,
      allowNull: false
    });

    // Ensure uniqueness
    await queryInterface.addConstraint('devices', {
      fields: ['device_id'],
      type: 'unique',
      name: 'devices_device_id_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('devices', 'devices_device_id_unique');
    await queryInterface.removeColumn('devices', 'device_id');
  }
};