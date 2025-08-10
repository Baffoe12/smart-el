// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'appliance_id'
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'device_id'
    },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.INTEGER },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: true,     // ← Only if you add `deleted_at`
    underscored: true   // ← Use snake_case
  });

  return SensorData;
};