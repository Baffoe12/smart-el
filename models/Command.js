// models/Command.js
module.exports = (sequelize, DataTypes) => {
  const Command = sequelize.define('Command', {
    relay: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    state: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    executed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    delivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW() + INTERVAL '5 minutes'")
    },
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Devices',
        key: 'id'
      }
    }
  }, {
    paranoid: true
  });

  // Define association correctly
  Command.associate = function(models) {
    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      as: 'commandDevice'
    });
  };

  return Command;
};
