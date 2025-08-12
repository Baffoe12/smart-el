// models/Device.js
module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
      field: 'device_id'
    },
    ip: { type: DataTypes.STRING },
    lastSeen: { type: DataTypes.DATE, field: 'last_seen' }
  }, {
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  Device.associate = function(models) {
    Device.hasMany(models.SensorData, {
      foreignKey: 'deviceId',
      sourceKey: 'deviceId',
      as: 'sensorData'
    });
    Device.hasMany(models.Command, {
      foreignKey: 'deviceId',
      sourceKey: 'deviceId',
      as: 'commands'
    });
  };

  return Device;
};