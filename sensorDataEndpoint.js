const SensorData = require('./models/SensorData');
const Appliance = require('./models/Appliance');

module.exports = (app) => {
  // Get recent sensor data for all appliances
  app.get('/api/sensor-data', async (req, res) => {
    try {
      // Aggregate latest sensor data per relay number by querying appliances
      const aggregatedData = {};
      for (let relayNum = 1; relayNum <= 4; relayNum++) {
        const appliance = await Appliance.findOne({ where: { relay: relayNum } });
        if (appliance) {
          const latestData = await SensorData.findOne({
            where: { applianceId: appliance.id },
            order: [['timestamp', 'DESC']],
          });
          console.log(`Latest sensor data for appliance ${appliance.id} (relay ${relayNum}):`, latestData ? latestData.toJSON() : null);
          if (latestData) {
            aggregatedData[`relay${relayNum}`] = latestData.relayState;
            aggregatedData[`current${relayNum}`] = latestData.current;
            aggregatedData[`power${relayNum}`] = latestData.power;
            aggregatedData[`energy${relayNum}`] = latestData.energy;
            aggregatedData[`cost${relayNum}`] = latestData.cost;
            if (!aggregatedData.voltage) {
              aggregatedData.voltage = latestData.voltage;
            }
          } else {
            aggregatedData[`relay${relayNum}`] = false;
            aggregatedData[`current${relayNum}`] = null;
            aggregatedData[`power${relayNum}`] = null;
            aggregatedData[`energy${relayNum}`] = null;
            aggregatedData[`cost${relayNum}`] = null;
            if (!aggregatedData.voltage) {
              aggregatedData.voltage = null;
            }
          }
        } else {
          console.log(`No appliance found for relay ${relayNum}`);
          aggregatedData[`relay${relayNum}`] = false;
          aggregatedData[`current${relayNum}`] = null;
          aggregatedData[`power${relayNum}`] = null;
          aggregatedData[`energy${relayNum}`] = null;
          aggregatedData[`cost${relayNum}`] = null;
          if (!aggregatedData.voltage) {
            aggregatedData.voltage = null;
          }
        }
      }
      res.json(aggregatedData);
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
          const appliance = await Appliance.findOne({ where: { relay: i } });
          if (appliance) {
            console.log(`Found appliance with id ${appliance.id} for relay ${i}`);
            const current = sensorData[`current${i}`] || null;
            const voltage = sensorData.voltage || null;
            const power = current && voltage ? current * voltage : null;
            const energy = sensorData[`energy${i}`] !== undefined ? sensorData[`energy${i}`] : null;
            const cost = sensorData[`cost${i}`] !== undefined ? sensorData[`cost${i}`] : null;
            const relayState = sensorData[`relay${i}`] === true || sensorData[`relay${i}`] === 'true';

            console.log(`Storing sensor data for appliance ${appliance.id}: current=${current}, voltage=${voltage}, power=${power}, energy=${energy}, cost=${cost}, relayState=${relayState}`);

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
        } else {
          console.log(`No sensor data for relay ${i} in received data`);
        }
      }

      await Promise.all(promises);

      res.status(200).json({ message: 'Sensor data stored successfully' });
    } catch (error) {
      console.error('Error storing sensor data:', error);
      res.status(500).json({ error: 'Failed to store sensor data' });
    }
  });

  // New endpoint to get all appliances and their IDs for verification
  app.get('/api/appliances', async (req, res) => {
    try {
      const appliances = await Appliance.findAll();
      res.json(appliances);
    } catch (error) {
      console.error('Error fetching appliances:', error);
      res.status(500).json({ error: 'Failed to fetch appliances' });
    }
  });
};
