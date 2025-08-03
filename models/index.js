const sequelize = require('../sequelize');
const User = require('./User');
const Appliance = require('./Appliance');
const SensorData = require('./SensorData');

// Define associations
Appliance.hasMany(SensorData, { foreignKey: 'applianceId', as: 'SensorData' });
SensorData.belongsTo(Appliance, { foreignKey: 'applianceId' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Appliance,
  SensorData
};
