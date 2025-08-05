// server.js
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// =======================
// Database (SQLite)
// =======================
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
});

const Appliance = sequelize.define('Appliance', {
  applianceId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  relay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 4 },
  },
  isOn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  scheduled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  scheduleOn: {
    type: DataTypes.DATE,
  },
  scheduleOff: {
    type: DataTypes.DATE,
  },
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
  },
  password: {
    type: DataTypes.STRING,
    defaultValue: 'demo123',
  },
});

// Sync DB
sequelize.sync({ force: false }).then(() => {
  console.log('✅ Database synced');

  // Seed default user
  User.findOrCreate({
    where: { email: 'user@example.com' },
    defaults: { name: 'Demo User', role: 'admin', password: 'demo123' },
  });

  // Seed default appliances
  Appliance.findOrCreate({
    where: { relay: 1 },
    defaults: { name: 'Lamp', isOn: false },
  });
  Appliance.findOrCreate({
    where: { relay: 2 },
    defaults: { name: 'Fan', isOn: true },
  });
});

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// =======================
// Auth Middleware
// =======================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// =======================
// Routes
// =======================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/user', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'name', 'email', 'role'],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all appliances
app.get('/api/appliances', authenticate, async (req, res) => {
  try {
    const appliances = await Appliance.findAll();
    res.json(appliances);
  } catch (error) {
    console.error('Error fetching appliances:', error);
    res.status(500).json({ error: 'Failed to fetch appliances' });
  }
});

// Toggle relay (on/off)
app.put('/api/appliances/:id/relay', authenticate, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'on' or 'off'

  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use "on" or "off"' });
  }

  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

    appliance.isOn = action === 'on';
    await appliance.save();

    console.log(`Relay ${appliance.relay} turned ${action} for ${appliance.name}`);
    res.json(appliance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update relay' });
  }
});

// Set schedule
app.post('/api/appliances/:id/schedule', authenticate, async (req, res) => {
  const { id } = req.params;
  const { onTime, offTime } = req.body;

  if (!onTime || !offTime) {
    return res.status(400).json({ error: 'onTime and offTime are required' });
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
    if (!appliance) return res.status(404).json({ error: 'Appliance not found' });

    appliance.scheduled = true;
    appliance.scheduleOn = onDate;
    appliance.scheduleOff = offDate;
    await appliance.save();

    console.log(`Scheduled: ${appliance.name} ON at ${onTime}, OFF at ${offTime}`);
    res.json(appliance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set schedule' });
  }
});

// Sensor data (mock)
app.get('/api/sensor-data', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = Array.from({ length: limit }, (_, i) => ({
    id: i + 1,
    energy: (Math.random() * 2 + 0.5).toFixed(3),
    timestamp: new Date(Date.now() - (limit - i) * 60000).toISOString(),
  }));
  res.json({ data });
});

app.get('/api/sensor-data/latest', async (req, res) => {
  res.json({
    energy: (Math.random() * 2 + 0.5).toFixed(3),
    timestamp: new Date().toISOString(),
  });
});

// =======================
// Static & 404
// =======================
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// =======================
// Start Server
// =======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔗 API: /api/health, /api/login, /api/appliances, /api/user`);
});