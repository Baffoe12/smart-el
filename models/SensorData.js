module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: { type: sequelize.DataTypes.INTEGER },
    current: { type: sequelize.DataTypes.FLOAT },
    voltage: { type: sequelize.DataTypes.FLOAT },
    power: { type: sequelize.DataTypes.FLOAT },
    energy: { type: sequelize.DataTypes.FLOAT },
    cost: { type: sequelize.DataTypes.FLOAT },
    timestamp: { type: sequelize.DataTypes.DATE },
    deviceId: { type: sequelize.DataTypes.STRING }
  });
  return SensorData;
};