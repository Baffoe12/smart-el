const { Sequelize } = require('sequelize');

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// === DEFINE MODELS ===

const User = sequelize.define('User', {
  name: { type: Sequelize.STRING },
  email: { 
    type: Sequelize.STRING, 
    unique: true 
  },
  passwordHash: { 
    type: Sequelize.STRING,
    field: 'password_hash'
  }
}, {
  underscored: true,
  timestamps: true
});

const Appliance = sequelize.define('Appliance', {
  name: { type: Sequelize.STRING },
  type: { type: Sequelize.STRING },
  relay: { type: Sequelize.INTEGER },
  status: { 
    type: Sequelize.STRING, 
    defaultValue: 'off' 
  },
  scheduled: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  scheduleOn: { type: Sequelize.DATE },
  scheduleOff: { type: Sequelize.DATE },
  manuallyAdded: { type: Sequelize.BOOLEAN }
}, {
  underscored: true,
  timestamps: true,
  paranoid: true
});

const Device = sequelize.define('Device', {
  deviceId: {
    type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false
  },
  ip: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastSeen: {
    type: Sequelize.DATE,
    field: 'last_seen'
  }
}, {
  tableName: 'Devices',
  underscored: true,
  timestamps: true,
  paranoid: true
});

const SensorData = sequelize.define('SensorData', {
  applianceId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    field: 'appliance_id'
  },
  current: { type: Sequelize.FLOAT },
  voltage: { 
    type: Sequelize.FLOAT, 
    defaultValue: 230 
  },
  power: { type: Sequelize.FLOAT },
  energy: { type: Sequelize.FLOAT },
  cost: { type: Sequelize.FLOAT },
  timestamp: { 
    type: Sequelize.DATE, 
    defaultValue: Sequelize.NOW 
  },
  deviceId: {
    type: Sequelize.STRING,
    allowNull: false,
    references: {
      model: 'Device',
      key: 'deviceId'
    },
    field: 'device_id'
  }
}, {
  tableName: 'SensorData',
  underscored: true,
  timestamps: true,
  paranoid: true
});

// === COLLECT MODELS INTO OBJECT ===
const models = {
  User,
  Appliance,
  Device,
  SensorData
};

// === COMMAND MODEL (requires models object) ===
const Command = require('./Command')(sequelize, Sequelize.DataTypes);
models.Command = Command;

// === ASSOCIATIONS ===
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

Appliance.hasMany(SensorData, {
  foreignKey: 'applianceId'
});

// Optional: Command belongs to Device
if (models.Command) {
  Device.hasMany(models.Command, {
    foreignKey: 'deviceId',
    sourceKey: 'deviceId',
    as: 'commands'
  });

  models.Command.belongsTo(Device, {
    foreignKey: 'deviceId',
    targetKey: 'deviceId',
    as: 'device'
  });
}

// === EXPORT ===
module.exports = models;