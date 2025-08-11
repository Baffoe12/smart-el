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
    }
  }, {
    paranoid: true
  });

  // Define association correctly
  Command.associate = function(models) {
    // Prevent duplicate association
    if (Command.associations.commandDevice) {
      console.log('🔁 Command -> Device (as: commandDevice) already defined');
      return;
    }

    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',  // in Command table
      targetKey: 'id',         // in Device table
      as: 'commandDevice'
    });

    console.log('✅ Defined Command -> Device (as: commandDevice)');
  };

  return Command;
};