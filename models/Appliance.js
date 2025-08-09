// models/Appliance.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appliance = sequelize.define('Appliance', {
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional name for the appliance (e.g., "Kitchen Light")'
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    relay: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'unknown',
      allowNull: false,
      validate: {
        isIn: [['on', 'off', 'unknown']] // ✅ Now allows 'unknown'
      }
    },
    scheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    scheduleOn: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scheduleOff: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'Appliances',
    timestamps: true,
    underscored: false
  });

  // 👇 Add this!
  Appliance.associate = function(models) {
    Appliance.hasMany(models.SensorData, { foreignKey: 'applianceId' });
  };

  return Appliance;
};