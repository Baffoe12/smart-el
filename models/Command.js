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
      defaultValue: sequelize.literal('NOW() + INTERVAL 5 MINUTE')
    }
  }, {
    paranoid: true
  });

  Command.associate = function(models) {
    // ✅ Prevent duplicate association
    if (Command.associations.commandDevice) {
      console.log('🔁 Association "commandDevice" already exists. Skipping.');
      return;
    }

    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId',
      as: 'commandDevice'
    });

    console.log('✅ Defined Command -> Device (as: commandDevice)');
  };

  return Command;
};