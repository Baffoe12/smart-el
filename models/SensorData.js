const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const Appliance = require('./Appliance');

const SensorData = sequelize.define('SensorData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  applianceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Appliance,
      key: 'id',
    },
  },
  current: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  voltage: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  power: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  energy: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  cost: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  relayState: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

Appliance.hasMany(SensorData, { foreignKey: 'applianceId' });
SensorData.belongsTo(Appliance, { foreignKey: 'applianceId' });

module.exports = SensorData;
