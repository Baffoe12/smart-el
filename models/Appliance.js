const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Appliance = sequelize.define('Appliance', {
  // Add to Appliance model
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
  }
});

module.exports = Appliance;
