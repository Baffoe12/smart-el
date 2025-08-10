// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: { type: DataTypes.INTEGER, allowNull: false },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.INTEGER },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE },
    deviceId: { // ✅ Must be STRING
      type: DataTypes.STRING,
      allowNull: false,
      field: 'deviceId'
    }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: true,
    underscoreed: true
  });

  SensorData.associate = function(models) {
    SensorData.belongsTo(models.Appliance, { foreignKey: 'applianceId' });
    SensorData.belongsTo(models.Device, { foreignKey: 'deviceId' }); // ✅ Now valid
  };

  return SensorData;
};