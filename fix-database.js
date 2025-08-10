// fix-database.js
require('dotenv').config();
const { sequelize } = require('./models');

async function fixOrphanedData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // ✅ Use "appliance_id" and "deleted_at" (snake_case)
    await sequelize.query(`
      DELETE FROM "SensorData"
      WHERE "appliance_id" NOT IN (
        SELECT id FROM "Appliances" WHERE "deleted_at" IS NULL
      )
    `);

    console.log('🗑️ Orphaned sensor data deleted (if any)');
  } catch (error) {
    console.error('❌ Error cleaning orphaned data:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixOrphanedData();