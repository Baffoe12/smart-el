module.exports = (sequelize) => {
  const Appliance = sequelize.define('Appliance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    name: DataTypes.STRING,
    relay: DataTypes.INTEGER,
    type: DataTypes.STRING,
    status: DataTypes.STRING,
    manuallyAdded: DataTypes.BOOLEAN
  });

  Appliance.associate = function(models) {
    Appliance.hasMany(models.SensorData, { foreignKey: 'applianceId' });
  };

  return Appliance;
};