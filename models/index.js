// models/index.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// Define models
const User = sequelize.define('User', {
  name: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING, unique: true },
  passwordHash: { type: Sequelize.STRING }
}, {
  underscored: true,
  timestamps: true
});

const Appliance = sequelize.define('Appliance', {
  name: { type: Sequelize.STRING },
  type: { type: Sequelize.STRING },
  relay: { type: Sequelize.INTEGER },
  manuallyAdded: { type: Sequelize.BOOLEAN }
}, {
  underscored: true,
  timestamps: true,
  paranoid: true
});

const Device = sequelize.define('Device', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  deviceId: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  ip: { type: Sequelize.STRING },
  lastSeen: { type: Sequelize.DATE }
}, {
  underscored: true,
  timestamps: true,
  paranoid: true
}); // ← Comma was missing here!

const SensorData = sequelize.define('SensorData', {
  applianceId: { type: Sequelize.INTEGER },
  current: { type: Sequelize.FLOAT },
  voltage: { type: Sequelize.FLOAT },
  power: { type: Sequelize.FLOAT },
  energy: { type: Sequelize.FLOAT },
  cost: { type: Sequelize.FLOAT },
  timestamp: { type: Sequelize.DATE },
  deviceId: { type: Sequelize.STRING }
}, {
  underscored: true,
  timestamps: true,
  paranoid: true
});

// ✅ Load Command model
const Command = require('./Command')(sequelize, Sequelize.DataTypes);

// === Create models object ===
const models = {
  sequelize,
  Sequelize,
  User,
  Appliance,
  SensorData,
  Device,
  Command
};

// === Define associations only where not handled by .associate() ===
Device.hasMany(SensorData, {
  foreignKey: 'deviceId',
  sourceKey: 'deviceId',
  as: 'sensorData'
});

SensorData.belongsTo(Device, {
  foreignKey: 'deviceId',
  targetKey: 'deviceId',
  as: 'device'
});

SensorData.belongsTo(Appliance, {
  foreignKey: 'applianceId',
  as: 'appliance'
});

Device.hasMany(Command, {
  foreignKey: 'deviceId',
  sourceKey: 'deviceId',
  as: 'commands'
});

// ✅ Attach models to sequelize
sequelize.models = models;

// ✅ Run associate methods
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(models));

module.exports = models;