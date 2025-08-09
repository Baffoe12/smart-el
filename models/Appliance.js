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
        isIn: [['on', 'off', 'unknown']]
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
    },
    manuallyAdded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    // ✅ Add soft delete field here
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true // null = not deleted
    }
  }, {
    tableName: 'Appliances',
    timestamps: true,
    underscored: false,
    // ✅ Enable paranoid mode for automatic soft delete
    paranoid: true // ← This makes `destroy()` set `deletedAt` instead of deleting
  });

  // 👇 Define association
  Appliance.associate = function(models) {
    Appliance.hasMany(models.SensorData, { 
      foreignKey: 'applianceId',
      onDelete: 'CASCADE' // Optional: delete sensor data when appliance is deleted
    });
  };

  return Appliance;
};