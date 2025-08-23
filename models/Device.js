module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    deviceId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      unique: true,
      field: 'device_id' // maps to DB column `device_id`
    },
    ip: {
      type: DataTypes.STRING,
      field: 'ip'
    },
    lastSeen: {
      type: DataTypes.DATE,
      field: 'last_seen'
    }
  }, {
    tableName: 'devices',
    underscored: true,    // automatically sets field names to snake_case
    timestamps: true,     // createdAt, updatedAt
    paranoid: true,       // soft delete with deletedAt
    freezeTableName: true
  });

  Device.associate = function(models) {
    if (!Device.associations.sensorData) {
      Device.hasMany(models.SensorData, {
        foreignKey: 'deviceId',
        sourceKey: 'deviceId',
        as: 'sensorData'
      });
      console.log('✅ Defined Device -> SensorData');
    } else {
      console.log('🔁 Device -> SensorData already defined');
    }

    if (!Device.associations.commands) {
      Device.hasMany(models.Command, {
        foreignKey: 'deviceId',
        sourceKey: 'deviceId',
        as: 'commands'
      });
      console.log('✅ Defined Device -> Command');
    } else {
      console.log('🔁 Device -> Command already defined');
    }
  };

  return Device;
};