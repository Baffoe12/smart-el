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
  },
  // ✅ Add this:
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Optional: track device ID
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true // or false if required
  }
}, {
  tableName: 'SensorData',
  timestamps: true // adds createdAt, updatedAt
});

module.exports = SensorData;
