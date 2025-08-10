// models/Appliance.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appliance = sequelize.define('Appliance', {
    name: { type: DataTypes.STRING },
    type: { type: DataTypes.STRING },
    relay: { type: DataTypes.INTEGER },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'off'
    },
    scheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    scheduleOn: { type: DataTypes.DATE },
    scheduleOff: { type: DataTypes.DATE },
    manuallyAdded: { type: DataTypes.BOOLEAN }
  }, {
    tableName: 'Appliances',
    timestamps: true,
    paranoid: true,
    underscored: true
  });

  Appliance.associate = function(models) {
    Appliance.hasMany(models.SensorData, {
      foreignKey: 'applianceId'
    });
  };

  return Appliance;
};