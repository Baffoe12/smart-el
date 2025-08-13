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
      allowNull: false,
      defaultValue: sequelize.literal("NOW() + INTERVAL '5 minutes'")
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // ✅ Add this field: When the command should be executed
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,  // Can be null for immediate commands
      defaultValue: null
    }
  }, {
    paranoid: true,
    tableName: 'Commands'
  });

  Command.associate = function(models) {
    if (Command.associations.commandDevice) return;

    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId',
      as: 'commandDevice'
    });
  };

  return Command;
};