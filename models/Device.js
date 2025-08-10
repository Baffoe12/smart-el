// models/Device.js
module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      field: 'device_id' // ← Maps JS `deviceId` → DB `device_id`
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
    underscored: true // ← Enables camelCase → snake_case
  });

  return Device;
};