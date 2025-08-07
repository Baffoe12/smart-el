require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sensorDataEndpoint = require('./sensorDataEndpoint');
const axios = require('axios');

// Set your ESP32/relay board IP here
const DEVICE_IP = '172.20.10.3'; // ← Change to your actual device IP

// Import all models and sequelize instance
const { sequelize, User, Appliance, SensorData } = require('./models');

const app = express();
const port = process.env.PORT || 3001;

// Middleware to ensure JSON responses for errors
app.use((req, res, next) => {
  // Set JSON content type for all responses
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
    res.json({ message: 'Relay control command sent', data: response.data });
  } catch (error) {
    console.error('Error sending relay control command:', error.message);
    res.status(500).json({ error: 'Failed to send relay control command' });
  }
});

sensorDataEndpoint(app);

// Signup endpoint with improved error handling
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: 'Name, email and password are required',
        details: 'All fields must be provided'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }
    
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password too short',
        details: 'Password must be at least 6 characters long'
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Email already in use',
        details: 'An account with this email already exists'
      });
    }
    
    // Create new user
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, passwordHash });
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific database errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Email already in use',
        details: 'This email address is already registered'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create user',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Get current user info endpoint
app.get('/api/user', async (req, res) => {
  try {
    // For demo, return a static user or fetch from DB if authentication is implemented
    const user = await User.findOne({ where: { id: 1 } }); // Adjust as needed
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ name: user.name, email: user.email });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Login endpoint with improved error handling
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        details: 'Both email and password must be provided'
      });
    }
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      });
    }
    
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Failed to login',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Password recovery endpoint
app.post('/api/password-recovery', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Simulate sending password reset email with token
    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    console.log(`Password reset token for ${email}: ${resetToken}`);
    // In real app, send email with resetToken link
    res.json({ message: 'Password recovery email sent' });
  } catch (error) {
    console.error('Password recovery error:', error);
    res.status(500).json({ error: 'Failed to process password recovery' });
  }
});

// Password reset endpoint
app.post('/api/password-reset', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash });
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
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

// --- Place this BEFORE the 404 handler ---
// Get all appliances
// Ensure authentication middleware 'authenticate' is applied if needed by your frontend
app.get('/api/appliances', async (req, res) => {
  try {
    // Assuming you have an 'Appliance' model defined with Sequelize
    // When returning appliances, map id → applianceId
    const appliances = await Appliance.findAll();
    res.json(
      appliances.map(appliance => ({
        ...appliance.toJSON(),
        applianceId: appliance.id
      }))
    );
  } catch (err) {
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

// Update appliance status or data
app.put('/api/appliances/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    await appliance.update(req.body);
    res.json(appliance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appliance' });
  }
});

// Delete appliance
app.delete('/api/appliances/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    await appliance.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete appliance' });
  }
});

app.get('/api/sensor-data/latest', async (req, res) => {
  try {
    // Mock data for now, replace with actual database call
    // Ensure you have a model or logic to fetch the latest reading
    // Example mock response:
    res.json({
      energy: (Math.random() * 2 + 0.5).toFixed(3), // e.g., "1.234"
      timestamp: new Date().toISOString(),
      // Add other relevant fields if your frontend expects them
    });
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch latest sensor data' });
  }
});

// Schedule appliance endpoint - with relay control
app.post('/api/appliances/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { onTime, offTime } = req.body;

    // Validate input
    if (!onTime || !offTime) {
      return res.status(400).json({ 
        error: 'onTime and offTime are required' 
      });
    }

    const onDate = new Date(onTime);
    const offDate = new Date(offTime);
    if (isNaN(onDate.getTime()) || isNaN(offDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format' 
      });
    }
    if (offDate <= onDate) {
      return res.status(400).json({ 
        error: 'offTime must be after onTime' 
      });
    }

    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ 
        error: 'Appliance not found' 
      });
    }

    // Update schedule in DB
    await appliance.update({
      scheduled: true,
      scheduleOn: onDate,
      scheduleOff: offDate
    });

    // Calculate delays in milliseconds
    const delayOn = onDate - Date.now();
    const delayOff = offDate - Date.now();

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

    // Schedule ON command (only if in the future)
    if (delayOn > 0) {
      setTimeout(async () => {
        await sendRelayCommand(1); // Turn ON
      }, delayOn);
    } else {
      // If onTime is in the past, trigger immediately
      await sendRelayCommand(1);
    }

    // Schedule OFF command (only if in the future)
    if (delayOff > 0) {
      setTimeout(async () => {
        await sendRelayCommand(0); // Turn OFF
      }, delayOff);
    }

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
    // Find appliance
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ 
        error: 'Appliance not found' 
      });
    }

    // Update schedule
    await appliance.update({
      scheduled: true,
      scheduleOn: onDate,
      scheduleOff: offDate
    });

    res.json({ 
      message: 'Schedule updated successfully',
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

// Get appliance schedule
app.get('/api/appliances/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    res.json({
      scheduled: appliance.scheduled,
      scheduleOn: appliance.scheduleOn,
      scheduleOff: appliance.scheduleOff
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Power cut command endpoint
app.post('/api/appliances/:id/power-cut', async (req, res) => {
  const id = req.params.id;
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    // Simulate power cut action, e.g., update appliance status or send command to device
    // For now, just log and respond success
    console.log(`Power cut command received for appliance ID: ${id}`);
    res.json({ message: `Power cut command executed for appliance ID: ${id}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute power cut command' });
  }
});

// Get historical power and cost data for an appliance
app.get('/api/appliances/:id/history', async (req, res) => {
  const id = req.params.id;
  try {
    // Placeholder: fetch historical data from database or other source
    // Example response format: [{ timestamp: '2024-01-01T00:00:00Z', power: 100, cost: 5 }, ...]
    const history = [
      { timestamp: '2024-01-01T00:00:00Z', power: 100, cost: 5 },
      { timestamp: '2024-01-02T00:00:00Z', power: 110, cost: 5.5 },
      { timestamp: '2024-01-03T00:00:00Z', power: 90, cost: 4.5 },
    ];
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Control appliance on/off
app.post('/api/appliances/:id/control', async (req, res) => {
  const id = req.params.id;
  const { action } = req.body; // expected 'on' or 'off'
  if (!['on', 'off'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    // Simulate control action, e.g., send command to device or relay
    console.log(`Control command received for appliance ID: ${id}, action: ${action}`);
    // Here you can add code to send command to the relay hardware if applicable
    res.json({ message: `Appliance ${id} turned ${action}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to control appliance' });
  }
});

// Update appliance relay status
app.put('/api/appliances/:id/relay', async (req, res) => {
  const id = req.params.id;
  const { isOn } = req.body;
  if (typeof isOn !== 'boolean') {
    return res.status(400).json({ error: 'Invalid isOn value' });
  }
  try {
    const appliance = await Appliance.findByPk(id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    await appliance.update({ isOn });
    res.json(appliance);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appliance relay status' });
  }
});

// Get anomaly detection details and logs
app.get('/api/anomalies', async (req, res) => {
  try {
    // Placeholder: fetch anomaly logs from database or other source
    const anomalies = [
      { id: 1, applianceId: 1, timestamp: '2024-01-02T10:00:00Z', description: 'High power usage detected' },
      { id: 2, applianceId: 2, timestamp: '2024-01-03T14:30:00Z', description: 'Voltage spike detected' },
    ];
    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch anomaly data' });
  }
});

// Export reports (PDF/CSV)
app.get('/api/export-report', async (req, res) => {
  try {
    // Placeholder: generate report and send as file
    const reportData = 'Sample report data';
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(reportData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Get custom thresholds
app.get('/api/thresholds', async (req, res) => {
  try {
    // Placeholder: fetch thresholds from database or config
    const thresholds = { power: 140 };
    res.json(thresholds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch thresholds' });
  }
});

// Set custom thresholds
app.post('/api/thresholds', async (req, res) => {
  const { power } = req.body;
  if (typeof power !== 'number') {
    return res.status(400).json({ error: 'Invalid power threshold' });
  }
  try {
    // Placeholder: save thresholds to database or config
    console.log(`Custom power threshold set to ${power}`);
    res.json({ message: 'Threshold updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update thresholds' });
  }
});

// Receive sensor data from ESP32
app.post('/api/sensor-data', async (req, res) => {
  try {
    const { device_id, timestamp, relays, total } = req.body;

    // ✅ Validate required fields
    if (!device_id || !Array.isArray(relays) || !total || !timestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Must include device_id, timestamp, relays[], and total' 
      });
    }

    // ✅ Save each relay's sensor data
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


app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    details: `The requested endpoint ${req.method} ${req.path} does not exist`
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${port}`);
});
