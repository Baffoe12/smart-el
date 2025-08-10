// models/Device.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Device = sequelize.define('Device', {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      field: 'device_id'
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
    paranoid: true,
    underscored: true
  });

  Device.associate = function(models) {
    Device.hasMany(models.SensorData, {
      foreignKey: 'deviceId',
      sourceKey: 'deviceId',
      as: 'sensorData'
    });
  };

  return Device;
};