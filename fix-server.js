const fs = require('fs');
const path = require('path');

// Read the original server.js
const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Create backup
fs.writeFileSync(serverPath + '.backup', serverContent);

// Add health endpoint before 404 handler
const healthEndpoint = `
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});
`;

// Enhanced appliances endpoints
const enhancedAppliancesEndpoints = `
// Get all appliances
app.get('/api/appliances', async (req, res) => {
  try {
    const appliances = await Appliance.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      data: appliances,
      count: appliances.length
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch appliances',
      details: err.message 
    });
  }
});

// Get specific appliance
app.get('/api/appliances/:id', async (req, res) => {
  try {
    const appliance = await Appliance.findByPk(req.params.id);
    if (!appliance) {
      return res.status(404).json({
        success: false,
        error: 'Appliance not found'
      });
    }
    res.json({
      success: true,
      data: appliance
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch appliance',
      details: err.message 
    });
  }
});

// Add new appliance
app.post('/api/appliances', async (req, res) => {
  try {
    const { type, relay, name, location } = req.body;
    if (!type) {
      return res.status(400).json({ 
        success: false,
        error: 'Appliance type is required' 
      });
    }
    const newAppliance = await Appliance.create({ 
      type, 
      relay, 
      name: name || type,
      location: location || 'Unknown'
    });
    res.status(201).json({
      success: true,
      data: newAppliance,
      message: 'Appliance created successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to add appliance',
      details: err.message 
    });
  }
});

// Update appliance status or data
app.put('/api/appliances/:id', async (req, res) => {
  try {
    const appliance = await Appliance.findByPk(req.params.id);
    if (!appliance) {
      return res.status(404).json({
        success: false,
        error: 'Appliance not found'
      });
    }
    await appliance.update(req.body);
    res.json({
      success: true,
      data: appliance,
      message: 'Appliance updated successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update appliance',
      details: err.message 
    });
  }
});

// Delete appliance
app.delete('/api/appliances/:id', async (req, res) => {
  try {
    const appliance = await Appliance.findByPk(req.params.id);
    if (!appliance) {
      return res.status(404).json({
        success: false,
        error: 'Appliance not found'
      });
    }
    await appliance.destroy();
    res.json({
      success: true,
      message: 'Appliance deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete appliance',
      details: err.message 
    });
  }
});

// Get appliance relay status
app.get('/api/appliances/:id/relay', async (req, res) => {
  try {
    const appliance = await Appliance.findByPk(req.params.id);
    if (!appliance) {
      return res.status(404).json({
        success: false,
        error: 'Appliance not found'
      });
    }
    res.json({
      success: true,
      data: {
        id: appliance.id,
        name: appliance.name,
        type: appliance.type,
        relay: appliance.relay,
        isOn: appliance.isOn
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch relay status',
      details: err.message 
    });
  }
});

// Update appliance relay status
app.put('/api/appliances/:id/relay', async (req, res) => {
  try {
    const { isOn, state } = req.body;
    const relayState = typeof isOn === 'boolean' ? isOn : state;
    
    if (typeof relayState !== 'boolean') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid relay state value. Expected boolean.' 
      });
    }
    
    const appliance = await Appliance.findByPk(req.params.id);
    if (!appliance) {
      return res.status(404).json({
        success: false,
        error: 'Appliance not found'
      });
    }
    
    await appliance.update({ isOn: relayState });
    res.json({
      success: true,
      data: appliance,
      message: \`Relay \${relayState ? 'turned on' : 'turned off'} successfully\`
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update appliance relay status',
      details: err.message 
    });
  }
});
`;

// Apply fixes
let fixedContent = serverContent;

// Add health endpoint before 404 handler
fixedContent = fixedContent.replace(
  '// 404 handler',
  healthEndpoint + '\n// 404 handler'
);

// Replace old appliances endpoints with enhanced ones
fixedContent = fixedContent.replace(
  /\/\/ Get all appliances[\s\S]*?\/\/ Delete appliance[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Failed to delete appliance' \}\);\s*\}\s*\});/g,
  enhancedAppliancesEndpoints
);

// Write the fixed server.js
fs.writeFileSync(serverPath, fixedContent);

console.log('✅ Server.js has been updated with missing endpoints!');
console.log('📋 Backup saved as server.js.backup');
console.log('🔧 Next steps:');
console.log('   1. Run: npx sequelize-cli db:migrate');
console.log('   2. Restart your server');
console.log('   3. Test with: node test-endpoints.js');
