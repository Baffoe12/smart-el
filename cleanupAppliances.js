const sequelize = require('./sequelize');
const Appliance = require('./models/Appliance');

async function cleanupAppliances() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Find all appliances ordered by id
    const appliances = await Appliance.findAll({
      order: [['id', 'ASC']],
    });

    // Track relay numbers seen
    const seenRelays = new Set();

    // Appliances to delete (duplicates)
    const toDelete = [];

    for (const appliance of appliances) {
      if (seenRelays.has(appliance.relay)) {
        toDelete.push(appliance.id);
      } else {
        seenRelays.add(appliance.relay);
      }
    }

    if (toDelete.length === 0) {
      console.log('No duplicate appliances found.');
    } else {
      console.log(`Deleting duplicate appliances with IDs: ${toDelete.join(', ')}`);
      await Appliance.destroy({
        where: {
          id: toDelete,
        },
      });
      console.log('Duplicate appliances deleted.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupAppliances();
