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
    if (SensorData.associations.appliance) {
      console.log('🔁 SensorData -> Appliance (as: appliance) already defined. Skipping.');
      return;
    }

    SensorData.belongsTo(models.Appliance, { as: 'appliance' });
    SensorData.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId',
      as: 'device'
    });

    console.log('✅ Defined SensorData -> Appliance and Device');
  };

  return SensorData;
};