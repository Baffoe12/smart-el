// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'applianceId'
    },
    current: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    voltage: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    power: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    energy: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    cost: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    },
    deviceId: {  // ← This must be STRING to match Device's id
      type: DataTypes.STRING,
      allowNull: false,
      field: 'deviceId'
    }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: true,
    underscored: true
  });

  SensorData.associate = function(models) {
    SensorData.belongsTo(models.Appliance, { foreignKey: 'applianceId' });
    SensorData.belongsTo(models.Device, { foreignKey: 'deviceId' }); // ← Now compatible
  };

  return SensorData;
};