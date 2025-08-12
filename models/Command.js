// models/Command.js
module.exports = (sequelize, DataTypes) => {
  const Command = sequelize.define('Command', {
    relay: { type: DataTypes.INTEGER, allowNull: false },
    state: { type: DataTypes.BOOLEAN, allowNull: false },
    executed: { type: DataTypes.BOOLEAN, defaultValue: false },
    delivered: { type: DataTypes.BOOLEAN, defaultValue: false },
    expiresAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal("NOW() + INTERVAL '5 minutes'")
    },
    deviceId: {  // This is STRING, matches Device.deviceId
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    paranoid: true
  });

  Command.associate = function(models) {
    if (Command.associations.commandDevice) return;

    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      targetKey: 'deviceId',  // ✅ Match string PK
      as: 'commandDevice'
    });
  };

  return Command;
};