const Appliance = require('./models/Appliance');
const SensorData = require('./models/SensorData');

module.exports = function(app) {
  // Endpoint to receive sensor data from Arduino
  app.post('/api/sensor-data', async (req, res) => {
    try {
      console.log('Received sensor data:', JSON.stringify(req.body, null, 2));
      
      const { device_id, timestamp, relays, total } = req.body;
      
      if (!relays || !Array.isArray(relays)) {
        return res.status(400).json({ error: 'Invalid data format: relays array is required' });
      }
      
      // Process each relay data
      for (const relayData of relays) {
        const { id, state, current, power, energy_kwh, cost_ghs } = relayData;
        
        // Find the appliance by relay number
        const appliance = await Appliance.findOne({ where: { relay: id } });
        
        if (appliance) {
          // Update appliance status
          await appliance.update({
            isOn: state,
            current: current || 0,
            power: power || 0,
            amount: cost_ghs || 0
          });
          
          // Store sensor data
          await SensorData.create({
            applianceId: appliance.id,
            current: current || 0,
            power: power || 0,
            energy: energy_kwh || 0,
            cost: cost_ghs || 0,
            relayState: state,
            voltage: 230 // Standard voltage
          });
          
          console.log(`Updated appliance ${appliance.type} (relay ${id})`);
        } else {
          console.log(`No appliance found for relay ${id}`);
        }
      }
      
      // Update total energy and cost in all appliances
      if (total) {
        const appliances = await Appliance.findAll();
        for (const appliance of appliances) {
          // We'll update the first appliance with total values for now
          // In a real implementation, you might want to distribute this differently
          if (appliance.relay === 1) {
            await appliance.update({
              amount: total.cost_ghs || 0
            });
          }
        }
      }
      
      res.json({ message: 'Sensor data received and processed successfully' });
    } catch (error) {
      console.error('Error processing sensor data:', error);
      res.status(500).json({ error: 'Failed to process sensor data' });
    }
  });
  
  // Endpoint to get latest sensor data for all appliances
  app.get('/api/sensor-data/latest', async (req, res) => {
    try {
      const appliances = await Appliance.findAll({
        include: [{
          model: SensorData,
          limit: 1,
          order: [['timestamp', 'DESC']]
        }]
      });
      
      const latestData = appliances.map(appliance => ({
        applianceId: appliance.id,
        type: appliance.type,
        relay: appliance.relay,
        isOn: appliance.isOn,
        current: appliance.current,
        power: appliance.power,
        amount: appliance.amount,
        latestSensorData: appliance.SensorData.length > 0 ? appliance.SensorData[0] : null
      }));
      
      res.json(latestData);
    } catch (error) {
      console.error('Error fetching latest sensor data:', error);
      res.status(500).json({ error: 'Failed to fetch latest sensor data' });
    }
  });
};
