// models/Appliance.js
module.exports = (sequelize, DataTypes) => {
  const Appliance = sequelize.define('Appliance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    name: DataTypes.STRING,
    relay: DataTypes.INTEGER,
    type: DataTypes.STRING,
    status: DataTypes.STRING,
    manuallyAdded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Appliances',
    paranoid: true
  });

  Appliance.associate = (models) => {
    Appliance.hasMany(models.SensorData, {
      foreignKey: 'applianceId',
      as: 'sensorData'
    });
  };

  return Appliance;
};