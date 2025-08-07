require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Set your ESP32/relay board IP here
const DEVICE_IP = '172.20.10.3'; // ← Change if needed

// Import all models and sequelize instance
const { sequelize, User, Appliance, SensorData } = require('./models');

const app = express();
const port = process.env.PORT || 3001;

// Track scheduled relay commands to allow cancellation
const scheduledCommands = {}; // { applianceId: { on: timeout, off: timeout } }

// Middleware to ensure JSON responses for errors
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Relay control API endpoint
app.post('/api/relay-control', async (req, res) => {
  const { ip, relay, state } = req.body;
  console.log(`Relay control request received: ip=${ip}, relay=${relay}, state=${state}`);
  if (!ip || !relay || !state) {
    return res.status(400).json({ error: 'IP, relay, and state are required' });
  }
  try {
    const url = `http://${ip}/relay?relay=${relay}&state=${state}`;
    console.log(`Sending relay control command to URL: ${url}`);
    const response = await axios.get(url);
    res.json({ message: 'Relay control command sent', response: response.data });
  } catch (error) {
    console.error('Error sending relay control command:', error.message);
    res.status(500).json({ error: 'Failed to send relay control command' });
  }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email and password are required',
        details: 'All fields must be provided'
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password too short',
        details: 'Password must be at least 6 characters long'
      });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already in use',
        details: 'An account with this email already exists'
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, passwordHash });
    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ 
      error: 'Failed to create user',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get all appliances (with applianceId fix)
app.get('/api/appliances', async (req, res) => {
  try {
    const appliances = await Appliance.findAll();
    res.json(
      appliances.map(appliance => ({
        ...appliance.toJSON(),
        applianceId: appliance.id
      }))
    );
  } catch (err) {
    console.error('Error fetching appliances:', err);
    res.status(500).json({ error: 'Failed to fetch appliances' });
  }
});

// Add new appliance
app.post('/api/appliances', async (req, res) => {
  const { type, relay } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'Appliance type is required' });
  }
  try {
    const newAppliance = await Appliance.create({ type, relay });
    res.status(201).json(newAppliance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add appliance' });
  }
});

// Control appliance on/off
app.post('/api/appliances/:id/control', async (req, res) => {
  const id = req.params.id;
  const { action } = req.body; // 'on' or 'off'
  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    const state = action === 'on' ? 1 : 0;
    const url = `http://${DEVICE_IP}/relay?relay=${appliance.relay}&state=${state}`;
    console.log(`Sending control command: ${url}`);
    await axios.get(url);

    res.json({ message: `Appliance turned ${action}` });
  } catch (error) {
    console.error('Control command error:', error);
    res.status(500).json({ error: 'Failed to send control command' });
  }
});

// Schedule appliance with relay control
app.post('/api/appliances/:id/schedule', async (req, res) => {
  try {
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

    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    // Cancel any existing schedule for this appliance
    if (scheduledCommands[id]) {
      if (scheduledCommands[id].on) {
        clearTimeout(scheduledCommands[id].on);
        console.log(`Cancelled pending ON command for appliance ${id}`);
      }
      if (scheduledCommands[id].off) {
        clearTimeout(scheduledCommands[id].off);
        console.log(`Cancelled pending OFF command for appliance ${id}`);
      }
      delete scheduledCommands[id];
    }

    // Update DB
    await appliance.update({
      scheduled: true,
      scheduleOn: onDate,
      scheduleOff: offDate
    });

    // Function to send relay command
    const sendRelayCommand = async (state) => {
      try {
        const url = `http://${DEVICE_IP}/relay?relay=${appliance.relay}&state=${state}`;
        console.log(`Sending relay command: ${url}`);
        await axios.get(url);
        console.log(`✅ Relay ${appliance.relay} turned ${state === 1 ? 'ON' : 'OFF'} for appliance ${id}`);
      } catch (error) {
        console.error(`❌ Failed to send relay ${state} command:`, error.message);
      }
    };

    // Schedule ON
    const delayOn = onDate - Date.now();
    let timeoutOn = null;
    if (delayOn > 0) {
      timeoutOn = setTimeout(async () => {
        await sendRelayCommand(1);
        if (scheduledCommands[id]) scheduledCommands[id].on = null;
      }, delayOn);
    } else {
      await sendRelayCommand(1); // Trigger immediately
    }

    // Schedule OFF
    const delayOff = offDate - Date.now();
    let timeoutOff = null;
    if (delayOff > 0) {
      timeoutOff = setTimeout(async () => {
        await sendRelayCommand(0);
        if (scheduledCommands[id]) scheduledCommands[id].off = null;
      }, delayOff);
    }

    // Store timeouts for cancellation
    scheduledCommands[id] = { on: timeoutOn, off: timeoutOff };

    res.json({
      message: 'Schedule updated and relay commands scheduled',
      appliance: {
        id: appliance.id,
        scheduled: appliance.scheduled,
        scheduleOn: appliance.scheduleOn,
        scheduleOff: appliance.scheduleOff
      }
    });

  } catch (error) {
    console.error('Schedule API Error:', error);
    res.status(500).json({ 
      error: 'Failed to update schedule', 
      details: error.message 
    });
  }
});

// Cancel appliance schedule
app.delete('/api/appliances/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;

    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    // Cancel any pending commands
    if (scheduledCommands[id]) {
      if (scheduledCommands[id].on) {
        clearTimeout(scheduledCommands[id].on);
        console.log(`Cancelled ON command for appliance ${id}`);
      }
      if (scheduledCommands[id].off) {
        clearTimeout(scheduledCommands[id].off);
        console.log(`Cancelled OFF command for appliance ${id}`);
      }
      delete scheduledCommands[id];
    }

    // Clear DB
    await appliance.update({
      scheduled: false,
      scheduleOn: null,
      scheduleOff: null
    });

    res.json({
      message: 'Schedule cancelled successfully',
      appliance: {
        id: appliance.id,
        scheduled: appliance.scheduled,
        scheduleOn: appliance.scheduleOn,
        scheduleOff: appliance.scheduleOff
      }
    });

  } catch (error) {
    console.error('Cancel schedule error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel schedule', 
      details: error.message 
    });
  }
});

// Receive sensor data from ESP32
app.post('/api/sensor-data', async (req, res) => {
  try {
    const { device_id, timestamp, relays, total } = req.body;
    if (!device_id || !Array.isArray(relays) || !total || !timestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Must include device_id, timestamp, relays[], and total' 
      });
    }

    for (const relay of relays) {
      await SensorData.create({
        deviceId: device_id,
        relayId: relay.id,
        current: relay.current,
        power: relay.power,
        energyKwh: relay.energy_kwh,
        costGhs: relay.cost_ghs,
        timestamp: new Date(timestamp)
      });
    }

    console.log(`✅ Sensor data saved from ${device_id}, ${relays.length} relays`);
    res.status(201).json({ message: 'Sensor data received successfully' });

  } catch (error) {
    console.error('Error saving sensor data:', error);
    res.status(500).json({ 
      error: 'Failed to save sensor data', 
      details: error.message 
    });
  }
});

// Get latest sensor data (mock for now)
app.get('/api/sensor-data/latest', async (req, res) => {
  try {
    res.json({
      energy: (Math.random() * 2 + 0.5).toFixed(3),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch latest sensor data' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Connect to PostgreSQL
sequelize.authenticate()
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Sync models
sequelize.sync();

// 404 handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    details: `The requested endpoint ${req.method} ${req.path} does not exist`
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${port}`);
});