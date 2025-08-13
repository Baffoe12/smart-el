// models/Appliance.js
module.exports = (sequelize, DataTypes) => {
  const Appliance = sequelize.define('Appliance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    relay: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.STRING
    },
    manuallyAdded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Appliances'
  });

  Appliance.associate = function(models) {
    Appliance.hasMany(models.SensorData, {
      foreignKey: 'applianceId',
      as: 'sensorData'
    });
  };

  return Appliance;
};