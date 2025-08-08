// models/Appliance.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appliance = sequelize.define('Appliance', {
    name: {  // ✅ Add this field
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    relay: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'off'
    },
    scheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    scheduleOn: {
      type: DataTypes.DATE
    },
    scheduleOff: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'Appliances',
    timestamps: true
  });

  return Appliance;
};