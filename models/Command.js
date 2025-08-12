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
      allowNull: false
    }
  }, {
    paranoid: true
  });

  // ✅ Only define association if it hasn't been defined
  Command.associate = function(models) {
    if (Command.associations.commandDevice) {
      console.log('🔁 Command -> Device (as: commandDevice) already defined. Skipping.');
      return;
    }

    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'id',
      as: 'commandDevice'
    });

    console.log('✅ Defined Command -> Device (as: commandDevice)');
  };

  return Command;
};