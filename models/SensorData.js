// models/SensorData.js
module.exports = (sequelize, DataTypes) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: { type: DataTypes.INTEGER },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.FLOAT },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE },
    deviceId: { type: DataTypes.STRING }
  }, {
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  SensorData.associate = function(models) {
    SensorData.belongsTo(models.Appliance, {
      foreignKey: 'applianceId',
      as: 'appliance'
    });

    SensorData.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId',
      as: 'device'
    });
  };

  return SensorData;
};