const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite:database.sqlite');

const User = require('./User')(sequelize);
const Appliance = require('./Appliance')(sequelize);
const SensorData = require('./SensorData')(sequelize);

module.exports = { sequelize, User, Appliance, SensorData };