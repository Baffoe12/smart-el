module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastSeen: {
      type: DataTypes.DATE
    }
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
