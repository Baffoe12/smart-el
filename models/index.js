// models/index.js
const { Sequelize, DataTypes } = require('sequelize');

// ✅ 1. Create sequelize instance
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

// ✅ 2. Define model loader function
const loadModel = (modelPath) => {
  const model = require(modelPath)(sequelize, DataTypes);
  return model;
};

// ✅ 3. Load all models
const User = loadModel('./User');
const Appliance = loadModel('./Appliance');
const SensorData = loadModel('./SensorData');
const Device = loadModel('./Device');
const Command = loadModel('./Command');

// ✅ 4. Create models object
const models = {
  sequelize,
  Sequelize,
  User,
  Appliance,
  SensorData,
  Device,
  Command
};

// ✅ 5. Attach models to sequelize (safe)
sequelize.models = sequelize.models || {};
Object.assign(sequelize.models, models);

// ✅ 6. Run associations
Object.values(models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => {
    console.log(`🔧 Running associate() for ${model.name}`);
    model.associate(models);
  });

console.log('✅ All associations attempted');

// ✅ 7. EXPORT models (critical!)
module.exports = models;