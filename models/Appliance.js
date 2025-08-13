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
    manuallyAdded: {  // 👈 JavaScript property name
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'manually_added'  // 👈 Maps to DB column name
    }
  }, {
    tableName: 'Appliances',
    paranoid: true,
    timestamps: true
  });

  Appliance.associate = (models) => {
    Appliance.hasMany(models.SensorData, {
      foreignKey: 'applianceId',
      as: 'sensorData'
    });
  };

  return Appliance;
};