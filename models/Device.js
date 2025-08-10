// models/Device.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Device = sequelize.define('Device', {
    // models/Device.js
deviceId: {
  type: DataTypes.STRING,
  primaryKey: true,
  allowNull: false
  // Remove `field: 'device_id'` for now
},
    ip: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastSeen: {
      type: DataTypes.DATE,
      field: 'last_seen'
    }
  }, {
    tableName: 'Devices',
    timestamps: true,
    underscored: true // maps camelCase to snake_case
  });

  Device.associate = function(models) {
    Device.hasMany(models.SensorData, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId', // ← Important: since referencing non-id PK
      as: 'sensorData'
    });
  };

  return Device;
};