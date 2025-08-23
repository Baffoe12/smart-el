module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    underscored: true,
    timestamps: true,
    tableName: 'users'  // Explicitly set
  });

  User.associate = function(models) {
    // Add associations later if needed
    // e.g., User.hasMany(models.Appliance)
  };

  return User;
};