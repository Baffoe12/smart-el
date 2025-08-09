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
      allowNull: false // 👈 assume relay is required
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'off',
      allowNull: false,
      validate: {
        isIn: [['on', 'off']] // Only allow these values
      }
    },
    scheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    scheduleOn: {
      type: DataTypes.DATE,
      allowNull: true // nullable because it's optional
    },
    scheduleOff: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'Appliances',
    timestamps: true,
    underscored: false // set to true if you use snake_case (e.g., createdAt → created_at)
  });

  // Optional: Add hooks or associations here
  // Example: Appliance.hasMany(SensorData, { foreignKey: 'applianceId' });

  return Appliance;
};