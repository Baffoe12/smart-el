const Appliance = require('./models/Appliance');
const SensorData = require('./models/SensorData');
const { Sequelize } = require('sequelize');

// Helper function to handle JSON sensor data
async function handleJsonSensorData(req, res) {
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
}

// Helper function to parse ESP data format
function parseEspData(data) {
  const lines = data.split('\n');
  const relays = [];
  let total = { energy_kwh: 0, cost_ghs: 0 };
  
  // Parse relay data
  for (const line of lines) {
    // Match lines like "Relay 1: ON  - 0.50A | 115W | 0.001 kWh | 0.00 Ghs"
    const relayMatch = line.match(/Relay\s+(\d+):\s+(ON|OFF)\s*-\s*([0-9.]+)A\s*\|\s*([0-9.]+)W\s*\|\s*([0-9.]+)\s*kWh\s*\|\s*([0-9.]+)\s*Ghs/);
    if (relayMatch) {
      relays.push({
        id: parseInt(relayMatch[1]),
        state: relayMatch[2] === 'ON',
        current: parseFloat(relayMatch[3]),
        power: parseFloat(relayMatch[4]),
        energy_kwh: parseFloat(relayMatch[5]),
        cost_ghs: parseFloat(relayMatch[6])
      });
    }
    
    // Match total line like "TOTAL: 0.013 kWh | 0.02 Ghs"
    const totalMatch = line.match(/TOTAL:\s*([0-9.]+)\s*kWh\s*\|\s*([0-9.]+)\s*Ghs/);
    if (totalMatch) {
      total.energy_kwh = parseFloat(totalMatch[1]);
      total.cost_ghs = parseFloat(totalMatch[2]);
    }
  }
  
  return { relays, total };
}

module.exports = function(app) {
  // Endpoint to receive sensor data from ESP device (text format)
  app.post('/api/esp-data', async (req, res) => {
    try {
      // Parse the ESP data format
      const sensorData = parseEspData(req.body);
      
      // Process each relay data
      for (const relayData of sensorData.relays) {
        // Find the appliance by relay number
        const appliance = await Appliance.findOne({ where: { relay: relayData.id } });
        
        if (appliance) {
          // Update appliance status
          await appliance.update({
            isOn: relayData.state,
            current: relayData.current || 0,
            power: relayData.power || 0,
            amount: relayData.cost_ghs || 0
          });
          
          // Store sensor data
          await SensorData.create({
            applianceId: appliance.id,
            current: relayData.current || 0,
            power: relayData.power || 0,
            energy: relayData.energy_kwh || 0,
            cost: relayData.cost_ghs || 0,
            relayState: relayData.state,
            voltage: 230 // Standard voltage
          });
          
          console.log(`Updated appliance ${appliance.type} (relay ${relayData.id})`);
        } else {
          console.log(`No appliance found for relay ${relayData.id}`);
        }
      }
      
      // Update total energy and cost in all appliances
      if (sensorData.total) {
        const appliances = await Appliance.findAll();
        for (const appliance of appliances) {
          // We'll update the first appliance with total values for now
          if (appliance.relay === 1) {
            await appliance.update({
              amount: sensorData.total.cost_ghs || 0
            });
          }
        }
      }
      
      res.json({ message: 'ESP sensor data received and processed successfully' });
    } catch (error) {
      console.error('Error processing ESP sensor data:', error);
      res.status(500).json({ error: 'Failed to process ESP sensor data' });
    }
  });
  
  // Endpoint to receive sensor data from Arduino (JSON format)
  app.post('/api/sensor-data', async (req, res) => {
    try {
      await handleJsonSensorData(req, res);
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
  
  // Endpoint to get all sensor data with filtering and pagination
  app.get('/api/sensor-data', async (req, res) => {
    try {
      // Extract query parameters
      const { 
        applianceId, 
        startDate, 
        endDate, 
        page = 1, 
        limit = 50 
      } = req.query;
      
      // Build where clause for filtering
      const whereClause = {};
      
      if (applianceId) {
        whereClause.applianceId = applianceId;
      }
      
      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) {
          whereClause.timestamp[Sequelize.Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.timestamp[Sequelize.Op.lte] = new Date(endDate);
        }
      }
      
      // Get sensor data with pagination
      const sensorData = await SensorData.findAndCountAll({
        where: whereClause,
        order: [['timestamp', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });
      
      // Calculate total pages
      const totalPages = Math.ceil(sensorData.count / limit);
      
      res.json({
        data: sensorData.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalRecords: sensorData.count,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
  });
};

