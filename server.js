// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Op } = require('sequelize');
const { sequelize, User, Appliance, SensorData } = require('./models');
// Set up associations
Object.values(sequelize.models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(sequelize.models));

// Models are already imported above with the sequelize instance

// Set your ESP32/relay board IP here
const DEVICE_IP = '172.20.10.3'; // ← Change to your actual device IP

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.post('/api/sensor-data', async (req, res) => {
  console.log('📥 RAW Body:', req.body);

  const { device_id, timestamp, relays } = req.body;

  if (!relays || !Array.isArray(relays)) {
    return res.status(400).json({ error: 'Invalid or missing relays array' });
  }

  console.log('📦 Parsed relays:', relays);

  try {
    // ✅ Ensure appliances exist before creating sensor data
    for (const r of relays) {
      await Appliance.findOrCreate({
        where: { id: parseInt(r.id, 10) },
        defaults: {
          name: `Relay ${r.id}`,
          type: `Type ${r.id}`,
          relay: parseInt(r.id, 10),
          status: 'off'
        }
      });
    }

   const records = relays.map(r => {
  const validTimestamp = timestamp ? timestamp * 1000 : Date.now();
  const date = new Date(validTimestamp);

  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp for relay:', r);
    return null;
  }

  return {  // ✅ ADD RETURN HERE
    applianceId: parseInt(r.id, 10),
    current: r.current || 0,
    voltage: 230,
    power: r.power || 0,
    energy: r.energy_kwh || 0,
    cost: r.cost_ghs || 0,
    timestamp: date,
    deviceId: device_id,
    createdAt: new Date(),
    updatedAt: new Date()
  };
});
          // Filter out any null records due to invalid timestamps
          const validRecords = records.filter(r => r !== null);
      
          if (validRecords.length === 0) {
            return res.status(400).json({ error: 'No valid sensor data records' });
          }
      
          // Bulk create sensor data
          await SensorData.bulkCreate(validRecords);
      
          res.status(201).json({ message: 'Sensor data saved', count: validRecords.length });
        } catch (err) {
          console.error('Sensor data save error:', err);
          res.status(500).json({ error: 'Failed to save sensor data' });
        }
      });

app.get('/api/sensor-data/latest', async (req, res) => {
  try {
    const latest = await SensorData.findAll({
      attributes: [
        'applianceId',
        [sequelize.fn('MAX', sequelize.col('timestamp')), 'maxTimestamp']
      ],
      group: ['applianceId'],
      raw: true
    });

    if (latest.length === 0) return res.json([]);

    const maxTimestamps = latest.map(e => e.maxTimestamp);
    const data = await SensorData.findAll({
      where: { timestamp: { [Op.in]: maxTimestamps } },
      order: [['applianceId', 'ASC']]
    });

    res.json(data);
  } catch (err) {
    console.error('Fetch latest data error:', err);
    res.status(500).json({ error: 'Failed to fetch latest data' });
  }
});

app.get('/api/sensor-data', async (req, res) => {
  const { limit = 100, offset = 0, deviceId, startDate, endDate } = req.query;
  
  try {
    const whereClause = {};
    
    if (deviceId) whereClause.deviceId = deviceId;
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp[Op.gte] = new Date(startDate);
      if (endDate) whereClause.timestamp[Op.lte] = new Date(endDate);
    }

    const data = await SensorData.findAll({
      where: whereClause,
      limit: Math.min(parseInt(limit), 1000), // Max 1000 records
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']]
    });
    
    const total = await SensorData.count({ where: whereClause });
    
    res.json({
      data,
      pagination: {
        total,
        limit: Math.min(parseInt(limit), 1000),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + data.length < total
      }
    });
  } catch (err) {
    console.error('Sensor data fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// === RELAY CONTROL ===

app.post('/api/relay-control', async (req, res) => {
  const { ip, relay, state } = req.body;
  if (!ip || ![1,2,3,4].includes(relay) || ![0,1].includes(state)) {
    return res.status(400).json({ error: 'Invalid params' });
  }

  try {
    const url = `http://${ip}/relay?relay=${relay}&state=${state}`;
    const response = await axios.get(url, { timeout: 5000 });
    res.json({ message: 'Command sent', data: response.data });
  } catch (error) {
    console.error('Relay error:', error.message);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// === AUTH ROUTES ===

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password too short' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email in use' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ token, user: { id: user.id, name, email } });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user', async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: 1 } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// === APPLIANCES ===

app.get('/api/appliances', async (req, res) => {
  try {
    const appliances = await Appliance.findAll();
    res.json(appliances.map(a => ({ ...a.toJSON(), applianceId: a.id })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appliances' });
  }
});

app.post('/api/appliances', async (req, res) => {
  const { type, relay } = req.body;
  if (!type) return res.status(400).json({ error: 'Type required' });

  try {
    const appliance = await Appliance.create({ type, relay });
    res.status(201).json({ ...appliance.toJSON(), applianceId: appliance.id });
  } catch (err) {
    res.status(500).json({ error: 'Add failed' });
  }
});

app.delete('/api/appliances/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await sequelize.transaction(async (t) => {
      await SensorData.destroy({ where: { applianceId: id }, transaction: t });
      const deleted = await Appliance.destroy({ where: { id }, transaction: t });
      if (!deleted) return res.status(404).json({ error: 'Not found' });
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// === SCHEDULING ===

app.post('/api/appliances/:id/schedule', async (req, res) => {
  const { id } = req.params;
  const { onTime, offTime } = req.body;

  if (!onTime || !offTime) {
    return res.status(400).json({ error: 'onTime and offTime required' });
  }

  const onDate = new Date(onTime);
  const offDate = new Date(offTime);
  if (isNaN(onDate.getTime()) || isNaN(offDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  if (offDate <= onDate) {
    return res.status(400).json({ error: 'offTime must be after onTime' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Not found' });

    await appliance.update({
      scheduled: true,
      scheduleOn: onDate,
      scheduleOff: offDate
    });

    const delayOn = onDate - Date.now();
    const delayOff = offDate - Date.now();

    if (delayOn > 0) {
      setTimeout(async () => {
        try {
          await axios.get(`http://${DEVICE_IP}/relay?relay=${appliance.relay}&state=1`);
        } catch (err) { console.error('ON failed:', err.message); }
      }, delayOn);
    }

    if (delayOff > 0) {
      setTimeout(async () => {
        try {
          await axios.get(`http://${DEVICE_IP}/relay?relay=${appliance.relay}&state=0`);
        } catch (err) { console.error('OFF failed:', err.message); }
      }, delayOff);
    }

    res.json({ message: 'Scheduled', appliance });
  } catch (err) {
    res.status(500).json({ error: 'Schedule failed' });
  }
});

app.delete('/api/appliances/:id/schedule', async (req, res) => {
  const { id } = req.params;
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Not found' });

    await appliance.update({
      scheduled: false,
      scheduleOn: null,
      scheduleOff: null
    });

    res.json({ message: 'Schedule cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Cancel failed' });
  }
});

// === RELAY CONTROL (from frontend) ===

app.post('/api/appliances/:id/control', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Not found' });

    appliance.status = action;
    await appliance.save();

    const state = action === 'on' ? 1 : 0;
    const url = `http://${DEVICE_IP}/relay?relay=${appliance.relay}&state=${state}`;

    try {
      await axios.get(url, { timeout: 5000 });
      console.log(`✅ Relay ${appliance.relay} turned ${action}`);
    } catch (err) {
      console.warn(`⚠️ Failed to reach ESP32:`, err.message);
    }

    res.json({ message: `Appliance turned ${action}`, appliance });
  } catch (err) {
    res.status(500).json({ error: 'Control failed' });
  }
});

// === OTHER ENDPOINTS ===

app.get('/api/appliances/:id/history', async (req, res) => {
  const { id } = req.params;
  const { range = '7d' } = req.query;
  const hours = { '1d': 24, '7d': 168, '30d': 720 }[range] || 24;

  try {
    const data = await SensorData.findAll({
      where: {
        applianceId: id,
        timestamp: { [Op.gte]: new Date(Date.now() - hours * 60 * 60 * 1000) }
      },
      order: [['timestamp', 'ASC']]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Fetch history failed' });
  }
});

app.get('/api/thresholds', (req, res) => {
  res.json({ power: 1400 });
});

app.get('/api/export-report', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
  res.setHeader('Content-Type', 'text/csv');
  res.send('timestamp,appliance,current,power,energy,cost\n');
});

// === 404 HANDLER ===
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ NEW — SAFE, SEQUENTIAL STARTUP
async function startServer() {
  try {
    // 1. Connect to DB
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // 2. Sync models
    await sequelize.sync({ alter: true });  // or { force: false }
    console.log('✅ Models synced');

    // 3. (Optional) Pre-create default appliances
    const defaultAppliances = [
      { id: 1, name: 'Air Conditioner', type: 'Cooling', relay: 1, status: 'off' },
      { id: 2, name: 'Refrigerator',    type: 'Cooling', relay: 2, status: 'off' },
      { id: 3, name: 'Washing Machine', type: 'Laundry', relay: 3, status: 'off' },
      { id: 4, name: 'Microwave',       type: 'Cooking', relay: 4, status: 'off' }
    ];

    for (const appliance of defaultAppliances) {
      const [record, created] = await Appliance.findOrCreate({
        where: { id: appliance.id },
        defaults: appliance
      });
      if (created) {
        console.log(`🆕 Created Appliance ${record.id}: ${record.name}`);
      }
    }

    // 4. Start server
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();