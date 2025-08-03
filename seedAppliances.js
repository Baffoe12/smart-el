const { Appliance } = require('./models');

async function addAppliances() {
  const appliancesData = [
    { type: 'Appliance 1', relay: 1 },
    { type: 'Appliance 2', relay: 2 },
    { type: 'Appliance 3', relay: 3 },
    { type: 'Appliance 4', relay: 4 },
  ];

  for (const applianceData of appliancesData) {
    const [appliance, created] = await Appliance.findOrCreate({
      where: { relay: applianceData.relay },
      defaults: applianceData,
    });
    if (created) {
      console.log(`Created appliance for relay ${applianceData.relay}`);
    } else {
      console.log(`Appliance for relay ${applianceData.relay} already exists`);
    }
  }
}

addAppliances()
  .then(() => {
    console.log('Appliance setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting up appliances:', error);
    process.exit(1);
  });
