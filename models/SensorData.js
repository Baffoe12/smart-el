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
    underscored: true,      // uses created_at, updated_at
    timestamps: true,       // enables createdAt, updatedAt
    paranoid: true,         // enables soft-delete with deletedAt
    tableName: 'sensor_data' // ✅ Critical: set explicit table name
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