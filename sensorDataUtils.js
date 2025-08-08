// sensorDataUtils.js - Utility module for sensor data processing
// This replaces sensorDataEndpoint.js as a utility module

const { Appliance, SensorData, sequelize } = require('./models');
const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;

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

// === Utility Functions for Data Processing ===

// Process sensor data from JSON format
async function processSensorDataJSON(data) {
  const { device_id, timestamp, relays, total } = data;

  if (!relays || !Array.isArray(relays)) {
    throw new Error('Missing or invalid "relays" array');
  }

  const sensorRecords = relays.map(r => ({
    applianceId: r.id,
    current: r.current,
    voltage: 230,
    power: r.power,
    energy: r.energy_kwh,
    cost: r.cost_ghs,
    timestamp: new Date(timestamp || Date.now()),
    deviceId: device_id
  }));

  return sensorRecords;
}

// Process sensor data from text format
async function processSensorDataText(rawData) {
  const { relays, total } = parseEspData(rawData);
  
  if (!relays || relays.length === 0) {
    throw new Error('No valid relay data found');
  }

  const sensorRecords = [];
  for (const relayData of relays) {
    const appliance = await Appliance.findOne({ where: { relay: relayData.id } });
    if (appliance) {
      await appliance.update({
        isOn: relayData.state,
        current: relayData.current || 0,
        power: relayData.power || 0,
        amount: relayData.cost_ghs || 0
      });

      sensorRecords.push({
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

  return sensorRecords;
}

// Get latest sensor data for appliances
async function getLatestSensorData() {
  try {
    const appliances = await Appliance.findAll({
      include: [{
        model: SensorData,
        as: 'SensorData',
        limit: 1,
        order: [['createdAt', 'DESC']]
      }]
    });
    
    return appliances;
  } catch (error) {
    throw new Error('Failed to fetch latest sensor data: ' + error.message);
  }
}

// Get paginated sensor data with filtering
async function getPaginatedSensorData(query) {
  const { applianceId, startDate, endDate, page = 1, limit = 50 } = query;

  const where = {};
  if (applianceId) where.applianceId = applianceId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { count, rows } = await SensorData.findAndCountAll({
