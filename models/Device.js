// models/Device.js or in models/index.js
const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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