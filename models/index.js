// models/index.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

const User = sequelize.define('User', {
  name: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING, unique: true },
  passwordHash: { type: Sequelize.STRING }
});

const Appliance = sequelize.define('Appliance', {
  name: { type: Sequelize.STRING }, // Add this
  type: Sequelize.STRING,
  relay: Sequelize.INTEGER,
  status: { type: Sequelize.STRING, defaultValue: 'off' }
});
const SensorData = sequelize.define('SensorData', {
  applianceId: Sequelize.INTEGER,
  current: Sequelize.FLOAT,
  voltage: { type: Sequelize.FLOAT, defaultValue: 230 },
  power: Sequelize.FLOAT,
  energy: Sequelize.FLOAT,
  cost: Sequelize.FLOAT,
  timestamp: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  deviceId: Sequelize.STRING
});

const Device = sequelize.define('Device', {
  deviceId: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  ip: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastSeen: {
    type: Sequelize.DATE
  }
});

// Set up associations
Device.hasMany(SensorData, { foreignKey: 'deviceId', as: 'sensorData' });
SensorData.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

module.exports = { sequelize, User, Appliance, SensorData, Device };
