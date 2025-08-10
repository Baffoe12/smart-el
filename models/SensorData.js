// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'applianceId'
    },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.INTEGER },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE },
    deviceId: { // ✅ Must be STRING
      type: DataTypes.STRING,
      allowNull: false,
      field: 'deviceId',
      references: {
        model: 'Devices',
        key: 'deviceId' // ✅ References deviceId, not id
      }
    }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: true,
    underscored: true
  });

  SensorData.associate = function(models) {
    SensorData.belongsTo(models.Appliance, { foreignKey: 'applianceId' });
    SensorData.belongsTo(models.Device, { foreignKey: 'deviceId' }); // ✅ Now valid
  };

  return SensorData;
};