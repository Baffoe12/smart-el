// models/SensorData.js
module.exports = (sequelize, DataTypes) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: { type: DataTypes.INTEGER },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.FLOAT },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE },
    deviceId: { type: DataTypes.STRING }
  }, {
    underscored: true,
    timestamps: true,
    paranoid: true
  });

  SensorData.associate = function(models) {
    // ✅ Prevent duplicate association
    if (SensorData.associations.appliance) {
      console.log('🔁 SensorData -> Appliance (as: appliance) already defined. Skipping.');
      return;
    }

    SensorData.belongsTo(models.Appliance, {
      foreignKey: 'applianceId',
      as: 'appliance'
    });

    console.log('✅ Defined SensorData -> Appliance (as: appliance)');
  };

  return SensorData;
};