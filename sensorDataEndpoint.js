// sensorDataEndpoint.js

const { Appliance, SensorData } = require('./models');
const { Sequelize } = require('sequelize');

// === Helper: Parse Text Format (e.g., Serial Monitor Output) ===
function parseEspData(data) {
  if (typeof data !== 'string') return { relays: [], total: {} };
  const lines = data.split('\n');
  const relays = [];
  let total = { energy_kwh: 0, cost_ghs: 0 };

  for (const line of lines) {
    // Match: "Relay 1: ON  - 0.50A | 115W | 0.001 kWh | 0.00 Ghs"
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

    // Match: "TOTAL: 0.013 kWh | 0.02 Ghs"
    const totalMatch = line.match(/TOTAL:\s*([0-9.]+)\s*kWh\s*\|\s*([0-9.]+)\s*Ghs/);
    if (totalMatch) {
      total.energy_kwh = parseFloat(totalMatch[1]);
      total.cost_ghs = parseFloat(totalMatch[2]);
    }
  }
  return { relays, total };
}

module.exports = function (app) {

  // === POST /api/sensor-data - Receive JSON from ESP32 ===
  app.post('/api/sensor-data', async (req, res) => {
    const { relays } = req.body;

    try {
      for (const r of relays) {
        const appliance = await Appliance.findOne({ where: { relay: r.id } });
        if (appliance) {
          await appliance.update({
            isOn: r.state,
            current: r.current,
            power: r.power,
            amount: r.cost_ghs
          });

          await SensorData.create({
            applianceId: appliance.id,
            current: r.current,
            power: r.power,
            energy: r.energy_kwh,
            cost: r.cost_ghs,
            relayState: r.state
          });
        }
      }

      res.status(200).json({ message: 'Data saved' });
    } catch (error) {
      res.status(500).json({ error: 'Save failed' });
    }
  });

  // === GET /api/sensor-data/latest ===
  // Get latest sensor reading for each appliance
  app.get('/api/sensor-data/latest', async (req, res) => {
    try {
      // Check database connection first
      await sequelize.authenticate();
      
          const appliances = await Appliance.findAll({
            include: [{
              model: SensorData,
              as: 'SensorData',
              limit: 1,
              order: [['createdAt', 'DESC']]
            }]
          });
    
          res.json({ success: true, data: appliances });
        } catch (error) {
          console.error('Error fetching latest sensor data:', error);
          res.status(500).json({ error: 'Failed to fetch latest sensor data' });
        }
      });

  // === GET /api/sensor-data ===
  // Paginated historical data with filtering
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
      const { count, rows } = await SensorData.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset,
        distinct: true
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: count,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
  });

  // === POST /api/esp-data (Text Format) ===
  app.post('/api/esp-data', async (req, res) => {
    const rawData = req.body;
    if (typeof rawData !== 'string') {
      return res.status(400).json({ error: 'Expected string data' });
    }

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