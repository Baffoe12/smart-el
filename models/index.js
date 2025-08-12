// models/index.js
const { Sequelize, DataTypes } = require('sequelize'); // ✅ Added DataTypes

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

// Load models
const User = require('./User')(sequelize, DataTypes);
const Appliance = require('./Appliance')(sequelize, DataTypes);
const SensorData = require('./SensorData')(sequelize, DataTypes);
const Device = require('./Device')(sequelize, DataTypes);
const Command = require('./Command')(sequelize, DataTypes);

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

// === Attach models to sequelize ===
sequelize.models = models;

// === Run associate methods ===
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(models));

module.exports = models;