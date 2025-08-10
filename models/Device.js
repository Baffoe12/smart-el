// models/Device.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Device = sequelize.define('Device', {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true, // ✅ Make this the PK
      allowNull: false,
      field: 'device_id'
    },
    // models/Device.js
device_id: {
  type: DataTypes.STRING,
  primaryKey: true
}
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
    underscored: true
  });
  

  Device.associate = function(models) {
    Device.hasMany(models.SensorData, { 
      foreignKey: 'deviceId', 
      as: 'sensorData' 
    });
  };

  return Device;
};