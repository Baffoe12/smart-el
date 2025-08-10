// fix-foreign-key-issue.js
// This script ensures all appliances exist and fixes the foreign key constraint issue

const { sequelize, Appliance, SensorData } = require('./models');

async function fixForeignKeyIssue() {
  try {
    console.log('🔧 Starting foreign key constraint fix...');
    
    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Define the default appliances that should exist
    const defaultAppliances = [
      { name: 'Socket A', type: 'power', relay: 1, status: 'off', manuallyAdded: false },
      { name: 'Socket B', type: 'power', relay: 2, status: 'off', manuallyAdded: false },
      { name: 'Socket C', type: 'power', relay: 3, status: 'off', manuallyAdded: false },
      { name: 'Socket D', type: 'power', relay: 4, status: 'off', manuallyAdded: false }
    ];

    // Ensure all appliances exist
    for (const def of defaultAppliances) {
      let appliance = await Appliance.findOne({
        where: { relay: def.relay },
        paranoid: false
      });

      if (!appliance) {
        // Create if doesn't exist
        appliance = await Appliance.create(def);
        console.log(`🆕 Created: ${def.name} (ID: ${appliance.id})`);
      } else if (appliance.deletedAt) {
        // Restore if soft-deleted
        await appliance.restore();
        console.log(`↩️ Restored: ${appliance.name} (ID: ${appliance.id})`);
      } else {
        console.log(`✅ Already exists: ${appliance.name} (ID: ${appliance.id})`);
      }
    }

    // Verify all appliances are properly set up
    const allAppliances = await Appliance.findAll({ paranoid: false });
    console.log('\n📋 Current appliances:');
    allAppliances.forEach(app => {
      console.log(`  Relay ${app.relay}: ${app.name} (ID: ${app.id})${app.deletedAt ? ' [DELETED]' : ''}`);
    });

    // Check for any orphaned sensor data
    const orphanedRecords = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "SensorData" 
      WHERE "applianceId" NOT IN (SELECT id FROM "Appliances")
    `, { type: sequelize.QueryTypes.SELECT });

    if (orphanedRecords[0].count > 0) {
      console.log(`⚠️ Found ${orphanedRecords[0].count} orphaned sensor records`);
    } else {
      console.log('✅ No orphaned sensor records found');
    }

    console.log('🎉 Foreign key constraint fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing foreign key constraint:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixForeignKeyIssue();
