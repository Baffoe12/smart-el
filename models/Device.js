// models/Device.js
module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
      field: 'device_id'  // maps to `device_id` in DB
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
    underscored: true,   // enables createdAt → created_at
    timestamps: true,    // adds createdAt, updatedAt
    paranoid: true       // enables soft-delete with deletedAt
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