// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    current: {
      type: DataTypes.FLOAT
    },
    voltage: {
      type: DataTypes.FLOAT,
      defaultValue: 230
    },
    power: {
      type: DataTypes.FLOAT
    },
    energy: {
      type: DataTypes.FLOAT
    },
    cost: {
      type: DataTypes.FLOAT
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    deviceId: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'SensorData',
    timestamps: false
  });

  return SensorData;
};