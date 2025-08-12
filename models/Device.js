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
    // ✅ Prevent duplicate: sensorData
    if (Device.associations.sensorData) {
      console.log('🔁 Device -> SensorData (as: sensorData) already defined. Skipping.');
      return;
    }

    Device.hasMany(models.SensorData, {
      foreignKey: 'deviceId',
      sourceKey: 'deviceId',
      as: 'sensorData'
    });

    console.log('✅ Defined Device -> SensorData (as: sensorData)');

    // ✅ Prevent duplicate: commands
    if (!Device.associations.commands) {
      Device.hasMany(models.Command, {
        foreignKey: 'deviceId',
        sourceKey: 'deviceId',
        as: 'commands'
      });
      console.log('✅ Defined Device -> Command (as: commands)');
    } else {
      console.log('🔁 Device -> Command (as: commands) already defined. Skipping.');
    }
  };

  return Device;
};