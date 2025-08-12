// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, User, Appliance, SensorData, Device, Command } = require('./models');

// === Validate Environment Variables ===
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
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Smart Energy Monitor API is running'
  });
});

// === SENSOR DATA INGESTION ===
app.post('/api/sensor-data', async (req, res) => {
  const { device_id, ip, timestamp, relays } = req.body;

  if (!device_id || !ip) {
    return res.status(400).json({ error: 'Missing device_id or ip' });
  }

  if (!relays || !Array.isArray(relays)) {
    return res.status(400).json({ error: 'Invalid or missing relays array' });
  }

  try {
    const records = [];

    for (const r of relays) {
      const relayNumber = parseInt(r.relay, 10);
      const validTimestamp = timestamp ? timestamp * 1000 : Date.now();
      const date = new Date(validTimestamp);

      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp for relay:', r);
        continue;
      }

      // Enforce: appliance.id === relay number
      const expectedId = relayNumber;

      // Clean up any misconfigured appliances
      await Appliance.destroy({
        where: { relay: relayNumber, id: { [Op.ne]: expectedId } },
        force: true
      });

      // Find or create appliance with correct ID
      let appliance = await Appliance.findOne({ where: { id: expectedId }, paranoid: false });

      if (!appliance) {
        appliance = await Appliance.create({
          id: expectedId,
          name: `Socket ${String.fromCharCode(64 + relayNumber)}`,
          type: 'power',
          relay: relayNumber,
          status: 'off',
          manuallyAdded: false
        });
        console.log(`🆕 Created appliance ID=${expectedId}`);
      } else if (appliance.deletedAt) {
        await appliance.restore();
        console.log(`↩️ Restored appliance ID=${expectedId}`);
      }

      if (!appliance) continue;

      records.push({
        applianceId: appliance.id,
        current: r.current || 0,
        voltage: 230,
        power: r.power || 0,
        energy: r.energy_kwh || 0,
        cost: r.cost_ghs || 0,
        timestamp: date,
        deviceId: device_id
      });
    }

    // Validate appliance IDs
    const validApplianceIds = (await Appliance.unscoped().findAll({
      where: { id: records.map(r => r.applianceId) },
      attributes: ['id'],
      raw: true
    })).map(a => a.id);

    const validRecords = records.filter(r => validApplianceIds.includes(r.applianceId));
    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid appliance IDs found' });
    }

    // Register or update device
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
      include: [{ model: Device, as: 'device' }],
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
  const whereClause = {};

  if (deviceId) whereClause.deviceId = deviceId;
  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp[Op.gte] = new Date(startDate);
    if (endDate) whereClause.timestamp[Op.lte] = new Date(endDate);
  }

  try {
    const data = await SensorData.findAll({
      where: whereClause,
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']],
      include: [{ model: Device, as: 'device' }]
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

// === GET PENDING COMMAND FOR DEVICE ===
app.get('/api/commands', async (req, res) => {
  const { device_id } = req.query;

  if (!device_id) {
    return res.status(400).json({ error: 'Missing device_id' });
  }

  try {
    console.log(`🔍 Looking for device: ${device_id}`);
    
    const device = await Device.findOne({ where: { deviceId: device_id } });
    
    if (!device) {
      console.warn(`❌ Device not found: ${device_id}`);
      return res.status(404).json({ error: 'Device not found' });
    }

    console.log(`✅ Found device ID: ${device.id}, IP: ${device.ip}`);
const command = await Command.findOne({
  where: {
    deviceId: device.deviceId,  // ✅ Not device.id
    executed: false,
    expiresAt: { [Op.gt]: new Date() }
  }
});

    if (command) {
      console.log(`🎉 Pending command: Relay ${command.relay} → ${command.state}`);
      return res.json({
        relay: command.relay,
        state: command.state
      });
    }

    console.log(`✅ No pending command for device ${device_id}`);
    return res.json({});
  } catch (err) {
    console.error('🚨 Error in /api/commands:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: err.message 
    });
  }
});

// === RELAY CONTROL – Queue Command Only (No Direct Call) ===
app.post('/api/appliances/:id/control', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action: use "on" or "off"' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

    if (![1, 2, 3, 4].includes(appliance.relay)) {
      return res.status(400).json({ error: `Invalid relay number: ${appliance.relay}` });
    }

    // Get latest device for this appliance
    const latestData = await SensorData.findOne({
      where: { applianceId: id },
      order: [['timestamp', 'DESC']],
      include: [{ model: Device, as: 'device' }]
    });

const device = latestData?.device;
if (!device) {
  return res.status(400).json({ error: 'No active device found for this appliance' });
}

// ✅ Use device.deviceId, not device.id
await Command.create({
  deviceId: device.deviceId,  // ✅ String
  relay: appliance.relay,
  state: action === 'on',
  expiresAt: new Date(Date.now() + 300000)
});

    console.log(`✅ Queued ${action.toUpperCase()} for Relay ${appliance.relay} (Device: ${device.deviceId})`);
    res.json({ message: `Command queued to turn ${action}` });
  } catch (err) {
    console.error('Control failed:', err);
    res.status(500).json({ error: 'Failed to queue command' });
  }
});

// === SCHEDULING – Queue Future Commands ===
app.post('/api/appliances/:id/schedule', async (req, res) => {
  const { id } = req.params;
  const { onTime, offTime } = req.body;

  if (!onTime || !offTime) {
    return res.status(400).json({ error: 'onTime and offTime required' });
  }

  const onDate = new Date(onTime);
  const offDate = new Date(offTime);
  if (isNaN(onDate.getTime()) || isNaN(offDate.getTime()) || offDate <= onDate) {
    return res.status(400).json({ error: 'Invalid time range' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Not found' });

    await appliance.update({
      scheduled: true,
      scheduleOn: onDate,
      scheduleOff: offDate
    });

    // ✅ Queue ON command
    setTimeout(async () => {
      try {
        const latestData = await SensorData.findOne({
          where: { applianceId: id },
          order: [['timestamp', 'DESC']],
          include: [{ model: Device, as: 'device' }]
        });
        const device = latestData?.device;
        if (device) {
          await Command.create({
            deviceId: device.deviceId,  // ✅ Correct
            relay: appliance.relay,
            state: true,
            expiresAt: new Date(Date.now() + 300000)
          });
          console.log(`✅ Scheduled ON for Relay ${appliance.relay}`);
        }
      } catch (err) {
        console.error('Failed to schedule ON command:', err);
      }
    }, onDate - Date.now());

    // ✅ Queue OFF command
    setTimeout(async () => {
      try {
        const latestData = await SensorData.findOne({
          where: { applianceId: id },
          order: [['timestamp', 'DESC']],
          include: [{ model: Device, as: 'device' }]
        });
        const device = latestData?.device;
        if (device) {
          await Command.create({
            deviceId: device.deviceId,  // ✅ Correct
            relay: appliance.relay,
            state: false,
            expiresAt: new Date(Date.now() + 300000)
          });
          console.log(`✅ Scheduled OFF for Relay ${appliance.relay}`);
        }
      } catch (err) {
        console.error('Failed to schedule OFF command:', err);
      }
    }, offDate - Date.now());

    res.json({ message: 'Scheduled successfully' });
  } catch (err) {
    console.error('Schedule failed:', err);
    res.status(500).json({ error: 'Schedule failed' });
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
  const defaults = [
    { name: 'Socket A', relay: 1 },
    { name: 'Socket B', relay: 2 },
    { name: 'Socket C', relay: 3 },
    { name: 'Socket D', relay: 4 }
  ];

  try {
    const dbAppliances = await Appliance.findAll({ where: { deletedAt: null } });
    const map = Object.fromEntries(dbAppliances.map(a => [a.relay, a]));

    const merged = defaults.map(def => map[def.relay] || { ...def, type: 'power', status: 'off', manuallyAdded: false });
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/appliances', async (req, res) => {
  const { name, type, relay } = req.body;
  if (!type || !relay) return res.status(400).json({ error: 'Type and relay required' });

  try {
    const appliance = await Appliance.create({ name, type, relay, manuallyAdded: true });
    res.status(201).json(appliance);
  } catch (err) {
    res.status(500).json({ error: 'Create failed' });
  }
});

// Soft delete
app.delete('/api/appliances/:id', async (req, res) => {
  const { id } = req.params;
  const appliance = await Appliance.findByPk(id);
  if (!appliance) return res.status(404).json({ error: 'Not found' });
  await appliance.destroy();
  res.json({ message: 'Deleted' });
});

// Restore
app.post('/api/appliances/:id/restore', async (req, res) => {
  const { id } = req.params;
  const appliance = await Appliance.findByPk(id, { paranoid: false });
  if (!appliance || !appliance.deletedAt) return res.status(400).json({ error: 'Not soft-deleted' });
  await appliance.restore();
  res.json({ message: 'Restored' });
});

// Update
app.put('/api/appliances/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;
  const appliance = await Appliance.findByPk(id, { paranoid: false });
  if (!appliance) return res.status(404).json({ error: 'Not found' });
  await appliance.update({ name, type });
  res.json(appliance);
});

// Cancel schedule
app.delete('/api/appliances/:id/schedule', async (req, res) => {
  const { id } = req.params;
  const appliance = await Appliance.findByPk(id);
  if (!appliance) return res.status(404).json({ error: 'Not found' });
  await appliance.update({ scheduled: false, scheduleOn: null, scheduleOff: null });
  res.json({ message: 'Cancelled' });
});

// History
app.get('/api/appliances/:id/history', async (req, res) => {
  const { id } = req.params;
  const range = req.query.range || '7d';
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
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Thresholds
app.get('/api/thresholds', (req, res) => {
  res.json({ power: 1400 });
});

// Export
app.get('/api/export-report', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
  res.setHeader('Content-Type', 'text/csv');
  res.send('timestamp,appliance,current,power,energy,cost\n');
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// === START SERVER ===
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync();
    console.log('✅ Tables synchronized');

    // Ensure default device
    await Device.findOrCreate({
      where: { deviceId: 'SmartBoard_01' },
      defaults: { ip: '0.0.0.0', lastSeen: new Date() }
    });

    // Ensure default sockets
    const defaults = [
      { id: 1, name: 'Socket A', relay: 1 },
      { id: 2, name: 'Socket B', relay: 2 },
      { id: 3, name: 'Socket C', relay: 3 },
      { id: 4, name: 'Socket D', relay: 4 }
    ];

    for (const def of defaults) {
      await Appliance.findOrCreate({
        where: { id: def.id },
        defaults: { ...def, type: 'power', manuallyAdded: false }
      });
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