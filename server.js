require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const models = require('./models');
const { sequelize, User, Appliance, SensorData, Device } = models;

// === Validate Environment ===
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET environment variable');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL environment variable');
  process.exit(1);
}

// === Initialize Express & HTTP Server ===
const app = express();
const server = require('http').createServer(app);

// === Socket.IO for Mobile/Web Dashboard ===
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// === Raw WebSocket Server for ESP32 (using 'ws') ===
const { WebSocketServer } = require('ws');
const rawWss = new WebSocketServer({ noServer: true });

// === Device Connection Maps ===
const deviceSockets = new Map();        // device_id → socketId (Socket.IO)
const esp32Sockets = new Map();         // device_id → ws (Raw WebSocket)

// === Middleware ===
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

// === SOCKET.IO CONNECTIONS (Mobile/Web App) ===
io.on('connection', (socket) => {
  console.log('📱 Mobile/Web Client connected:', socket.id);

  socket.on('register', async (data) => {
    const { device_id } = data;
    if (!device_id) {
      socket.emit('error', { message: 'device_id required' });
      return;
    }

    deviceSockets.set(device_id, socket.id);
    console.log(`✅ Socket.IO Device registered: ${device_id}`);

    // Save or update device
    await Device.findOrCreate({
      where: { deviceId: device_id },
      defaults: { ip: 'WS_CONNECTED', lastSeen: new Date() }
    });
    await Device.update(
      { ip: 'WS_CONNECTED', lastSeen: new Date() },
      { where: { deviceId: device_id } }
    );

    socket.emit('registered', { device_id, status: 'connected' });
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO Client disconnected:', socket.id);
    for (const [deviceId, sockId] of deviceSockets) {
      if (sockId === socket.id) {
        deviceSockets.delete(deviceId);
        break;
      }
    }
  });
});

// === RAW WEBSOCKET SERVER (ESP32) ===
rawWss.on('connection', (ws, req) => {
  const deviceId = req.url.slice(1); // /SmartBoard_01 → extract
  if (!deviceId) {
    ws.close();
    return;
  }

  console.log(`🔌 ESP32 Connected via Raw WS: ${deviceId}`);
  esp32Sockets.set(deviceId, ws);

  ws.send(JSON.stringify({ type: 'welcome', device_id: deviceId }));

  ws.on('message', async (data) => {  // ← Add 'async'
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'register') {
        console.log(`✅ ESP32 Registered: ${deviceId}`);
        ws.send(JSON.stringify({ type: 'registered', device_id: deviceId }));

        // ✅ Update device in DB
        await Device.findOrCreate({
          where: { deviceId: deviceId },
          defaults: { ip: 'WS_CONNECTED', lastSeen: new Date() }
        });
        await Device.update(
          { ip: 'WS_CONNECTED', lastSeen: new Date() },
          { where: { deviceId: deviceId } }
        );

      // ✅ Handle sensor data from ESP32
      } else if (msg.type === 'sensorData') {
        const sensor = msg.data;
        const { applianceId, current, voltage, power, energy, cost, timestamp, device_id } = sensor;

        // ✅ Validate
        if (!applianceId || typeof power !== 'number') {
          console.warn('Invalid sensor data:', sensor);
          return;
        }

        // ✅ Save to DB
        await SensorData.create({
          applianceId,
          current: current || 0,
          voltage: voltage || 230,
          power,
          energy: energy || 0,
          cost: cost || 0,
          timestamp: new Date(timestamp * 1000), // Unix seconds → Date
          deviceId: device_id || deviceId // Use from payload or URL
        });

        console.log(`✅ Saved sensor data via WS: Appliance ${applianceId}, Power: ${power}W`);

        // ✅ Emit to frontend
        io.emit('sensor-update', [{
          applianceId,
          power,
          current,
          voltage,
          energy,
          cost,
          timestamp: new Date(timestamp * 1000).toISOString()
        }]);

      }

    } catch (err) {
      console.error('Raw WS parse error:', err);
    }
  });

  ws.on('close', () => {
    esp32Sockets.delete(deviceId);
    console.log(`❌ ESP32 Disconnected: ${deviceId}`);
  });
});

// ✅ === UPGRADE HANDLER (Fixed: Only handle raw WS for device paths) ===
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;

  // Only handle raw WebSocket for device-specific routes like /SmartBoard_01
  // Skip root (/) and any Socket.IO internal paths
  if (pathname && pathname !== '/' && !pathname.startsWith('/socket.io')) {
    console.log('🔧 Raw WebSocket Upgrade:', pathname);
    rawWss.handleUpgrade(request, socket, head, (ws) => {
      rawWss.emit('connection', ws, request);
    });
    return;
  }

  // Let Socket.IO handle its own connections
  console.log('🚦 Letting Socket.IO handle upgrade:', pathname);
});

// === RELAY CONTROL – Send Command to ESP32 via Raw WebSocket ===
app.post('/api/appliances/:id/control', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action: use "on" or "off"' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

    const relay = appliance.relay;
    const state = action === 'on';

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

    // ✅ Send command via **raw WebSocket** to ESP32
    const ws = esp32Sockets.get(device.deviceId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'command',
        relay: relay,
        state: state,
        timestamp: new Date().toISOString()
      }));
      console.log(`⚡ Command sent to ESP32: Relay ${relay} → ${state ? 'ON' : 'OFF'}`);
    } else {
      console.warn(`⚠️ ESP32 ${device.deviceId} is offline`);
    }

    // Also notify mobile via Socket.IO
    const socketId = deviceSockets.get(device.deviceId);
    if (socketId) {
      io.to(socketId).emit('command', { relay, state });
    }

    res.json({ message: `Command sent to relay ${relay}`, delivered: !!ws });
  } catch (err) {
    console.error('Control failed:', err);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// === SCHEDULING
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

    // Get latest device
    const latestData = await SensorData.findOne({
      where: { applianceId: id },
      order: [['timestamp', 'DESC']],
      include: [{ model: Device, as: 'device' }]
    });

    const device = latestData?.device;
    if (!device) {
      return res.status(400).json({ error: 'No active device found' });
    }

    // ✅ Send schedule directly to ESP32
    const ws = esp32Sockets.get(device.deviceId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'schedule',
        relay: appliance.relay,
        onTime: onDate.getTime(),   // Unix timestamp in ms
        offTime: offDate.getTime()
      }));
      console.log(`✅ Schedule sent to ESP32: Relay ${appliance.relay}`);
    } else {
      console.warn(`⚠️ ESP32 ${device.deviceId} is offline`);
    }

    res.json({ message: 'Scheduled successfully' });
  } catch (err) {
    console.error('Schedule failed:', err);
    res.status(500).json({ error: 'Schedule failed' });
  }
});
// === GET SENSOR DATA HISTORY (All appliances or filtered) ===
app.get('/api/sensor-data/history', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const data = await SensorData.findAll({
      order: [['timestamp', 'DESC']],
      limit: limit * 10, // Get more data
      include: [{ model: Device, as: 'device' }]
    });

    // Group by minute (use ISO string without seconds)
    const grouped = {};
    data.forEach(row => {
      if (!row.timestamp || isNaN(new Date(row.timestamp).getTime())) return;

      const minute = new Date(row.timestamp).toISOString().slice(0, 16); // "2025-08-19T22:54"
      if (!grouped[minute]) {
        grouped[minute] = {
          timestamp: new Date(minute + ":00.000Z").toISOString(),
          energy: 0,
          power: 0,
          current: 0,
          count: 0
        };
      }
      grouped[minute].energy += row.energy || 0;
      grouped[minute].power += row.power || 0;
      grouped[minute].current += row.current || 0;
      grouped[minute].count++;
    });

    // Sort and limit
    const result = Object.values(grouped)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-limit);

    res.json(result);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
// === SENSOR DATA INGESTION (HTTP) ===
app.post('/api/sensor-data', async (req, res) => {
  // ✅ Handle both deviceId and device_id
  const { device_id, deviceId, ip, timestamp, relays } = req.body;
  const finalDeviceId = device_id || deviceId || 'SmartBoard_01'; // Fallback
  const finalIp = ip || 'Unknown';

  if (!finalDeviceId) {
    return res.status(400).json({ error: 'Missing device_id' });
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

      const expectedId = relayNumber;
      const defaultNames = { 1: 'Socket A', 2: 'Socket B', 3: 'Socket C', 4: 'Socket D' };
      const name = defaultNames[relayNumber] || `Relay ${relayNumber}`;

      let appliance = await Appliance.findOne({ where: { id: expectedId }, paranoid: false });
      if (!appliance) {
        appliance = await Appliance.create({
          id: expectedId,
          name,
          type: 'power',
          relay: relayNumber,
          status: 'off',
          manuallyAdded: false
        });
      } else if (appliance.deletedAt) {
        await appliance.restore();
      }

      if (appliance.name !== name) {
        await appliance.update({ name });
      }

      records.push({
  applianceId: appliance.id,
  current: r.current || 0,
  voltage: r.voltage || 230,
  power: r.power || 0,
  energy: r.energy_kwh || 0,
  cost: r.cost_ghs || 0,
  timestamp: date,
  device_id: finalDeviceId  // ✅ Use finalDeviceId and underscore
});
    }

    const validApplianceIds = (await Appliance.unscoped().findAll({
      where: { id: records.map(r => r.applianceId) },
      attributes: ['id'],
      raw: true
    })).map(a => a.id);

    const validRecords = records.filter(r => validApplianceIds.includes(r.applianceId));
    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid appliance IDs found' });
    }

 await Device.findOrCreate({
  where: { deviceId: finalDeviceId }, // ✅ Use finalDeviceId
  defaults: { ip: finalIp, lastSeen: new Date() }
});
await Device.update(
  { ip: finalIp, lastSeen: new Date() },
  { where: { deviceId: finalDeviceId } }
);
    // ✅ Save sensor data
await SensorData.bulkCreate(validRecords);

// ✅ Emit real-time update to all connected clients (React Native app)
console.log('✅ Emitting sensor-update:', validRecords);
io.emit('sensor-update', validRecords);

// ✅ Add this log (fixed)
console.log('✅ Emitted sensor-update to all clients:', validRecords.map(r => ({
  applianceId: r.applianceId,
  power: r.power,
  timestamp: r.timestamp
})));

// ✅ Send response
res.status(201).json({ message: 'Sensor data saved', count: validRecords.length });
  } catch (err) {
    console.error('❌ Sensor data save error:', err);
    res.status(500).json({ error: 'Failed to save sensor data' });
  }
});
// === GET LATEST SENSOR DATA ===
app.get('/api/sensor-data/latest', async (req, res) => {
  try {
    const latestPerAppliance = await SensorData.findAll({
      attributes: [
        'applianceId',
        [sequelize.fn('MAX', sequelize.col('timestamp')), 'maxTimestamp']
      ],
      group: ['applianceId'],
      raw: true
    });

    if (latestPerAppliance.length === 0) {
      return res.json([]);
    }

    const maxTimestamps = latestPerAppliance.map(r => r.maxTimestamp);
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
    res.json({ name: user.name, email: user.email, role: 'admin' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// === APPLIANCES ===
app.get('/api/appliances', async (req, res) => {
  const defaultNames = { 1: 'Socket A', 2: 'Socket B', 3: 'Socket C', 4: 'Socket D' };
  try {
    const dbAppliances = await Appliance.findAll({ where: { deletedAt: null } });
    const map = Object.fromEntries(dbAppliances.map(a => [a.relay, a]));

    const result = await Promise.all(Object.keys(defaultNames).map(async relayStr => {
      const relay = parseInt(relayStr);
      const existing = map[relay];
      const name = defaultNames[relay];

      if (existing) {
        if (existing.name !== name) await existing.update({ name });
        return existing.toJSON();
      } else {
        return {
          id: relay,
          name,
          relay,
          type: 'power',
          status: 'off',
          manuallyAdded: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    }));

    res.json(result);
  } catch (err) {
    console.error('Fetch appliances error:', err);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Block manual creation on relays 1–4
app.post('/api/appliances', async (req, res) => {
  const { name, type, relay } = req.body;
  if (!type || !relay) return res.status(400).json({ error: 'Type and relay required' });

  const r = parseInt(relay);
  if ([1, 2, 3, 4].includes(r)) {
    return res.status(400).json({ 
      error: 'Relays 1–4 are reserved for default sockets and cannot be added manually.' 
    });
  }

  try {
    const appliance = await Appliance.create({ name, type, relay: r, manuallyAdded: true });
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

// === Start Server ===
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Tables synchronized');

    // Ensure default device
    await Device.findOrCreate({
      where: { deviceId: 'SmartBoard_01' },
      defaults: { ip: '0.0.0.0', lastSeen: new Date() }
    });

    // Ensure default appliances
    const defaultNames = { 1: 'Socket A', 2: 'Socket B', 3: 'Socket C', 4: 'Socket D' };
    for (const [idStr, name] of Object.entries(defaultNames)) {
      const id = parseInt(idStr);
      await Appliance.findOrCreate({
        where: { id },
        defaults: { id, name, relay: id, type: 'power', status: 'off', manuallyAdded: false }
      });
    }

    const port = process.env.PORT || 10000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`💡 Raw WebSocket: wss://smart-el-mit1.onrender.com/SmartBoard_01 (ESP32)`);
      console.log(`📱 Socket.IO: https://smart-el-mit1.onrender.com (Mobile App)`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();