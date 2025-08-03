require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sensorDataEndpoint = require('./sensorDataEndpoint');
const axios = require('axios');

// Import all models and sequelize instance
const { sequelize, User, Appliance, SensorData } = require('./models');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));

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

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email, passwordHash });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
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
    res.json({ name: user.name || 'Demo User', email: user.email });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
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

// Connect to PostgreSQL
sequelize.authenticate()
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Sync models
sequelize.sync();

// Get all appliances
app.get('/api/appliances', async (req, res) => {
  try {
    const appliances = await Appliance.findAll();
    res.json(appliances);
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

// Schedule appliance on/off times
app.post('/api/appliances/:id/schedule', async (req, res) => {
  const { onTime, offTime, ip } = req.body;
  const appliance = await Appliance.findByPk(req.params.id);

  if (!appliance) {
    return res.status(404).json({ error: 'Appliance not found' });
  }

  if (!onTime || !offTime || !ip) {
    return res.status(400).json({ error: 'onTime, offTime, and ip are required' });
  }

  // Schedule ON
  setTimeout(async () => {
    try {
      const url = `http://${ip}/relay?relay=${appliance.relay}&state=1`;
      console.log(`Sending relay ON command to URL: ${url}`);
      const response = await axios.get(url);
      console.log(`Relay ON command sent for appliance ${appliance.id}`);
    } catch (error) {
      console.error('Error sending relay ON command:', error.message);
    }
  }, new Date(onTime) - Date.now());

  // Schedule OFF
  setTimeout(async () => {
    try {
      const url = `http://${ip}/relay?relay=${appliance.relay}&state=0`;
      console.log(`Sending relay OFF command to URL: ${url}`);
      const response = await axios.get(url);
      console.log(`Relay OFF command sent for appliance ${appliance.id}`);
    } catch (error) {
      console.error('Error sending relay OFF command:', error.message);
    }
  }, new Date(offTime) - Date.now());

  appliance.scheduled = true;
  appliance.scheduleOn = onTime;
  appliance.scheduleOff = offTime;
  await appliance.save();

  res.json(appliance);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${port}`);
});
