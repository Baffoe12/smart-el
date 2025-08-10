// models/SensorData.js
module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: { type: DataTypes.INTEGER, allowNull: false },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.INTEGER },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE },
    deviceId: {
      type: DataTypes.INTEGER, // ← Changed from STRING to INTEGER
      allowNull: false,
      references: {
        model: 'Devices',
        key: 'id'
      }
    }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: true,
    underscored: true // ← Fixed typo: was "underscoreed"
  });

  SensorData.associate = function(models) {
    SensorData.belongsTo(models.Appliance, { foreignKey: 'applianceId' });
    SensorData.belongsTo(models.Device, { foreignKey: 'deviceId' });
  };

  return SensorData;
};