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

// === SENSOR DATA ENDPOINTS ===

app.post('/api/sensor-data', async (req, res) => {
  const { device_id, timestamp, relays } = req.body;

  if (!relays || !Array.isArray(relays)) {
    return res.status(400).json({ error: 'Invalid or missing relays array' });
  }

  try {
    // ✅ Pre-create appliances if they don't exist
    const applianceIds = relays.map(r => r.id);
    for (const id of applianceIds) {
      await Appliance.findOrCreate({
        where: { id },
        defaults: {
          type: `Relay ${id}`,
          relay: id,
          name: `Socket ${id}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // ✅ Now create sensor data
    const records = relays.map(r => ({
      applianceId: r.id,
      current: r.current,
      voltage: 230,
      power: r.power,
      energy: r.energy_kwh,
      cost: r.cost_ghs,
      timestamp: new Date(timestamp || Date.now()),
      deviceId: device_id
    }));

    await SensorData.bulkCreate(records);
    res.status(201).json({ message: 'Sensor data saved' });
  } catch (err) {
    console.error('Save sensor data error:', err);
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
  const { limit = 100 } = req.query;
  try {
    const data = await SensorData.findAll({
      limit: parseInt(limit),
      order: [['timestamp', 'DESC']]
    });
    res.json(data);
  } catch (err) {
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

// === START SERVER ===
sequelize.authenticate()
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

sequelize.sync({ alter: true })
  .then(() => console.log('✅ Models synced'))
  .catch(err => console.error('❌ Sync error:', err));

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});