const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Appliance = sequelize.define('Appliance', {
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  current: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  voltage: {
    type: DataTypes.FLOAT,
    defaultValue: 220,
  },
  power: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  amount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  isOn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = Appliance;
