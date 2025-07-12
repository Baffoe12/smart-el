const SensorData = require('./models/SensorData');
const Appliance = require('./models/Appliance');

module.exports = (app) => {
  // Get recent sensor data for all appliances
  app.get('/api/sensor-data', async (req, res) => {
    try {
      const data = await SensorData.findAll({
        include: [{ model: Appliance }],
        order: [['timestamp', 'DESC']],
        limit: 100,
      });
      res.json(data);
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
  });

  // Get sensor data by appliance (relay) ID
  app.get('/api/sensor-data/:applianceId', async (req, res) => {
    const applianceId = req.params.applianceId;
    try {
      const data = await SensorData.findAll({
        where: { applianceId },
        order: [['timestamp', 'DESC']],
        limit: 100,
      });
      res.json(data);
    } catch (error) {
      console.error('Error fetching sensor data by appliance:', error);
      res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
  });

  // POST endpoint to receive sensor data from ESP32
  app.post('/api/sensor-data', async (req, res) => {
    const sensorData = req.body;
    console.log('Received sensor data:', sensorData);

    try {
      // Expecting sensorData to have keys like current1, current2, relay1, relay2, voltage, etc.
      const promises = [];

      for (let i = 1; i <= 4; i++) {
        const relayKey = `relay${i}`;
        if (sensorData[relayKey]) {
          const appliance = await Appliance.findOne({ where: { id: i } });
          if (appliance) {
            const current = sensorData[`current${i}`] || null;
            const voltage = sensorData.voltage || null;
      const power = current && voltage ? current * voltage : null;
      const energy = sensorData.energy || null; // Now expecting energy from ESP32
      const cost = sensorData.cost || null; // Now expecting cost from ESP32
      const relayState = sensorData[`relay${i}`] === true || sensorData[`relay${i}`] === 'true';

      promises.push(
        SensorData.create({
          applianceId: appliance.id,
          current,
          voltage,
          power,
          energy,
          cost,
          relayState,
        })
      );
          }
        }
      }

      await Promise.all(promises);

      res.status(200).json({ message: 'Sensor data stored successfully' });
    } catch (error) {
      console.error('Error storing sensor data:', error);
      res.status(500).json({ error: 'Failed to store sensor data' });
    }
  });
};
