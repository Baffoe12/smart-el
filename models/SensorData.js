// models/SensorData.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SensorData = sequelize.define('SensorData', {
    applianceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'appliance_id',
      references: {
        model: 'Appliances',
        key: 'id'
      }
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'device_id'
    },
    current: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.FLOAT },
    power: { type: DataTypes.INTEGER },
    energy: { type: DataTypes.FLOAT },
    cost: { type: DataTypes.FLOAT },
    timestamp: { type: DataTypes.DATE }
  }, {
    tableName: 'SensorData',
    timestamps: true,
    paranoid: false,   // ✅ Disable soft delete
    underscored: true  // Use snake_case
  });

  // ✅ Add association (optional)
  SensorData.associate = function(models) {
    SensorData.belongsTo(models.Appliance, {
      foreignKey: 'appliance_id',
      as: 'appliance'
    });
    SensorData.belongsTo(models.Device, {
      foreignKey: 'device_id',
      as: 'device'
    });
  };

  return SensorData;
};

//chanage 