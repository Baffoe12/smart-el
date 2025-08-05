require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const sensorDataEndpoint = require('./sensorDataEndpoint'); // Make sure this file exists
const { sequelize, User, Appliance, SensorData } = require('./models');

const app = express();
const port = process.env.PORT || 3001;
const DEVICE_IP = '172.20.10.3'; // Update this IP as needed

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ✅ Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// ✅ Relay control
app.post('/api/relay-control', async (req, res) => {
  const { ip, relay, state } = req.body;
  if (!ip || !relay || !state) {
    return res.status(400).json({ error: 'ip, relay, and state required' });
  }
  try {
    const url = `http://${ip}/relay?relay=${relay}&state=${state}`;
    const response = await axios.get(url);
    res.json({ message: 'Relay command sent', data: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to control relay', details: error.message });
  }
});

sensorDataEndpoint(app); // attach custom sensor data logic if any

// ✅ Signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password required' });
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await User.create({ name, email, passwordHash });
  res.status(201).json({ message: 'User created', user: { id: newUser.id, name, email } });
});

// ✅ Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, name: user.name, email } });
});

// ✅ Appliances CRUD
app.get('/api/appliances', async (req, res) => {
  const appliances = await Appliance.findAll();
  res.json(appliances);
});

app.post('/api/appliances', async (req, res) => {
  const { type, relay } = req.body;
  if (!type) return res.status(400).json({ error: 'Appliance type required' });
  const appliance = await Appliance.create({ type, relay });
  res.status(201).json(appliance);
});

app.put('/api/appliances/:id', async (req, res) => {
  const appliance = await Appliance.findByPk(req.params.id);
  if (!appliance) return res.status(404).json({ error: 'Appliance not found' });
  await appliance.update(req.body);
  res.json(appliance);
});

app.delete('/api/appliances/:id', async (req, res) => {
  const appliance = await Appliance.findByPk(req.params.id);
  if (!appliance) return res.status(404).json({ error: 'Not found' });
  await appliance.destroy();
  res.status(204).send();
});

// ✅ Appliance schedule
app.post('/api/appliances/:id/schedule', async (req, res) => {
  const { onTime, offTime } = req.body;
  const appliance = await Appliance.findByPk(req.params.id);
  if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

  const ip = DEVICE_IP;

  // Schedule ON
  setTimeout(async () => {
    try {
      await axios.get(`http://${ip}/relay?relay=${appliance.relay}&state=1`);
    } catch (err) {
      console.error(`ON schedule failed:`, err.message);
    }
  }, new Date(onTime) - Date.now());

  // Schedule OFF
  setTimeout(async () => {
    try {
      await axios.get(`http://${ip}/relay?relay=${appliance.relay}&state=0`);
    } catch (err) {
      console.error(`OFF schedule failed:`, err.message);
    }
  }, new Date(offTime) - Date.now());

  await appliance.update({
    scheduled: true,
    scheduleOn: onTime,
    scheduleOff: offTime
  });

  res.json(appliance);
});

// Get appliance relay status
app.get('/api/appliances/:id/relay', async (req, res) => {
  const appliance = await Appliance.findByPk(req.params.id);
  if (!appliance) return res.status(404).json({ error: 'Appliance not found' });
  res.json({ relay: appliance.relay, isOn: appliance.isOn });
});

// ✅ Appliance relay update
app.put('/api/appliances/:id/relay', async (req, res) => {
  const { isOn } = req.body;
  if (typeof isOn !== 'boolean') return res.status(400).json({ error: 'Invalid isOn value' });

  const appliance = await Appliance.findByPk(req.params.id);
  if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

  await appliance.update({ isOn });
  res.json(appliance);
});

// ✅ Control appliance
app.post('/api/appliances/:id/control', async (req, res) => {
  const { action } = req.body;
  if (!['on', 'off'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  const appliance = await Appliance.findByPk(req.params.id);
  if (!appliance) return res.status(404).json({ error: 'Not found' });

  const url = `http://${DEVICE_IP}/relay?relay=${appliance.relay}&state=${action === 'on' ? 1 : 0}`;
  try {
    await axios.get(url);
    res.json({ message: `Appliance turned ${action}` });
  } catch (err) {
    res.status(500).json({ error: `Failed to control appliance: ${err.message}` });
  }
});

// ✅ Sensor data latest
app.get('/api/sensor-data/latest', async (req, res) => {
  res.json({
    energy: (Math.random() * 2 + 0.5).toFixed(3),
    timestamp: new Date().toISOString()
  });
});

// ✅ Anomaly logs
app.get('/api/anomalies', async (req, res) => {
  const anomalies = [
    { id: 1, applianceId: 1, timestamp: '2024-01-01T10:00:00Z', description: 'High usage' },
    { id: 2, applianceId: 2, timestamp: '2024-01-03T11:00:00Z', description: 'Spike detected' }
  ];
  res.json(anomalies);
});

// ✅ Thresholds
app.get('/api/thresholds', async (req, res) => {
  res.json({ power: 140 }); // Replace with DB config later
});

app.post('/api/thresholds', async (req, res) => {
  const { power } = req.body;
  if (typeof power !== 'number') return res.status(400).json({ error: 'Invalid value' });
  console.log(`Threshold set to ${power}`);
  res.json({ message: 'Threshold updated' });
});

// ✅ Export report (CSV)
app.get('/api/export-report', async (req, res) => {
  const data = 'timestamp,power,cost\n2024-01-01T00:00:00Z,100,5';
  res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
  res.setHeader('Content-Type', 'text/csv');
  res.send(data);
});

// ✅ Password recovery (simulated)
app.post('/api/password-recovery', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  console.log(`Reset token: ${token}`);
  res.json({ message: 'Password reset token sent (simulated)' });
});

// ✅ Password reset
app.post('/api/password-reset', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    const hash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash: hash });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ✅ 404 Handler (Must be last)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', details: `${req.method} ${req.path} does not exist` });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ✅ DB connection and server start
sequelize.authenticate()
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('DB connection failed:', err));

sequelize.sync();

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
