// sensorDataEndpoint.js

const Appliance = require('./models/Appliance');
const SensorData = require('./models/SensorData');
const { Sequelize } = require('sequelize');

module.exports = function (app) {
  // === POST /api/sensor-data ===
  // Receive JSON data from ESP32
  app.post('/api/sensor-data', async (req, res) => {
    const data = req.body;

    console.log('✅ Sensor data received:', JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.device_id || !Array.isArray(data.relays)) {
      return res.status(400).json({ error: 'Invalid data format: missing device_id or relays' });
    }

    try {
      // Process each relay
      for (const relay of data.relays) {
        const appliance = await Appliance.findOne({ where: { relay: relay.id } });
        if (!appliance) {
          console.log(`⚠️ No appliance found for relay ${relay.id}`);
          continue;
        }

        // Update appliance current status
        await appliance.update({
          isOn: relay.state || false,
          current: parseFloat(relay.current) || 0,
          power: parseFloat(relay.power) || 0,
          amount: parseFloat(relay.cost_ghs) || 0
        });

        // Save raw sensor reading
        await SensorData.create({
          applianceId: appliance.id,
          current: parseFloat(relay.current) || 0,
          power: parseFloat(relay.power) || 0,
          energy: parseFloat(relay.energy_kwh) || 0,
          cost: parseFloat(relay.cost_ghs) || 0,
          relayState: relay.state || false,
          voltage: 230.0
        });

        console.log(`💾 Updated appliance "${appliance.type}" (Relay ${relay.id})`);
      }

      // Respond success
      res.status(200).json({
        message: 'Sensor data received and saved successfully',
        received: true,
        device: data.device_id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error processing sensor data:', error);
      res.status(500).json({
        error: 'Failed to process sensor data',
        details: error.message
      });
    }
  });

  // === GET /api/sensor-data/latest ===
  // Get latest sensor readings for all appliances
  app.get('/api/sensor-data/latest', async (req, res) => {
    try {
      const appliances = await Appliance.findAll({
        include: [{
          model: SensorData,
          as: 'SensorData',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }],
        order: [['relay', 'ASC']]
      });

      const result = appliances.map(appliance => ({
        applianceId: appliance.id,
        type: appliance.type,
        relay: appliance.relay,
        isOn: appliance.isOn,
        current: appliance.current,
        power: appliance.power,
        amount: appliance.amount,
        latestReading: appliance.SensorData[0] || null
      }));

      res.json(result);
    } catch (error) {
      console.error('Error fetching latest data:', error);
      res.status(500).json({ error: 'Failed to fetch latest sensor data' });
    }
  });

  // === GET /api/sensor-data ===
  // Paginated and filtered sensor data
  app.get('/api/sensor-data', async (req, res) => {
    try {
      const { applianceId, startDate, endDate, page = 1, limit = 50 } = req.query;

      const where = {};
      if (applianceId) where.applianceId = applianceId;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Sequelize.Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Sequelize.Op.lte] = new Date(endDate);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const query = {
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      };

      const result = await SensorData.findAndCountAll(query);
      const totalPages = Math.ceil(result.count / limit);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: result.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
  });

  // === POST /api/esp-data (Optional: for text format parsing) ===
  app.post('/api/esp-data', async (req, res) => {
    const rawData = req.body;
    if (typeof rawData !== 'string') {
      return res.status(400).json({ error: 'Expected text data' });
    }

    const parseEspData = (data) => {
      const lines = data.split('\n');
      const relays = [];
      let total = { energy_kwh: 0, cost_ghs: 0 };

      for (const line of lines) {
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

        const totalMatch = line.match(/TOTAL:\s*([0-9.]+)\s*kWh\s*\|\s*([0-9.]+)\s*Ghs/);
        if (totalMatch) {
          total.energy_kwh = parseFloat(totalMatch[1]);
          total.cost_ghs = parseFloat(totalMatch[2]);
        }
      }
      return { relays, total };
    };

    const { relays, total } = parseEspData(rawData);

    try {
      for (const relayData of relays) {
        const appliance = await Appliance.findOne({ where: { relay: relayData.id } });
        if (appliance) {
          await appliance.update({
            isOn: relayData.state,
            current: relayData.current || 0,
            power: relayData.power || 0,
            amount: relayData.cost_ghs || 0
          });

          await SensorData.create({
            applianceId: appliance.id,
            current: relayData.current,
            power: relayData.power,
            energy: relayData.energy_kwh,
            cost: relayData.cost_ghs,
            relayState: relayData.state,
            voltage: 230
          });
        }
      }

      res.json({ message: 'Text data processed successfully' });
    } catch (error) {
      console.error('Error processing text data:', error);
      res.status(500).json({ error: 'Failed to process text data' });
    }
  });
};