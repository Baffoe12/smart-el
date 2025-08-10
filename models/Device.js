// models/Device.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Device = sequelize.define('Device', {
    // Primary key: maps to `device_id` in DB
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      field: 'device_id',
      comment: 'Unique identifier for the IoT device (e.g., SmartBoard_01)'
    },

    // Device IP address
    ip: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIP: {
          args: [4],
          msg: 'IP address must be a valid IPv4 address'
        }
      }
    },

    // Last time the device checked in
    lastSeen: {
      type: DataTypes.DATE,
      field: 'last_seen',
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp of last communication from the device'
    }
  }, {
    // Table configuration
    tableName: 'Devices',
    timestamps: true,     // Enables createdAt, updatedAt
    paranoid: true,       // Enables soft-delete with deletedAt
    underscored: true,    // Enables camelCase → snake_case mapping
    comment: 'Stores information about connected IoT devices'
  });

  // === ASSOCIATIONS ===
  Device.associate = function(models) {
    Device.hasMany(models.SensorData, {
      foreignKey: 'deviceId',
      sourceKey: 'deviceId',
      as: 'sensorData'
    });
  };

  return Device;
};