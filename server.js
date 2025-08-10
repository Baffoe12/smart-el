// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Op } = require('sequelize');
const { sequelize, User, Appliance, SensorData, Device } = require('./models');

// === Validate Critical Environment Variables ===
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET environment variable');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

// Set up associations
Object.values(sequelize.models)
  .filter(model => typeof model.associate === 'function')
  .forEach(model => model.associate(sequelize.models));

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

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === SENSOR DATA INGESTION ===
app.post('/api/sensor-data', async (req, res) => {
  console.log('📥 RAW Body:', req.body);

  const { device_id, ip, timestamp, relays } = req.body;

  if (!device_id || !ip) {
    return res.status(400).json({ error: 'Missing device_id or ip' });
  }

  if (!relays || !Array.isArray(relays)) {
    return res.status(400).json({ error: 'Invalid or missing relays array' });
  }

  console.log('📦 Parsed relays:', relays);

  try {
    // 🔒 Only accept data if appliance exists AND is not deleted
   // Validate: each relay must have a matching appliance
for (const r of relays) {
  const relayNumber = parseInt(r.relay, 10); // ✅ Read "relay", not "id"
  if (isNaN(relayNumber)) {
    return res.status(400).json({ error: `Invalid relay number: ${r.relay}` });
  }

  const appliance = await Appliance.findOne({
    where: { relay: relayNumber }, // ✅ Search by relay number
    paranoid: false
  });

  if (!appliance || appliance.deletedAt) {
    console.warn(`❌ Appliance for relay ${relayNumber} not found or deleted`);
    return res.status(400).json({
      error: `Appliance for relay ${relayNumber} not found or was deleted.`
    });
  }
}

const records = await Promise.all(relays.map(async r => {
  const validTimestamp = timestamp ? timestamp * 1000 : Date.now();
  const date = new Date(validTimestamp);

  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp for relay:', r);
    return null;
  }

  // Get the appliance to use its real DB ID
  const relayNumber = parseInt(r.relay, 10);
  const appliance = await Appliance.findOne({
    where: { relay: relayNumber },
    paranoid: false
  });

  if (!appliance || appliance.deletedAt) return null; // Should never happen due to earlier check

  return {
    applianceId: appliance.id, // ✅ Real database ID
    current: r.current || 0,
    voltage: 230,
    power: r.power || 0,
    energy: r.energy_kwh || 0,
    cost: r.cost_ghs || 0,
    timestamp: date
    // ❌ Remove: deviceId: device_id (not part of SensorData)
  };
}));
    const validRecords = records.filter(r => r !== null);
    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid sensor data records' });
    }

    // ✅ Update or create device with latest IP
    await Device.findOrCreate({
      where: { deviceId: device_id },
      defaults: { ip, lastSeen: new Date() }
    });

    await Device.update(
      { ip, lastSeen: new Date() },
      { where: { deviceId: device_id } }
    );

    await SensorData.bulkCreate(validRecords);
    res.status(201).json({ message: 'Sensor data saved', count: validRecords.length });
  } catch (err) {
    console.error('❌ Sensor data save error:', err);
    res.status(500).json({ error: 'Failed to save sensor data' });
  }
});

// === GET LATEST SENSOR DATA ===
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

// === GET SENSOR DATA WITH PAGINATION ===
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
      limit: Math.min(parseInt(limit), 1000),
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

// === RELAY CONTROL (using dynamic IP) ===
app.post('/api/relay-control', async (req, res) => {
  const { deviceId, relay, state } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'Missing deviceId' });
  }
  if (![1,2,3,4].includes(relay)) {
    return res.status(400).json({ error: 'Invalid relay' });
  }
  if (![0,1].includes(state)) {
    return res.status(400).json({ error: 'Invalid state' });
  }

  try {
    const device = await Device.findOne({ where: { deviceId } });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const url = `http://${device.ip}/relay?relay=${relay}&state=${state}`;
    const response = await axios.get(url, { timeout: 5000 });

    res.json({ 
      message: 'Command sent', 
      deviceIp: device.ip,
      response: response.data 
    });
  } catch (error) {
    console.error('Relay error:', error.message);
    res.status(500).json({ 
      error: 'Failed to send command',
      deviceIp: device?.ip
    });
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
    console.error('Signup failed:', err);
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
    console.error('Login failed:', err);
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
    console.error('Fetch appliances error:', err);
    res.status(500).json({ error: 'Failed to fetch appliances' });
  }
});

app.post('/api/appliances', async (req, res) => {
  const { name, type, relay } = req.body;
  if (!type || !relay) {
    return res.status(400).json({ error: 'Type and relay are required' });
  }

  try {
    const appliance = await Appliance.create({
      name: name || `Appliance ${relay}`,
      type,
      relay,
      manuallyAdded: true
    });
    res.status(201).json({ ...appliance.toJSON(), applianceId: appliance.id });
  } catch (err) {
    console.error('Add appliance error:', err);
    res.status(500).json({ error: 'Add failed' });
  }
});

// DELETE - Soft delete
app.delete('/api/appliances/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    await appliance.destroy();
    console.log(`🗑️ Appliance ${id} soft-deleted`);

    res.json({ message: 'Appliance deleted (soft)' });
  } catch (err) {
    console.error('Delete failed:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// RESTORE - Bring back deleted appliance
app.post('/api/appliances/:id/restore', async (req, res) => {
  const { id } = req.params;

  try {
    const appliance = await Appliance.findByPk(id, { paranoid: false });
    if (!appliance) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!appliance.deletedAt) {
      return res.status(400).json({ error: 'Already active' });
    }

    await appliance.restore();
    console.log(`↩️ Appliance ${id} restored`);

    res.json({ message: 'Restored successfully' });
  } catch (err) {
    console.error('Restore failed:', err);
    res.status(500).json({ error: 'Restore failed' });
  }
});

// === RELAY CONTROL (from frontend) - Uses Dynamic IP ===
app.post('/api/appliances/:id/control', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Not found' });

    // ✅ Get latest device IP via SensorData
    const latestData = await SensorData.findOne({
      where: { applianceId: id },
      order: [['timestamp', 'DESC']],
      include: [
        {
          model: Device,
          as: 'device' // ✅ Matches `as: 'device'` in association
        }
      ]
    });

    if (!latestData || !latestData.device) {
      return res.status(404).json({ error: 'No device linked to this appliance' });
    }

    const deviceIp = latestData.device.ip;
    const state = action === 'on' ? 1 : 0;
    const url = `http://${deviceIp}/relay?relay=${appliance.relay}&state=${state}`;

    try {
      await axios.get(url, { timeout: 5000 });
      console.log(`✅ Relay ${appliance.relay} turned ${action} via ${deviceIp}`);
    } catch (err) {
      console.warn(`⚠️ Failed to reach ESP32 at ${deviceIp}:`, err.message);
      return res.status(500).json({ error: 'Failed to reach device' });
    }

    appliance.status = action;
    await appliance.save();

    res.json({ message: `Appliance turned ${action}`, appliance });
  } catch (err) {
    console.error('Control failed:', err);
    res.status(500).json({ error: 'Control failed' });
  }
});

// === SCHEDULING (Dynamic IP) ===
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

    // ✅ Define getDeviceIp once
    const getDeviceIp = async () => {
      const latestData = await SensorData.findOne({
        where: { applianceId: id },
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: Device,
            as: 'device'
          }
        ]
      });
      return latestData?.device?.ip || '172.20.10.3';
    };

    // Schedule ON
    if (delayOn > 0) {
      setTimeout(async () => {
        try {
          const ip = await getDeviceIp();
          const url = `http://${ip}/relay?relay=${appliance.relay}&state=1`;
          await axios.get(url, { timeout: 5000 });
          console.log(`✅ Scheduled ON for relay ${appliance.relay}`);
        } catch (err) {
          console.error('Scheduled ON failed:', err.message);
        }
      }, delayOn);
    }

    // Schedule OFF
    if (delayOff > 0) {
      setTimeout(async () => {
        try {
          const ip = await getDeviceIp();
          const url = `http://${ip}/relay?relay=${appliance.relay}&state=0`;
          await axios.get(url, { timeout: 5000 });
          console.log(`✅ Scheduled OFF for relay ${appliance.relay}`);
        } catch (err) {
          console.error('Scheduled OFF failed:', err.message);
        }
      }, delayOff);
    }

    res.json({ message: 'Scheduled', appliance });
  } catch (err) {
    console.error('Schedule failed:', err);
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

// ✅ SAFE SERVER STARTUP
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models (safe: no alter/drop)
    await sequelize.sync({ force: false });
    console.log('✅ Database tables synchronized');

    // Ensure device exists
    await Device.findOrCreate({
      where: { deviceId: 'SmartBoard_01' },
      defaults: {
        deviceId: 'SmartBoard_01',
        ip: '172.20.10.3',
        lastSeen: new Date()
      }
    });

    // Seed default appliances
    const defaultAppliances = [
      { name: 'Socket A', type: 'power', relay: 1, status: 'off', manuallyAdded: false },
      { name: 'Socket B', type: 'power', relay: 2, status: 'off', manuallyAdded: false },
      { name: 'Socket C', type: 'power', relay: 3, status: 'off', manuallyAdded: false },
      { name: 'Socket D', type: 'power', relay: 4, status: 'off', manuallyAdded: false }
    ];
for (const appliance of defaultAppliances) {
  const existing = await Appliance.findOne({
    where: { relay: appliance.relay },
    paranoid: false
  });

  if (!existing) {
    // Brand new
    await Appliance.create(appliance);
    console.log(`🆕 Created: ${appliance.name}`);
  } else if (existing.deletedAt) {
    // Soft-deleted → restore it
    await Appliance.restore({ where: { id: existing.id } });
    await existing.update({ status: 'off' }); // Reset state
    console.log(`↩️ Restored: ${appliance.name}`);
  } else {
    // Already active
    console.log(`✅ Active: ${appliance.name}`);
  }
}
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
  });
} catch (err) {
  console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();