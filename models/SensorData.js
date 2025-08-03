// models/SensorData.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const SensorData = sequelize.define('SensorData', {
  applianceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Appliances',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  current: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  power: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  },
  energy: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'energy_kwh'
  },
  cost: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0,
    field: 'cost_ghs'
  },
  relayState: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  voltage: {
    type: DataTypes.FLOAT,
    defaultValue: 230.0
  }
}, {
  tableName: 'SensorData',
  timestamps: true
});

module.exports = SensorData;