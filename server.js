// Application Insights setup (with error handling)
let client = null;
try {
  const appInsights = require('applicationinsights');
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || 'InstrumentationKey=2105187e-4890-4f76-a832-2729c0ccc743;IngestionEndpoint=https://canadacentral-1.in.applicationinsights.azure.com/;LiveEndpoint=https://canadacentral.livediagnostics.monitor.azure.com/;ApplicationId=61d6f45d-dc58-49aa-87d0-6ae2a60547eb';

  appInsights.setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectExceptions(true)
    .start();

  client = appInsights.defaultClient;
  console.log('✅ Application Insights initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Application Insights:', error);
  console.log('Continuing without Application Insights...');
}

// Express setup
const express = require('express');
const path = require('path');
const app = express();

// Set the port from environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced middleware with better user detection
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Client exists: ${!!client}`);
  
  if (client) {
    try {
      // (Your Application Insights + user extraction logic here, unchanged)
    } catch (trackingError) {
      console.error('❌ Tracking error:', trackingError.message);
      console.error('Stack:', trackingError.stack);
    }
  } else {
    console.log('⚠️ Application Insights client not available');
  }
  
  next();
});

// Routes
app.get('/', (req, res) => {
  try {
    res.render('index', { 
      title: 'Welcome to the Accessibility Web App',
      message: 'Your Node.js app is running successfully on Azure App Service'
    });
  } catch (error) {
    console.error('Error rendering index:', error);
    res.status(500).send('Error rendering page');
  }
});

app.get('/about', (req, res) => {
  try {
    res.render('about', { 
      title: 'About',
      description: 'This is a sample Node.js application deployed on Azure App Service'
    });
  } catch (error) {
    console.error('Error rendering about:', error);
    res.status(500).send('Error rendering page');
  }
});

app.get('/api/status', (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      appInsights: !!client
    });
  } catch (error) {
    console.error('Error in status API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accessibility test route (FIXED for Azure)
const pa11y = require('pa11y');
const puppeteer = require('puppeteer');

app.post('/test', async (req, res) => {
  const url = req.body.url;

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = await pa11y(url, {
      standard: 'WCAG2AA',
      includeNotices: true,
      includeWarnings: true,
      wait: 1000,
      browser
    });

    await browser.close();

    res.render('report', {
      title: 'Toegankelijkheidsrapport',
      url,
      issues: results.issues
    });
  } catch (error) {
    console.error('Fout bij uitvoeren van pa11y:', error);
    res.status(500).send('Er ging iets mis bij het uitvoeren van de toegankelijkheidstest.');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('=== ERROR DETAILS ===');
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  console.error('=====================');
  
  res.status(500).send('Internal Server Error - Check logs for details');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Application Insights: ${client ? 'Enabled' : 'Disabled'}`);
});
