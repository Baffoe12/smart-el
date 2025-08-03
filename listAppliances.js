const { sequelize, Appliance } = require('./models');

async function listAppliances() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    const appliances = await Appliance.findAll({
      attributes: ['id', 'type', 'relay'],
      order: [['id', 'ASC']],
    });

    console.log('Appliances:');
    appliances.forEach(appliance => {
      console.log(`ID: ${appliance.id}, Type: ${appliance.type}, Relay: ${appliance.relay}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('Error fetching appliances:', error);
  }
}

listAppliances();
