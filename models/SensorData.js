// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'appliance_id'
    },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.INTEGER },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Device',
        key: 'deviceId'
      },
      field: 'device_id'
    }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: true,
    underscored: true
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