const { Appliance } = require('./models');

async function seedAppliances() {
  console.log('🔄 Seeding appliances...');

  const appliances = [
    { id: 1, name: 'Socket A', power_rating: 800, location: 'Kitchen', relay: 1 },
    { id: 2, name: 'Socket B', power_rating: 150, location: 'Kitchen', relay: 2 },
    { id: 3, name: 'Socket C', power_rating: 120, location: 'Living Room', relay: 3 },
    { id: 4, name: 'Socket D', power_rating: 500, location: 'Laundry', relay: 4 }
  ];

  for (const appliance of appliances) {
    const existing = await Appliance.findOne({
      where: { relay: appliance.relay },
      paranoid: false
    });

    if (!existing) {
      await Appliance.create(appliance);
      console.log(`✅ Created ${appliance.name} (Relay ${appliance.relay})`);
    } else if (existing.name !== appliance.name) {
      await existing.update({ name: appliance.name });
      console.log(`🔄 Updated ${existing.name} to ${appliance.name}`);
    } else {
      console.log(`✅ ${appliance.name} already exists`);
    }
  }

  console.log('✅ Appliance seeding complete');
}

module.exports = seedAppliances;

if (require.main === module) {
  const { sequelize } = require('./models');
  sequelize.sync().then(() => {
    seedAppliances().then(() => process.exit(0));
  });
}
