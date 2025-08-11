const Device = sequelize.define('Device', {
  id: {  // ✅ Add explicit `id` field
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastSeen: {
    type: DataTypes.DATE
  }
}, {
  underscored: true,
  timestamps: true,
  paranoid: true
});