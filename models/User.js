// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, unique: true },
    passwordHash: { type: DataTypes.STRING }
  }, {
    underscored: true,
    timestamps: true
  });

  User.associate = function(models) {
    // Add associations if needed
  };

  return User;
};