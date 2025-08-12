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

// === Load all models first ===
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

// ✅ Load from separate files
const Device = require('./Device')(sequelize, Sequelize.DataTypes);
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

// === Define associations (only where not in .associate) ===
SensorData.belongsTo(Appliance, {
  foreignKey: 'applianceId',
  as: 'appliance'
});

SensorData.belongsTo(Device, {
  foreignKey: 'deviceId',
  targetKey: 'deviceId',
  as: 'device'
});

// ✅ Attach to sequelize
sequelize.models = models;

// ✅ Run all associate() methods
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => {
    try {
      model.associate(models);
    } catch (err) {
      console.error(`❌ Failed to associate ${model.name}:`, err);
    }
  });

module.exports = models;