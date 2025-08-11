// models/Command.js
module.exports = (sequelize, DataTypes) => {
  const Command = sequelize.define('Command', {
    relay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 4 }
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
    Command.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      as: 'device'
    });
  };

  return Command;
};