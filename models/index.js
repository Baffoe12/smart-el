// models/index.js
const { Sequelize } = require('sequelize');

// Initialize Sequelize with Render's DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// Define models
const User = sequelize.define('User', {
  name: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING, unique: true },
  passwordHash: { type: Sequelize.STRING }
});

const Appliance = sequelize.define('Appliance', {
  type: { type: Sequelize.STRING },
  relay: { type: Sequelize.INTEGER },
  status: { type: Sequelize.STRING, defaultValue: 'off' },
  scheduled: { type: Sequelize.BOOLEAN, defaultValue: false },
  scheduleOn: { type: Sequelize.DATE },
  scheduleOff: { type: Sequelize.DATE }
});

const SensorData = sequelize.define('SensorData', {
  applianceId: { type: Sequelize.INTEGER },
  current: { type: Sequelize.FLOAT },
  voltage: { type: Sequelize.FLOAT },
  power: { type: Sequelize.FLOAT },
  energy: { type: Sequelize.FLOAT },
  cost: { type: Sequelize.FLOAT },
  timestamp: { type: Sequelize.DATE },
  deviceId: { type: Sequelize.STRING }
});

// Sync will create tables
module.exports = { sequelize, User, Appliance, SensorData };