const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Appliance = sequelize.define('Appliance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  relay: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isOn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  current: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  power: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 'cost_ghs'
  },
  scheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  scheduleOn: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scheduleOff: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Appliances',
  timestamps: true
});

module.exports = Appliance;
