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
    // ✅ Prevent duplicate
    if (SensorData.associations.device) {
      console.log('🔁 SensorData -> Device (as: device) already defined. Skipping.');
      return;
    }

    SensorData.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId',
      as: 'device'
    });

    console.log('✅ Defined SensorData -> Device (as: device)');
  };

  return SensorData;
};